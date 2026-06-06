/**
 * TASK 15 — Customer lifecycle (7 phases) + VIP tier auto-upgrade.
 * All Supabase writes are best-effort; callers may continue on demo/offline flows.
 */
import { supabase } from './supabase';
import { dispatchRetargetingNotification, dispatchTransactionNotification } from './notifications';
import { assertBookingAllowed } from './bookingDuplicate';
import { insertPlatformBookingRow } from './platformBookings';
import { buildSettlementForTour, syncSettlementToGoogleSheets, SettlementSyncPayload } from './googleSync';
import { syncBookingPaymentToSheet, syncSlotIncrementToSheet } from './gsheetSync';

/**
 * error เฉพาะกรณี "วันนี้มีคนจองแล้ว" (ชน UNIQUE constraint บน trip_date).
 * ใช้ให้ UI แยกแยะจาก error อื่น ๆ เพื่อแสดงข้อความไทยและรีเฟรช availability.
 */
export class DateFullyBookedError extends Error {
  constructor(message = 'ขออภัย วันนี้มีคนจองแล้ว') {
    super(message);
    this.name = 'DateFullyBookedError';
  }
}

/**
 * error เฉพาะกรณี "ที่นั่งเต็ม" (slots_booked = slots_max) — เด้งมาจากฟังก์ชัน
 * atomic claim_seat_and_book ('TRIP_FULL'). ใช้ให้ UI แสดง "เต็มแล้ว / Fully booked".
 */
export class TripFullError extends Error {
  constructor(message = 'เต็มแล้ว / Fully booked') {
    super(message);
    this.name = 'TripFullError';
  }
}

/**
 * error เฉพาะกรณี "ยังไม่เปิดจอง" — ทริปยังไม่กำหนดวันออกเดินทาง (departure_start
 * เป็น NULL) หรือไม่พบทริปใน DB. เด้งมาจาก claim_seat_and_book ('TRIP_NOT_OPEN').
 * ใช้ให้ UI แสดง "ยังไม่เปิดจอง / Not open for booking".
 */
export class TripNotOpenError extends Error {
  constructor(message = 'ยังไม่เปิดจอง / Not open for booking') {
    super(message);
    this.name = 'TripNotOpenError';
  }
}

/** สถานะที่นั่ง/วันเดินทางของทริป (อ่านสด ๆ จาก DB เป็น source of truth). */
export type TripAvailability = {
  /** จองไปแล้วกี่ที่ (จำนวน booking) */
  slotsBooked: number | null;
  /** ความจุสูงสุด (NULL = ยังไม่กำหนด) */
  slotsMax: number | null;
  /** เหลือกี่ที่นั่ง (slots_max − slots_booked); null ถ้าไม่ทราบ */
  seatsLeft: number | null;
  /** วันออกเดินทางจริง (YYYY-MM-DD) หรือ null ถ้ายังไม่กำหนด */
  departureStart: string | null;
  departureEnd: string | null;
  /** เปิดจองได้ไหม = มี departure_start และยังเหลือที่นั่ง */
  isOpen: boolean;
};

/**
 * อ่านสถานะที่นั่ง + วันเดินทางสด ๆ จากตาราง tours (คีย์ด้วย trip_code).
 * เป็น "source of truth" สำหรับการแสดงผลและด่านจอง. คืน null ถ้าหาไม่เจอ/คอลัมน์
 * ยังไม่ถูกสร้าง (ยังไม่ได้รัน migration 16) เพื่อให้ฝั่งหน้าเว็บ fall back ไป
 * ใช้ค่าจาก sheet/tours.ts ได้ (ไม่บล็อกผู้ใช้ก่อนรัน SQL).
 */
export async function fetchTripAvailability(tourCode: string): Promise<TripAvailability | null> {
  if (!tourCode) return null;
  const code = tourCode.trim().toUpperCase();
  const tenantId = await resolveDefaultTenantId();
  let q = supabase
    .from('tours')
    .select('slots_booked, slots_max, departure_start, departure_end')
    .eq('trip_code', code)
    .limit(1);
  if (tenantId) q = q.eq('tenant_id', tenantId);
  const { data, error } = await q.maybeSingle();
  if (error || !data) {
    // คอลัมน์ยังไม่ถูกสร้าง หรือไม่พบทริป — ปล่อยให้ caller fall back
    if (error) console.info('[Booking] availability lookup skipped:', error.message);
    return null;
  }
  const slotsBooked = (data.slots_booked as number | null) ?? null;
  const slotsMax = (data.slots_max as number | null) ?? null;
  const seatsLeft =
    slotsMax != null && slotsBooked != null ? Math.max(0, slotsMax - slotsBooked) : null;
  const departureStart = (data.departure_start as string | null) || null;
  const departureEnd = (data.departure_end as string | null) || null;
  const isOpen = Boolean(departureStart) && (seatsLeft == null || seatsLeft > 0);
  return { slotsBooked, slotsMax, seatsLeft, departureStart, departureEnd, isOpen };
}

/**
 * พนักงาน (Co-Host) ปรับจำนวนที่นั่งของทริปแบบ ATOMIC ผ่าน RPC staff_adjust_seat.
 *   delta = +1 → รับ walk-in ทันที (ห้ามเกิน slots_max → โยน TripFullError)
 *   delta = -1 → คืนที่นั่ง (ไม่ต่ำกว่า 0)
 * ใช้ slots_booked คอลัมน์เดียวกับ claim_seat_and_book (ฝั่งลูกค้าออนไลน์) จึงรวมกัน
 * ไม่มีทางเกิน slots_max. คืนค่า slots_booked ใหม่หลังปรับ.
 */
function parseSeatRpcError(error: { message?: string } | null): never {
  const msg = error?.message || '';
  if (msg.includes('TRIP_FULL')) throw new TripFullError();
  if (msg.includes('TRIP_NOT_OPEN')) throw new TripNotOpenError();
  throw new Error(msg || 'seat adjust failed');
}

/** Co-Host walk-in: atomic slots_booked +/- via Supabase (staff_adjust_seat RPC). */
export async function staffAdjustSeat(tourCode: string, delta: number): Promise<number> {
  const code = tourCode.trim().toUpperCase();
  if (!code || delta === 0) throw new Error('Invalid trip code or delta');

  const tenantId = await resolveBookingTenantId(code);
  const { data, error } = await supabase.rpc('staff_adjust_seat', {
    p_tenant_id: tenantId,
    p_tour_code: code,
    p_delta: delta,
  });
  if (error) parseSeatRpcError(error);
  return (data as number) ?? 0;
}

/** Supabase increment_slot — same seat pool as staff_adjust_seat (p_by may be -1). */
export async function incrementSlot(tourCode: string, by = 1): Promise<number> {
  const code = tourCode.trim().toUpperCase();
  if (!code) throw new Error('tour_code required');

  const { data, error } = await supabase.rpc('increment_slot', {
    p_tour_code: code,
    p_by: by,
  });
  if (!error) return (data as number) ?? 0;

  // Fallback when increment_slot not deployed yet (older DB).
  if (error.message?.includes('increment_slot') || error.code === 'PGRST202') {
    return staffAdjustSeat(code, by);
  }
  parseSeatRpcError(error);
}

/**
 * ตรวจว่าวันเดินทาง (YYYY-MM-DD) ยังว่างหรือไม่ (กฎ "หนึ่งทริปต่อหนึ่งวัน").
 * คืน true = ว่าง (จองได้), false = เต็มแล้ว.
 * ถ้า query ผิดพลาด จะคืน true เพื่อไม่บล็อกผู้ใช้ (fail-open) — ตัว DB
 * UNIQUE constraint จะเป็นด่านสุดท้ายกันการจองซ้ำอยู่แล้ว.
 */
export async function isTripDateAvailable(tripDate: string): Promise<boolean> {
  if (!tripDate) return false;
  const tenantId = await resolveDefaultTenantId();
  let q = supabase
    .from('tour_bookings')
    .select('id')
    .eq('trip_date', tripDate)
    .neq('status', 'CANCELLED')
    .limit(1);
  if (tenantId) q = q.eq('tenant_id', tenantId);
  const { data, error } = await q;
  if (error) {
    // เช่น คอลัมน์ trip_date ยังไม่ถูกสร้าง — อย่าบล็อกผู้ใช้
    console.info('[Booking] availability check skipped:', error.message);
    return true;
  }
  return (data?.length ?? 0) === 0;
}
import type { Expense, Tour } from '../types/tour';
import type { TourBooking } from './supabaseData';

export const CUSTOMER_LIFECYCLE_PHASES = [
  'discover',
  'book',
  'prepare',
  'on_trip',
  'post_trip',
  'receive',
  'review',
] as const;

export type CustomerLifecyclePhase = (typeof CUSTOMER_LIFECYCLE_PHASES)[number];

/** Six checkbox agreements (c1–c6) map to three waiver_type rows: core, transport, portfolio. */
export const WAIVER_CHECKBOX_COUNT = 6;
export const WAIVER_DB_ROW_COUNT = 3;

export type VipTier = 'standard' | 'silver' | 'gold' | 'platinum';

export const ALBUM_SIGNED_URL_DAYS = 60;

export const PHASE_OPERATIONS: Record<
  CustomerLifecyclePhase,
  { summary: string; operations: string[]; routes?: string[] }
> = {
  discover: {
    summary: 'Browse trips',
    operations: ['SELECT tours'],
    routes: ['/', '/tours/:tourId'],
  },
  book: {
    summary: 'Reserve a trip',
    operations: ['INSERT tour_bookings', 'UPSERT crm_clients', 'SMS confirm (send-trip-receipt)'],
    routes: ['/book/:tourId'],
  },
  prepare: {
    summary: 'Pre-trip compliance',
    operations: [
      'INSERT client_waivers (6 agreements → 3 waiver_type rows)',
      'UPDATE crm_clients',
      'INSERT safety_briefings',
    ],
    routes: ['/trip/:bookingRef'],
  },
  on_trip: {
    summary: 'Payments & ATO expenses on active trip',
    operations: ['UPDATE tour_bookings (payments)', 'INSERT expenses', 'UPDATE safety_briefings'],
    routes: ['/portal'],
  },
  post_trip: {
    summary: 'Settlement & Google Sheets',
    operations: ['Storage upload (tour-photos)', 'INSERT net_settlements', 'INSERT sheets_sync_log'],
    routes: ['/portal'],
  },
  receive: {
    summary: 'Album delivery',
    operations: [`Signed URL (${ALBUM_SIGNED_URL_DAYS}d)`, 'UPDATE album_delivered_at'],
    routes: ['/album/:tourId'],
  },
  review: {
    summary: 'Loyalty & retargeting',
    operations: ['UPDATE vip_tier', 'UPDATE lifetime_value', 'retargeting SMS'],
  },
};

export function resolveVipTier(totalTrips: number): VipTier {
  if (totalTrips >= 10) return 'platinum';
  if (totalTrips >= 5) return 'gold';
  if (totalTrips >= 3) return 'silver';
  return 'standard';
}

let cachedTenantId: string | null = null;

/** Tenant for booking RPC — fall back to the tour row when tenants lookup is empty. */
async function resolveBookingTenantId(tripCode: string): Promise<string | null> {
  const fromTenants = await resolveDefaultTenantId();
  if (fromTenants) return fromTenants;

  const code = tripCode.trim().toUpperCase();
  if (!code) return null;

  const { data, error } = await supabase
    .from('tours')
    .select('tenant_id')
    .eq('trip_code', code)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[Trip2Talk] resolveBookingTenantId failed:', error.message);
    return null;
  }
  return (data?.tenant_id as string | undefined) ?? null;
}

async function resolveTourIdByCode(tripCode: string, tenantId: string | null): Promise<string | null> {
  const code = tripCode.trim().toUpperCase();
  let q = supabase.from('tours').select('id').eq('trip_code', code).limit(1);
  if (tenantId) q = q.eq('tenant_id', tenantId);
  const { data, error } = await q.maybeSingle();
  if (error) {
    console.warn('[Trip2Talk] resolveTourIdByCode failed:', error.message);
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}

function isRpcMissingError(err: { code?: string; message?: string }): boolean {
  const msg = err.message || '';
  return (
    err.code === 'PGRST202' ||
    msg.includes('Could not find the function') ||
    msg.includes('claim_seat_and_book') ||
    msg.includes('function public.claim_seat_and_book')
  );
}

/** Direct insert when claim_seat_and_book RPC is unavailable (legacy DB only). */
async function insertTourBookingDirect(input: {
  tenantId: string | null;
  tripCode: string;
  clientId?: string;
  depositAud: number;
  referenceNumber: string;
  partyPax: number;
  tripSizeTier?: string;
  pickup?: string;
  departureDate?: string;
}): Promise<string | null> {
  const tripCode = input.tripCode.trim().toUpperCase();
  const tenantId = input.tenantId ?? (await resolveBookingTenantId(tripCode));
  const tourId = await resolveTourIdByCode(tripCode, tenantId);
  if (!tourId) {
    console.error('[Trip2Talk] insertTourBookingDirect: tour not found for', tripCode);
    return null;
  }

  const row: Record<string, unknown> = {
    tour_id: tourId,
    client_id: input.clientId ?? null,
    amount_paid_aud: input.depositAud,
    status: 'PENDING',
    payment_method: 'PAYID',
    reference_number: input.referenceNumber,
    party_pax: input.partyPax,
    trip_size_tier: input.tripSizeTier ?? null,
    preferred_pickup: input.pickup ?? null,
    journey_phase: 'book',
    trip_date: input.departureDate ?? null,
  };
  if (tenantId) row.tenant_id = tenantId;

  console.log('[Trip2Talk] tour_bookings direct insert', { tripCode, tourId });
  const { data, error } = await supabase.from('tour_bookings').insert(row).select('id').single();
  if (error) {
    console.error('[Trip2Talk] tour_bookings direct insert failed:', error.message);
    throw error;
  }

  // Legacy path: increment seats atomically via staff_adjust_seat when claim RPC missing.
  try {
    const seats = Math.max(1, input.partyPax || 1);
    await incrementSlot(tripCode, seats);
  } catch (seatErr) {
    console.warn('[Trip2Talk] direct booking seat increment failed:', seatErr);
  }

  return (data?.id as string | undefined) ?? null;
}

export async function resolveDefaultTenantId(): Promise<string | null> {
  if (cachedTenantId) return cachedTenantId;
  const { data, error } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
  if (error) {
    console.warn('[Trip2Talk] tenants lookup failed:', error.message);
    return null;
  }
  cachedTenantId = data?.id ?? null;
  return cachedTenantId;
}

export function splitFullName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: 'Guest', last: 'Client' };
  if (parts.length === 1) return { first: parts[0], last: 'Client' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

/** Phase 2 — Book: CRM + booking + SMS receipt. */
export async function runPhase2Book(input: {
  tourId: string;
  tripCode: string;
  fullName: string;
  phone: string;
  email: string;
  depositAud: number;
  referenceNumber: string;
  partyPax: number;
  tripSizeTier?: string;
  pickup?: string;
  /** วันเดินทางที่ลูกค้าเลือก (YYYY-MM-DD) — ใช้เป็น departure_date ในชีต */
  departureDate?: string;
  sendSms?: boolean;
  tourName?: string;
  photoConsent?: boolean;
  emergencyName?: string;
  emergencyPhone?: string;
  medicalNotes?: string;
  termsAcceptedAt?: string;
  waiverData?: Record<string, unknown>;
}): Promise<{ clientId?: string; bookingId?: string; warnings: string[] }> {
  const warnings: string[] = [];
  const tripCode = input.tripCode.trim().toUpperCase();
  await assertBookingAllowed(input.email, tripCode);
  const tenantId = await resolveBookingTenantId(tripCode);
  const { first, last } = splitFullName(input.fullName);
  const passportPlaceholder = `WEB-${input.referenceNumber.replace(/[^A-Z0-9]/gi, '')}`;

  let clientId: string | undefined;

  if (tenantId) {
    let existingClient: { id: string } | null = null;
    const byEmail = await supabase
      .from('crm_clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', input.email)
      .maybeSingle();
    if (byEmail.data?.id) existingClient = byEmail.data;
    else if (input.phone) {
      const byPhone = await supabase
        .from('crm_clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('phone', input.phone)
        .maybeSingle();
      if (byPhone.data?.id) existingClient = byPhone.data;
    }

    if (existingClient?.id) {
      clientId = existingClient.id;
      const { error: updateErr } = await supabase
        .from('crm_clients')
        .update({
          first_name_en: first,
          last_name_en: last,
          first_name_th: first,
          last_name_th: last,
          email: input.email,
          phone: input.phone,
        })
        .eq('id', clientId);
      if (updateErr) warnings.push(updateErr.message);
    } else {
      const newId = crypto.randomUUID();
      const { error: insertClientErr } = await supabase.from('crm_clients').insert({
        id: newId,
        tenant_id: tenantId,
        first_name_th: first,
        last_name_th: last,
        first_name_en: first,
        last_name_en: last,
        passport_number: passportPlaceholder,
        email: input.email,
        phone: input.phone,
        medical_conditions: '',
        dietary_requirements: '',
        oshc_provider: '',
        oshc_policy_number: '',
        oshc_expiry: '2099-12-31',
      });
      if (insertClientErr) warnings.push(insertClientErr.message);
      else clientId = newId;
    }
  } else {
    warnings.push('No tenant_id — CRM skipped');
  }

  // จองที่นั่ง + สร้างแถว booking แบบ ATOMIC ผ่าน RPC claim_seat_and_book.
  // ฟังก์ชันนี้ทำทั้งสองด่านในฐานข้อมูล (server-side) จึง bypass ผ่าน UI ไม่ได้:
  //   ด่าน 1 (DATE GATE) : ทริปต้องมี departure_start → ไม่งั้น 'TRIP_NOT_OPEN'
  //   ด่าน 2 (SEAT GATE) : เพิ่ม slots_booked แบบ atomic → ถ้าเต็มได้ 'TRIP_FULL'
  // tour_id ที่ถูกต้องถูก resolve จาก trip_code ภายใน DB (กัน FK ผิดของ flow เดิม).
  console.log('[Trip2Talk] claim_seat_and_book RPC called', {
    tripCode,
    tenantId,
    departureDate: input.departureDate,
  });
  const { data: rpcBookingId, error: bookingErr } = await supabase.rpc('claim_seat_and_book', {
    p_tenant_id: tenantId,
    p_tour_code: tripCode,
    p_client_id: clientId ?? null,
    p_amount_paid_aud: input.depositAud,
    p_reference_number: input.referenceNumber,
    p_party_pax: input.partyPax,
    p_trip_size_tier: input.tripSizeTier ?? null,
    p_pickup: input.pickup ?? null,
    p_payment_method: 'PAYID',
    // วันเดินทางที่ลูกค้าเลือก — ใช้บังคับกฎ "หนึ่งทริปต่อหนึ่งวัน" (UNIQUE) เหมือนเดิม
    p_trip_date: input.departureDate ?? null,
  });

  let bookingRow: { id: string } | null = rpcBookingId ? { id: rpcBookingId as string } : null;

  if (bookingErr) {
    const code = (bookingErr as { code?: string }).code;
    const msg = bookingErr.message || '';
    // 23505 = unique_violation → มีคนจองวันนี้ไปแล้ว (กฎหนึ่งทริปต่อวัน).
    if (code === '23505') {
      throw new DateFullyBookedError();
    }
    // ด่านที่นั่ง: เต็มแล้ว (slots_booked = slots_max).
    if (msg.includes('TRIP_FULL')) {
      throw new TripFullError();
    }
    // RPC ยังไม่ deploy — insert ตรง + increment_slot (ไม่ bypass TRIP_NOT_OPEN).
    if (isRpcMissingError(bookingErr)) {
      console.warn('[Trip2Talk] RPC fallback → direct tour_bookings insert:', msg);
      try {
        const directId = await insertTourBookingDirect({
          tenantId,
          tripCode,
          clientId,
          depositAud: input.depositAud,
          referenceNumber: input.referenceNumber,
          partyPax: input.partyPax,
          tripSizeTier: input.tripSizeTier,
          pickup: input.pickup,
          departureDate: input.departureDate,
        });
        if (directId) {
          bookingRow = { id: directId };
          warnings.push('claim_seat_and_book unavailable — booking saved via direct insert');
        }
      } catch (directErr) {
        const directCode = (directErr as { code?: string }).code;
        if (directCode === '23505') throw new DateFullyBookedError();
        throw directErr instanceof Error ? directErr : new Error(String(directErr));
      }
    }
    if (!bookingRow?.id) {
      if (msg.includes('TRIP_NOT_OPEN')) throw new TripNotOpenError();
      throw new Error(msg || 'claim_seat_and_book failed');
    }
  }

  if (!bookingRow?.id) {
    throw new Error('Booking was not created — no booking id returned from database');
  }

  if (bookingRow?.id) {
    const platformId = await insertPlatformBookingRow({
      externalId: input.referenceNumber,
      tripCode,
      guestName: input.fullName,
      guestEmail: input.email,
      guests: input.partyPax || 1,
      tripName: input.tourName ?? tripCode,
      departureDate: input.departureDate,
      totalAmount: input.depositAud,
      photoConsent: input.photoConsent,
      emergencyName: input.emergencyName,
      emergencyPhone: input.emergencyPhone,
      medicalNotes: input.medicalNotes,
      termsAcceptedAt: input.termsAcceptedAt,
      waiverData: input.waiverData,
    });
    if (!platformId) {
      warnings.push('bookings mirror row skipped (table missing or RLS)');
    }

    // เส้นทางเดียว (ใช้งานได้จริง): POST ตรงไปยัง GAS Web App → append หนึ่งแถว
    // ลงแท็บ Tax_Year_2025_2026_Settlements. (ลบเส้นทางเดิมที่ผ่าน Edge Function
    // 'appendBookingRow' ออก เพราะ GAS ไม่รู้จัก action นั้น — ล้มเหลวเสมอ และ
    // ถ้าเรียกทั้งสองทางจะได้แถวซ้ำ.)
    // await เพื่อให้ log เรียงลำดับ แต่ syncBookingToSheet จะ catch ภายในเสมอ
    // (ไม่ throw) — sync ที่ fail จะไม่ทำให้การจองพัง เพราะ Supabase บันทึกไปแล้ว.
    const sheetSync = await syncBookingPaymentToSheet({
      tour_code: tripCode,
      booking_id: bookingRow.id,
      client_name: input.fullName,
      pax: input.partyPax ?? 1,
      total_paid: input.depositAud,
      payment_method: 'PAYID',
      payment_date: input.departureDate || new Date().toISOString().slice(0, 10),
    });
    if (!sheetSync.success) {
      warnings.push(`GSheet sync: ${sheetSync.error ?? 'failed'}`);
    }

    // อัปเดต "Slots Booked" ในแท็บ 'Trip info' (กระจกเงาให้เจ้าของเห็น) — non-blocking.
    // Supabase คือ source of truth ของที่นั่ง (slots_booked อัปเดต atomic ไปแล้ว);
    // ชีตเป็นเพียง mirror, ความล้มเหลวตรงนี้ไม่ทำให้การจองพัง.
    const slotSync = await syncSlotIncrementToSheet(tripCode, 1);
    if (!slotSync.success) {
      warnings.push(`GSheet slot sync: ${slotSync.error ?? 'failed'}`);
    }
  }

  if (input.sendSms !== false) {
    void dispatchTransactionNotification({
      client_name: input.fullName,
      client_email: input.email,
      client_phone: input.phone,
      trip_code: tripCode,
      amount_aud: input.depositAud,
      reference_number: input.referenceNumber,
      payment_method: 'PAYID',
      booking_status: 'PENDING',
    });
  }

  return { clientId, bookingId: bookingRow?.id, warnings };
}

/** Phase 3 — Prepare: CRM profile + safety briefings (waivers saved separately). */
export async function runPhase3Prepare(input: {
  clientId: string;
  tourId: string;
  fullName: string;
  phone: string;
  email: string;
  health?: string;
  oshcMembership?: string;
  safetyAcknowledged?: { home: boolean; weather: boolean };
}): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];
  const tenantId = await resolveDefaultTenantId();
  const { first, last } = splitFullName(input.fullName);

  const { error: crmErr } = await supabase
    .from('crm_clients')
    .update({
      first_name_en: first,
      last_name_en: last,
      first_name_th: first,
      last_name_th: last,
      phone: input.phone,
      email: input.email,
      medical_conditions: input.health ?? '',
      oshc_policy_number: input.oshcMembership ?? '',
      journey_phase: 'prepare',
    })
    .eq('id', input.clientId);

  if (crmErr) warnings.push(crmErr.message);

  if (tenantId && input.safetyAcknowledged) {
    const acks: Array<'home' | 'weather'> = [];
    if (input.safetyAcknowledged.home) acks.push('home');
    if (input.safetyAcknowledged.weather) acks.push('weather');

    for (const kind of acks) {
      const { error } = await supabase.from('safety_briefings').insert({
        tenant_id: tenantId,
        tour_id: input.tourId,
        client_id: input.clientId,
        briefing_version: `client-${kind}-v1`,
      });
      if (error) warnings.push(error.message);
    }
  }

  await supabase
    .from('tour_bookings')
    .update({ journey_phase: 'prepare' })
    .eq('client_id', input.clientId)
    .eq('tour_id', input.tourId);

  return { warnings };
}

/** Phase 4 — On trip: ATO expense only (owner terminal). */
export async function runPhase4InsertExpense(
  tourId: string,
  expense: Pick<Expense, 'amount_aud' | 'has_gst' | 'ato_category' | 'vendor_name' | 'receipt_filename'>
): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];
  const tenantId = await resolveDefaultTenantId();
  if (!tenantId) {
    warnings.push('No tenant_id — expense skipped');
    return { warnings };
  }

  const { error } = await supabase.from('expenses').insert({
    tenant_id: tenantId,
    tour_id: tourId,
    amount_aud: expense.amount_aud,
    has_gst: expense.has_gst,
    ato_category: expense.ato_category,
    vendor_name: expense.vendor_name,
    receipt_filename: expense.receipt_filename,
  });
  if (error) warnings.push(error.message);
  return { warnings };
}

/** Phase 4 — On trip: payment update + optional expense row. */
export async function runPhase4OnTrip(input: {
  tourId: string;
  clientId: string;
  amountAud: number;
  paymentMethod: string;
  bookingStatus: string;
  referenceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  tripCode: string;
  partyPax?: number;
  expense?: Omit<Expense, 'id' | 'created_at' | 'is_synced' | 'gst_amount_aud'> & {
    gst_amount_aud?: number;
  };
}): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];
  const tenantId = await resolveDefaultTenantId();

  const { data: existing } = await supabase
    .from('tour_bookings')
    .select('id, amount_paid_aud')
    .eq('tour_id', input.tourId)
    .eq('client_id', input.clientId)
    .maybeSingle();

  const newPaid = (existing?.amount_paid_aud ?? 0) + input.amountAud;
  const status =
    input.bookingStatus === 'FULLY_PAID' || input.bookingStatus === 'DEPOSIT_PAID'
      ? input.bookingStatus
      : newPaid > 0
        ? 'DEPOSIT_PAID'
        : 'PENDING';

  let bookingId = existing?.id ?? null;
  let bookingDbOk = true;

  if (existing?.id) {
    const { error } = await supabase
      .from('tour_bookings')
      .update({
        amount_paid_aud: newPaid,
        status,
        payment_method: input.paymentMethod,
        journey_phase: 'on_trip',
      })
      .eq('id', existing.id);
    if (error) {
      bookingDbOk = false;
      warnings.push(error.message);
    }
  } else {
    const row: Record<string, unknown> = {
      tour_id: input.tourId,
      client_id: input.clientId,
      amount_paid_aud: input.amountAud,
      status,
      payment_method: input.paymentMethod,
      reference_number: input.referenceNumber,
      journey_phase: 'on_trip',
      party_pax: input.partyPax ?? 1,
    };
    if (tenantId) row.tenant_id = tenantId;
    const { data: inserted, error } = await supabase
      .from('tour_bookings')
      .insert(row)
      .select('id')
      .single();
    if (error) {
      bookingDbOk = false;
      warnings.push(error.message);
    } else if (inserted?.id) {
      bookingId = inserted.id as string;
    }
  }

  if (input.expense && tenantId) {
    const { error } = await supabase.from('expenses').insert({
      tenant_id: tenantId,
      tour_id: input.tourId,
      amount_aud: input.expense.amount_aud,
      has_gst: input.expense.has_gst,
      ato_category: input.expense.ato_category,
      vendor_name: input.expense.vendor_name,
      receipt_filename: input.expense.receipt_filename,
    });
    if (error) warnings.push(error.message);
  }

  void dispatchTransactionNotification({
    client_name: input.clientName,
    client_email: input.clientEmail ?? '',
    client_phone: input.clientPhone ?? '',
    trip_code: input.tripCode,
    amount_aud: input.amountAud,
    reference_number: input.referenceNumber,
    payment_method: input.paymentMethod,
    booking_status: status,
  });

  if (bookingDbOk) {
    const sheetSync = await syncBookingPaymentToSheet({
      tour_code: input.tripCode,
      booking_id: bookingId ?? input.referenceNumber,
      client_name: input.clientName,
      pax: input.partyPax ?? 1,
      total_paid: input.amountAud,
      payment_method: input.paymentMethod,
      payment_date: new Date().toISOString().slice(0, 10),
    });
    if (!sheetSync.success) {
      warnings.push(`GSheet sync: ${sheetSync.error ?? 'failed'}`);
    }
  }

  return { warnings };
}

/** Phase 5 — Post-trip: persist settlement + sheets sync log. */
export async function runPhase5PostTrip(input: {
  tour: Tour;
  bookings: TourBooking[];
  expenses: Expense[];
  storagePath?: string;
}): Promise<{ settlement?: SettlementSyncPayload; warnings: string[] }> {
  const warnings: string[] = [];
  const tenantId = await resolveDefaultTenantId();
  const settlement = buildSettlementForTour(input.tour, input.bookings, input.expenses);

  const sheetResult = await syncSettlementToGoogleSheets(settlement);
  if (!sheetResult.success) warnings.push(sheetResult.error ?? 'Sheets sync failed');

  if (tenantId) {
    const { error: netErr } = await supabase.from('net_settlements').insert({
      tenant_id: tenantId,
      tour_id: input.tour.id,
      revenue_aud: settlement.revenue,
      expenses_aud: settlement.expenses,
      commissions_aud: settlement.commissions,
      net_profit_aud: settlement.netProfit,
      gst_collected_aud: settlement.gstCollected,
      gst_claimed_aud: settlement.gstClaimed,
      storage_path: input.storagePath ?? `tour-photos/${input.tour.id}/`,
    });
    if (netErr) warnings.push(netErr.message);

    const { error: logErr } = await supabase.from('sheets_sync_log').insert({
      tenant_id: tenantId,
      tour_id: input.tour.id,
      sync_type: 'SETTLEMENT',
      payload: settlement,
      success: sheetResult.success,
      error_message: sheetResult.error ?? null,
    });
    if (logErr) warnings.push(logErr.message);
  }

  await supabase.from('tours').update({ status: 'COMPLETED' }).eq('id', input.tour.id);

  return { settlement, warnings };
}

/** Phase 6 — Receive: signed album URL (60d) + album_delivered_at. */
export async function runPhase6Receive(input: {
  tourId: string;
  clientId?: string;
  bookingId?: string;
  storageObjectPath?: string;
}): Promise<{ signedUrl?: string; expiresAt?: string; warnings: string[] }> {
  const warnings: string[] = [];

  const { data, error } = await supabase.functions.invoke('deliver-album', {
    body: {
      tour_id: input.tourId,
      client_id: input.clientId,
      booking_id: input.bookingId,
      object_path: input.storageObjectPath ?? `${input.tourId}/album.zip`,
      expires_in_days: ALBUM_SIGNED_URL_DAYS,
    },
  });

  if (error) {
    warnings.push(error.message);
    return { warnings };
  }

  const payload = data as {
    signed_url?: string;
    expires_at?: string;
    error?: string;
  };

  if (payload?.error) warnings.push(payload.error);

  return {
    signedUrl: payload?.signed_url,
    expiresAt: payload?.expires_at,
    warnings,
  };
}

/** Phase 7 — Review: VIP tier + LTV + retargeting SMS. */
export async function runPhase7Review(input: {
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  tripRevenueAud?: number;
}): Promise<{ vipTier: VipTier; totalTrips: number; warnings: string[] }> {
  const warnings: string[] = [];

  const { data: bookings, error: countErr } = await supabase
    .from('tour_bookings')
    .select('id, amount_paid_aud, status')
    .eq('client_id', input.clientId);

  if (countErr) warnings.push(countErr.message);

  const paidBookings =
    bookings?.filter((b) => b.status === 'DEPOSIT_PAID' || b.status === 'FULLY_PAID') ?? [];
  const totalTrips = paidBookings.length;
  const lifetimeValue =
    paidBookings.reduce((s, b) => s + Number(b.amount_paid_aud ?? 0), 0) +
    (input.tripRevenueAud ?? 0);

  const vipTier = resolveVipTier(totalTrips);

  const { error: updateErr } = await supabase
    .from('crm_clients')
    .update({
      vip_tier: vipTier,
      total_trips: totalTrips,
      lifetime_value: lifetimeValue,
      journey_phase: 'review',
    })
    .eq('id', input.clientId);

  if (updateErr) warnings.push(updateErr.message);

  void dispatchRetargetingNotification({
    client_name: input.clientName,
    client_phone: input.clientPhone ?? '',
    client_email: input.clientEmail ?? '',
    vip_tier: vipTier,
    total_trips: totalTrips,
  });

  return { vipTier, totalTrips, warnings };
}
