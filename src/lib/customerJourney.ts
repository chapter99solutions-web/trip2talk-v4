/**
 * TASK 15 — Customer lifecycle (7 phases) + VIP tier auto-upgrade.
 * All Supabase writes are best-effort; callers may continue on demo/offline flows.
 */
import { supabase } from './supabase';
import { dispatchRetargetingNotification, dispatchTransactionNotification } from './notifications';
import { buildSettlementForTour, syncSettlementToGoogleSheets, SettlementSyncPayload } from './googleSync';
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
    routes: ['/dashboard'],
  },
  post_trip: {
    summary: 'Settlement & Google Sheets',
    operations: ['Storage upload (tour-photos)', 'INSERT net_settlements', 'INSERT sheets_sync_log'],
    routes: ['/dashboard'],
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
  sendSms?: boolean;
}): Promise<{ clientId?: string; bookingId?: string; warnings: string[] }> {
  const warnings: string[] = [];
  const tenantId = await resolveDefaultTenantId();
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

  const bookingPayload: Record<string, unknown> = {
    tour_id: input.tourId,
    client_id: clientId ?? null,
    amount_paid_aud: input.depositAud,
    status: 'PENDING',
    payment_method: 'PAYID',
    reference_number: input.referenceNumber,
    party_pax: input.partyPax,
    trip_size_tier: input.tripSizeTier,
    preferred_pickup: input.pickup,
    journey_phase: 'book',
  };
  if (tenantId) bookingPayload.tenant_id = tenantId;

  const { data: bookingRow, error: bookingErr } = await supabase
    .from('tour_bookings')
    .insert(bookingPayload)
    .select('id')
    .maybeSingle();

  if (bookingErr) warnings.push(bookingErr.message);

  if (input.sendSms !== false) {
    void dispatchTransactionNotification({
      client_name: input.fullName,
      client_email: input.email,
      client_phone: input.phone,
      trip_code: input.tripCode,
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
    if (error) warnings.push(error.message);
  } else {
    const row: Record<string, unknown> = {
      tour_id: input.tourId,
      client_id: input.clientId,
      amount_paid_aud: input.amountAud,
      status,
      payment_method: input.paymentMethod,
      reference_number: input.referenceNumber,
      journey_phase: 'on_trip',
    };
    if (tenantId) row.tenant_id = tenantId;
    const { error } = await supabase.from('tour_bookings').insert(row);
    if (error) warnings.push(error.message);
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
