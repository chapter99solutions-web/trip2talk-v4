/**
 * gsheetSync.ts — Hybrid Google Sheets sync for Tax_Year_2025_2026_Settlements.
 *
 * Part 1 (auto): append_booking on every new booking/payment (checkout + Co-Host).
 * Part 2 (manual): append_pl when Owner closes a trip.
 */

import { buildSettlementForTour } from './googleSync';
import { supabase } from './supabase';
import type { Expense, Tour } from '../types/tour';

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
    const viaApi = await postViaApi(apiPath, body);
    if (viaApi.success) return viaApi;
    console.warn(`${LOG} API proxy unavailable, trying direct GAS`, { error: viaApi.error });
    return await postDirectGas(body, isOk);
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
  return postGasAction(
    'append_booking',
    {
      tour_code: payload.tour_code.trim().toUpperCase(),
      booking_id: payload.booking_id,
      client_name: payload.client_name,
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

/** Collect Supabase figures and sync P&L for one trip; returns payload + GAS result. */
export async function closeTripPlFromSupabase(tour: {
  id: string;
  trip_code: string | null;
  title?: string | null;
  slots_booked?: number | null;
  slots_max?: number | null;
  current_pax?: number | null;
  price_aud?: number | null;
  base_commission_rate?: number | null;
  bonus_threshold_pax?: number | null;
  bonus_amount_aud?: number | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
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

  const [bookingsRes, expensesRes] = await Promise.all([
    supabase.from('tour_bookings').select('tour_id, amount_paid_aud').eq('tour_id', tour.id),
    supabase.from('expenses').select('*').eq('tour_id', tour.id),
  ]);

  const bookings = (bookingsRes.data ?? []).map((b) => ({
    tour_id: tour.id,
    amount_paid_aud: Number((b as { amount_paid_aud?: number }).amount_paid_aud ?? 0),
  }));
  const expenses = (expensesRes.data ?? []) as Expense[];

  const tourForCalc: Tour = {
    id: tour.id,
    trip_code: tripCode,
    destination: (tour.destination as Tour['destination']) ?? 'Sydney',
    start_date: tour.start_date ?? new Date().toISOString().slice(0, 10),
    end_date: tour.end_date ?? tour.start_date ?? new Date().toISOString().slice(0, 10),
    price_aud: Number(tour.price_aud ?? 0),
    max_pax: Number(tour.slots_max ?? tour.current_pax ?? 6),
    current_pax: Number(tour.slots_booked ?? tour.current_pax ?? 0),
    status: 'CONFIRMED',
    base_commission_rate: Number(tour.base_commission_rate ?? 0),
    bonus_threshold_pax: Number(tour.bonus_threshold_pax ?? 5),
    bonus_amount_aud: Number(tour.bonus_amount_aud ?? 0),
    slots_booked: tour.slots_booked ?? null,
    slots_max: tour.slots_max ?? null,
  };

  const settlement = buildSettlementForTour(tourForCalc, bookings, expenses);
  const plPayload: TripPlSheetPayload = {
    trip_code: tripCode,
    trip_name: tour.title?.trim() || tripCode,
    revenue: settlement.revenue,
    expenses: settlement.expenses,
    commissions: settlement.commissions,
    net_profit: settlement.netProfit,
    gst_collected: settlement.gstCollected,
    gst_claimed: settlement.gstClaimed,
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
