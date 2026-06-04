import { findTourFallbackByCode } from '../data/tours';
import { isRealTourCode } from './realTourCodes';
import { supabase } from './supabase';
import { Tour } from '../types/tour';
import { PORTFOLIO_TOURS, PortfolioTour } from './portfolioTours';

function portfolioToTour(p: PortfolioTour): Tour {
  return {
    id: p.id,
    trip_code: p.tripCode,
    destination: p.location.split(',')[0] as Tour['destination'],
    start_date: '2026-06-01',
    end_date: '2026-06-08',
    price_aud: p.priceAud,
    max_pax: 6,
    current_pax: 4,
    status: 'CONFIRMED',
    base_commission_rate: 50,
    bonus_threshold_pax: 5,
    bonus_amount_aud: 200,
  };
}

function fallbackToTour(code: string): Tour {
  const fb = findTourFallbackByCode(code)!;
  return {
    id: fb.tourCode,
    trip_code: fb.tourCode,
    destination: 'Sydney',
    start_date: '2026-06-01',
    end_date: '2026-06-08',
    price_aud: fb.standardPrice,
    max_pax: fb.maxPax,
    current_pax: 1,
    status: 'CONFIRMED',
    base_commission_rate: 50,
    bonus_threshold_pax: 5,
    bonus_amount_aud: 200,
  };
}

function mapDbRowToTour(row: Record<string, unknown>): Tour {
  return {
    id: String(row.id),
    trip_code: String(row.trip_code ?? '').trim().toUpperCase(),
    destination: (row.destination as Tour['destination']) ?? 'Sydney',
    start_date: String(row.start_date ?? '2026-06-01'),
    end_date: String(row.end_date ?? '2026-06-08'),
    price_aud: Number(row.price_aud ?? 0),
    max_pax: Number(row.max_pax ?? row.slots_max ?? 6),
    current_pax: Number(row.slots_booked ?? row.current_pax ?? 0),
    status: (row.status as Tour['status']) ?? 'CONFIRMED',
    base_commission_rate: Number(row.base_commission_rate ?? 50),
    bonus_threshold_pax: Number(row.bonus_threshold_pax ?? 5),
    bonus_amount_aud: Number(row.bonus_amount_aud ?? 200),
    slots_booked: (row.slots_booked as number | null) ?? null,
    slots_max: (row.slots_max as number | null) ?? null,
    departure_start: (row.departure_start as string | null) ?? null,
    departure_end: (row.departure_end as string | null) ?? null,
  };
}

export function findTripById(id: string): Tour | undefined {
  const code = id.trim().toUpperCase();
  if (!code) return undefined;
  const p = PORTFOLIO_TOURS.find((t) => t.id === code || t.tripCode.toUpperCase() === code);
  if (p) return portfolioToTour(p);
  const fb = findTourFallbackByCode(code);
  if (fb) return fallbackToTour(code);
  if (!isRealTourCode(code)) return undefined;
  return undefined;
}

export function findTripByRef(ref: string): Tour | undefined {
  return findTripById(ref);
}

/** Load tour row from Supabase `tours` by `trip_code` (niuibpznjvytprbrzvnn source of truth). */
export async function fetchTourByTripCodeFromDb(tripCode: string): Promise<Tour | null> {
  const code = tripCode.trim().toUpperCase();
  if (!code) return null;

  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('trip_code', code)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[Trip2Talk] fetchTourByTripCodeFromDb:', error.message);
    return null;
  }
  return data ? mapDbRowToTour(data as Record<string, unknown>) : null;
}

/** DB first (public.tours.trip_code), then static catalog fallback. */
export async function resolveTripById(id: string): Promise<Tour | undefined> {
  const code = id.trim().toUpperCase();
  if (!code) return undefined;
  const fromDb = await fetchTourByTripCodeFromDb(code);
  if (fromDb) return fromDb;
  return findTripById(code);
}

export type AvailableTourDate = {
  id: string;
  start_date: string;
  end_date: string | null;
};

/** ACTIVE tour rows with a scheduled start_date for checkout date cards. */
export async function fetchAvailableTourDates(tripCode: string): Promise<AvailableTourDate[]> {
  const code = tripCode.trim().toUpperCase();
  if (!code) return [];

  const { data, error } = await supabase
    .from('tours')
    .select('id, start_date, end_date')
    .eq('trip_code', code)
    .eq('status', 'ACTIVE')
    .not('start_date', 'is', null)
    .order('start_date', { ascending: true });

  if (error) {
    console.warn('[Trip2Talk] fetchAvailableTourDates:', error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const r = row as { id?: string; start_date?: string; end_date?: string | null };
      const start = String(r.start_date ?? '').trim();
      if (!start) return null;
      return {
        id: String(r.id ?? start),
        start_date: start,
        end_date: r.end_date ? String(r.end_date).trim() : null,
      };
    })
    .filter((row): row is AvailableTourDate => row !== null);
}

export function formatTourDateRangeLabel(startIso: string, endIso: string | null): string {
  const start = new Date(startIso);
  if (!Number.isFinite(start.getTime())) return startIso;

  const end = endIso ? new Date(endIso) : null;
  if (!end || !Number.isFinite(end.getTime()) || endIso === startIso) {
    return start.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const monthYear = start.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
    return `${start.getDate()}-${end.getDate()} ${monthYear}`;
  }

  const startLabel = start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const endLabel = end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

/** cover_image column values keyed by trip_code. */
export async function fetchCoverImagesByTripCode(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('tours').select('trip_code, cover_image');
  if (error) {
    console.warn('[Trip2Talk] fetchCoverImagesByTripCode:', error.message);
    return {};
  }
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    const r = row as { trip_code?: string; cover_image?: string };
    const code = String(r.trip_code ?? '').trim().toUpperCase();
    const url = String(r.cover_image ?? '').trim();
    if (code && url) out[code] = url;
  }
  return out;
}
