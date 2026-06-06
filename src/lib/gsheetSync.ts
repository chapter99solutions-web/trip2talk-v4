/**
 * gsheetSync.ts — Hybrid Google Sheets sync for Tax_Year_2025_2026_Settlements.
 *
 * Part 1 (auto): append_booking on every new booking/payment (checkout + Co-Host).
 * Part 2 (manual): append_pl when Owner closes a trip.
 */

import { supabase } from './supabase';

const DEFAULT_GAS_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbwR0VylDEfZZUdk49p_6TQeHggQp0U7gNRexJGpFkMvxCNM3KRrw-gXz2FRWVXhA6CVvg/exec';

function resolveGSheetUrl(): string {
  const fromNew = (import.meta.env.VITE_GSHEET_WEBAPP_URL as string | undefined)?.trim();
  const fromOld = (import.meta.env.VITE_GAS_WEBAPP_URL as string | undefined)?.trim();
  return fromNew || fromOld || DEFAULT_GAS_WEBAPP_URL;
}

const LOG = '[GSheetSync]';

/** Booking/payment row for append_booking */
export type BookingPaymentSheetPayload = {
  tour_code: string;
  booking_id: string;
  client_name: string;
  pax?: number;
  total_paid: number;
  payment_method: string;
  payment_date?: string;
  synced_at?: string;
};

/** P&L summary row for append_pl */
export type TripPlSheetPayload = {
  trip_code: string;
  trip_name: string;
  revenue: number;
  expenses: number;
  commissions: number;
  net_profit: number;
  gst_collected: number;
  gst_claimed: number;
  sync_date?: string;
  slots_booked?: number | null;
  slots_max?: number | null;
};

/** @deprecated — use BookingPaymentSheetPayload */
export type BookingSheetPayload = {
  action?: 'addBooking' | 'append_booking';
  booking_ref?: string;
  booking_id?: string;
  client_name?: string;
  email?: string;
  phone?: string;
  tour_code?: string;
  departure_date?: string;
  amount?: number;
  pax?: number;
  pickup?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  payment_method?: string;
  payment_date?: string;
};

export type GSheetSyncResult = {
  success: boolean;
  response?: unknown;
  error?: string;
};

function isBookingAppendOk(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const o = payload as Record<string, unknown>;
  if (o.status === 'error' || o.ok === false) return false;
  const msg = String(o.message ?? '').toLowerCase();
  return msg.includes('booking payment appended') || msg.includes('booking row appended');
}

function isPlAppendOk(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const o = payload as Record<string, unknown>;
  if (o.status === 'error' || o.ok === false) return false;
  const msg = String(o.message ?? '').toLowerCase();
  return msg.includes('p&l row appended') || msg.includes('p&l row updated');
}

function parseGasError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const o = payload as Record<string, unknown>;
  if (o.status === 'error' || o.ok === false) {
    return String(o.message ?? o.error).trim() || 'GAS returned an error';
  }
  return null;
}

async function postViaApi(
  apiPath: string,
  payload: Record<string, unknown>
): Promise<GSheetSyncResult> {
  try {
    const res = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const parsed = (await res.json()) as GSheetSyncResult & { response?: unknown };
    if (!res.ok || !parsed.success) {
      const err = parsed.error ?? `API HTTP ${res.status}`;
      console.error(`${LOG} API proxy failed`, { apiPath, status: res.status, parsed });
      return { success: false, response: parsed.response, error: err };
    }
    console.log(`${LOG} API proxy success ✓`, { apiPath, response: parsed.response });
    return { success: true, response: parsed.response };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { success: false, error };
  }
}

async function postDirectGas(
  payload: Record<string, unknown>,
  isOk: (p: unknown) => boolean
): Promise<GSheetSyncResult> {
  const url = resolveGSheetUrl();
  const body = JSON.stringify(payload);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body,
    redirect: 'follow',
  });

  const raw = await res.text();
  let parsed: unknown = raw;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // GAS may return HTML
  }

  if (!res.ok) {
    console.error(`${LOG} HTTP error`, { status: res.status, body: raw.slice(0, 1000) });
    return { success: false, response: parsed, error: `HTTP ${res.status}` };
  }

  const gasErr = parseGasError(parsed);
  if (gasErr) {
    console.error(`${LOG} GAS error response`, { response: parsed });
    return { success: false, response: parsed, error: gasErr };
  }

  if (!isOk(parsed)) {
    console.error(`${LOG} GAS unexpected response`, { response: parsed });
    return {
      success: false,
      response: parsed,
      error: 'GAS did not confirm row write — redeploy gas/Code.gs v3.1',
    };
  }

  console.log(`${LOG} direct GAS success ✓`, { response: parsed });
  return { success: true, response: parsed };
}

async function postGasAction(
  action: 'append_booking' | 'append_pl',
  payload: Record<string, unknown>,
  isOk: (p: unknown) => boolean,
  apiPath: string
): Promise<GSheetSyncResult> {
  const body = { ...payload, action };
  console.log(`${LOG} ${action} →`, body);

  try {
    const viaDirect = await postDirectGas(body, isOk);
    if (viaDirect.success) return viaDirect;
    console.warn(`${LOG} direct GAS failed, trying API proxy`, { error: viaDirect.error });
    const viaApi = await postViaApi(apiPath, body);
    if (viaApi.success) return viaApi;
    return viaDirect.error ? viaDirect : viaApi;
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`${LOG} ${action} failed (non-blocking)`, { error, payload });
    return { success: false, error };
  }
}

/** Part 1 — append booking/payment row after Supabase write (non-blocking). */
export async function syncBookingPaymentToSheet(
  payload: BookingPaymentSheetPayload
): Promise<GSheetSyncResult> {
  const nowIso = new Date().toISOString();
  const clientName = payload.client_name.trim() || 'Guest';
  return postGasAction(
    'append_booking',
    {
      tour_code: payload.tour_code.trim().toUpperCase(),
      booking_id: payload.booking_id,
      client_name: clientName,
      customer_name: clientName,
      pax: payload.pax ?? 1,
      total_paid: payload.total_paid,
      payment_method: payload.payment_method,
      payment_date: payload.payment_date ?? nowIso.slice(0, 10),
      synced_at: payload.synced_at ?? nowIso,
    },
    isBookingAppendOk,
    '/api/booking/sync-settlement'
  );
}

/** Part 2 — append/update P&L row when Owner closes a trip. */
export async function syncTripPlToSheet(payload: TripPlSheetPayload): Promise<GSheetSyncResult> {
  const syncDate = payload.sync_date ?? new Date().toISOString();
  return postGasAction(
    'append_pl',
    {
      trip_code: payload.trip_code.trim().toUpperCase(),
      trip_name: payload.trip_name,
      revenue: payload.revenue,
      expenses: payload.expenses,
      commissions: payload.commissions,
      net_profit: payload.net_profit,
      gst_collected: payload.gst_collected,
      gst_claimed: payload.gst_claimed,
      sync_date: syncDate,
      slots_booked: payload.slots_booked ?? null,
      slots_max: payload.slots_max ?? null,
    },
    isPlAppendOk,
    '/api/booking/sync-pl'
  );
}

export type SyncAllBookingsResult = {
  success: boolean;
  total: number;
  synced: number;
  failed: number;
  errors: string[];
};

type TourBookingSyncRow = {
  id: string;
  reference_number?: string | null;
  amount_paid_aud?: number | null;
  party_pax?: number | null;
  trip_date?: string | null;
  payment_method?: string | null;
  created_at?: string | null;
  status?: string | null;
  crm_clients?: {
    first_name_en?: string | null;
    last_name_en?: string | null;
    first_name_th?: string | null;
    last_name_th?: string | null;
  } | null;
  tours?: { trip_code?: string | null } | null;
};

function bookingClientName(c: TourBookingSyncRow['crm_clients']): string {
  if (!c) return 'Guest';
  const en = `${c.first_name_en ?? ''} ${c.last_name_en ?? ''}`.trim();
  if (en) return en;
  const th = `${c.first_name_th ?? ''} ${c.last_name_th ?? ''}`.trim();
  return th || 'Guest';
}

export type SyncAllProgress = (current: number, total: number) => void;

/** Owner dashboard — sync every tour_bookings row to Settlements via append_booking. */
export async function syncAllBookingsToSheet(
  onProgress?: SyncAllProgress
): Promise<SyncAllBookingsResult> {
  const { data, error } = await supabase
    .from('tour_bookings')
    .select(
      `
      id,
      reference_number,
      amount_paid_aud,
      party_pax,
      trip_date,
      payment_method,
      created_at,
      status,
      crm_clients (first_name_en, last_name_en, first_name_th, last_name_th),
      tours (trip_code)
    `
    )
    .order('created_at', { ascending: true });

  if (error) {
    return { success: false, total: 0, synced: 0, failed: 0, errors: [error.message] };
  }

  const rows = ((data ?? []) as TourBookingSyncRow[]).filter(
    (r) => !String(r.status ?? '').toUpperCase().includes('CANCEL')
  );
  let synced = 0;
  const errors: string[] = [];
  const total = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    onProgress?.(i + 1, total);

    const tripCode = String(row.tours?.trip_code ?? '').trim().toUpperCase();
    if (!tripCode) {
      errors.push(`${row.id}: missing trip_code`);
      continue;
    }

    const paymentDate =
      String(row.trip_date ?? '').slice(0, 10) ||
      String(row.created_at ?? '').slice(0, 10) ||
      new Date().toISOString().slice(0, 10);

    const result = await syncBookingPaymentToSheet({
      tour_code: tripCode,
      booking_id: row.reference_number?.trim() || row.id,
      client_name: bookingClientName(row.crm_clients),
      pax: Number(row.party_pax ?? 1) || 1,
      total_paid: Number(row.amount_paid_aud ?? 0),
      payment_method: String(row.payment_method ?? 'PAYID').trim() || 'PAYID',
      payment_date: paymentDate,
    });

    if (result.success) {
      synced += 1;
    } else {
      errors.push(`${row.id}: ${result.error ?? 'GAS sync failed'}`);
    }
  }

  const failed = rows.length - synced;

  return {
    success: failed === 0 && errors.length === 0,
    total: rows.length,
    synced,
    failed,
    errors,
  };
}

function gstFromInclusiveRevenue(revenue: number): number {
  if (revenue <= 0) return 0;
  return Math.round((revenue / 11) * 100) / 100;
}

/** Collect booking revenue and sync simplified P&L for one trip; returns payload + GAS result. */
export async function closeTripPlFromSupabase(tour: {
  id: string;
  trip_code: string | null;
  title?: string | null;
  slots_booked?: number | null;
  slots_max?: number | null;
}): Promise<{ sheet: GSheetSyncResult; payload: TripPlSheetPayload }> {
  const tripCode = (tour.trip_code ?? '').trim().toUpperCase();
  if (!tripCode) {
    return {
      sheet: { success: false, error: 'Missing trip_code' },
      payload: {
        trip_code: '',
        trip_name: '',
        revenue: 0,
        expenses: 0,
        commissions: 0,
        net_profit: 0,
        gst_collected: 0,
        gst_claimed: 0,
      },
    };
  }

  const { data: bookings, error } = await supabase
    .from('tour_bookings')
    .select('amount_paid_aud, status')
    .eq('tour_id', tour.id);

  if (error) {
    return {
      sheet: { success: false, error: error.message },
      payload: {
        trip_code: tripCode,
        trip_name: tour.title?.trim() || tripCode,
        revenue: 0,
        expenses: 0,
        commissions: 0,
        net_profit: 0,
        gst_collected: 0,
        gst_claimed: 0,
      },
    };
  }

  const revenue = (bookings ?? [])
    .filter((b) => !String((b as { status?: string }).status ?? '').toUpperCase().includes('CANCEL'))
    .reduce((sum, b) => sum + Number((b as { amount_paid_aud?: number }).amount_paid_aud ?? 0), 0);

  const plPayload: TripPlSheetPayload = {
    trip_code: tripCode,
    trip_name: tour.title?.trim() || tripCode,
    revenue,
    expenses: 0,
    commissions: 0,
    net_profit: revenue,
    gst_collected: gstFromInclusiveRevenue(revenue),
    gst_claimed: 0,
    slots_booked: tour.slots_booked ?? null,
    slots_max: tour.slots_max ?? null,
  };

  const sheet = await syncTripPlToSheet(plPayload);
  return { sheet, payload: plPayload };
}

/** Backward-compatible alias — maps legacy BookingSheetPayload → append_booking. */
export async function syncBookingToSheet(payload: BookingSheetPayload): Promise<GSheetSyncResult> {
  return syncBookingPaymentToSheet({
    tour_code: payload.tour_code ?? '',
    booking_id: payload.booking_id ?? payload.booking_ref ?? '',
    client_name: payload.client_name ?? '',
    pax: payload.pax ?? 1,
    total_paid: Number(payload.amount ?? 0),
    payment_method: payload.payment_method ?? 'PAYID',
    payment_date: payload.payment_date ?? payload.departure_date,
    synced_at: payload.created_at,
  });
}

export async function syncSlotIncrementToSheet(
  tourCode: string,
  by = 1
): Promise<GSheetSyncResult> {
  const url = resolveGSheetUrl();
  const body = JSON.stringify({ action: 'incrementSlot', tour_code: tourCode, by });

  console.log(`${LOG} incrementSlot →`, { url, tourCode, by });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
    });
    const raw = await res.text();
    let parsed: unknown = raw;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      // keep raw
    }
    if (!res.ok) {
      console.error(`${LOG} incrementSlot HTTP error`, { status: res.status });
      return { success: false, response: parsed, error: `HTTP ${res.status}` };
    }
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>;
      if (o.status === 'error' || o.success === false) {
        const msg = String(o.message ?? o.error ?? 'GAS returned an error');
        console.error(`${LOG} incrementSlot GAS error`, { response: parsed });
        return { success: false, response: parsed, error: msg };
      }
    }
    console.log(`${LOG} incrementSlot success ✓`, { response: parsed });
    return { success: true, response: parsed };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`${LOG} incrementSlot failed (non-blocking)`, { error, tourCode });
    return { success: false, error };
  }
}

export async function testGSheetSync(): Promise<GSheetSyncResult> {
  const ref = `TEST-${Date.now()}`;
  console.log(`${LOG} testGSheetSync →`, { booking_ref: ref });
  const result = await syncBookingPaymentToSheet({
    tour_code: 'TEST-1DAY',
    booking_id: ref,
    client_name: 'TEST — gsheetSync console',
    pax: 1,
    total_paid: 1,
    payment_method: 'PAYID',
    payment_date: new Date().toISOString().slice(0, 10),
  });
  console.log(`${LOG} testGSheetSync result:`, result);
  return result;
}

try {
  if (typeof window !== 'undefined') {
    (window as unknown as { testGSheetSync?: typeof testGSheetSync }).testGSheetSync =
      testGSheetSync;
  }
} catch {
  // ignore
}
