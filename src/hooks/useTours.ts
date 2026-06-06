import { useCallback, useEffect, useMemo, useState } from 'react';
import { findTourFallbackByCode } from '../data/tours';
import { formatDatePillLabel, hasDepartureDate } from '../lib/tripDisplay';
import type { TripFilterId } from '../lib/tripFilters';
import { supabase } from '../lib/supabase';
import type { Tour } from '../types/tour';

/** Public catalogue — owner-managed ACTIVE rows in Supabase. */
export const PUBLIC_ACTIVE_TRIP_CODES = [
  'KIA-1DAY',
  'MEL-4D3N',
  'NZ-6D5N',
  'SYD-1DAY',
  'TAS-3D2N',
  'TAS-LH-4D3N',
  'ULU-4D3N',
] as const;

export const FLAGSHIP_TRIP_CODES = ['TAS-3D2N'] as const;

const ACTIVE_SET = new Set<string>(PUBLIC_ACTIVE_TRIP_CODES);
const FLAGSHIP_SET = new Set<string>(FLAGSHIP_TRIP_CODES);
const ONE_DAY_CODES = new Set(['KIA-1DAY', 'SYD-1DAY']);

export type ListingTour = Tour & {
  displayName: string;
  seatsRemaining: number;
  dateLabel: string;
  canReserve: boolean;
  cover_image?: string | null;
};

function mapDbRow(row: Record<string, unknown>): Tour {
  return {
    id: String(row.id),
    trip_code: String(row.trip_code ?? '').trim().toUpperCase(),
    destination: String(row.destination ?? 'Australia') as Tour['destination'],
    start_date: String(row.start_date ?? ''),
    end_date: String(row.end_date ?? ''),
    price_aud: Number(row.price_aud ?? 0),
    max_pax: Number(row.max_pax ?? row.slots_max ?? 6),
    current_pax: Number(row.current_pax ?? row.slots_booked ?? 0),
    status: (row.status as Tour['status']) ?? 'ACTIVE',
    base_commission_rate: Number(row.base_commission_rate ?? 0),
    bonus_threshold_pax: Number(row.bonus_threshold_pax ?? 0),
    bonus_amount_aud: Number(row.bonus_amount_aud ?? 0),
    slots_booked: (row.slots_booked as number | null) ?? null,
    slots_max: (row.slots_max as number | null) ?? null,
    departure_start: (row.departure_start as string | null) ?? null,
    departure_end: (row.departure_end as string | null) ?? null,
  };
}

function seatsRemaining(tour: Tour): number {
  const max = tour.slots_max ?? tour.max_pax ?? 0;
  const booked = tour.slots_booked ?? tour.current_pax ?? 0;
  return Math.max(0, max - booked);
}

function enrichListingTour(tour: Tour, cover_image?: string | null): ListingTour {
  const code = tour.trip_code.trim().toUpperCase();
  const fallback = findTourFallbackByCode(code);
  const departureStart = tour.departure_start ?? tour.start_date;
  const departureEnd = tour.departure_end ?? tour.end_date;
  const canReserve = hasDepartureDate(departureStart);

  return {
    ...tour,
    cover_image: cover_image ?? null,
    displayName: (fallback?.tourName ?? fallback?.anonymizedTitle ?? tour.destination).trim(),
    seatsRemaining: seatsRemaining(tour),
    dateLabel: canReserve ? formatDatePillLabel(departureStart, departureEnd) : 'Ask us →',
    canReserve,
  };
}

function fallbackListingTours(): ListingTour[] {
  return PUBLIC_ACTIVE_TRIP_CODES.map((code) => {
    const fb = findTourFallbackByCode(code);
    const tour: Tour = {
      id: code,
      trip_code: code,
      destination: 'Sydney',
      start_date: fb?.nextDate ?? '',
      end_date: fb?.endDate ?? '',
      price_aud: fb?.standardPrice ?? 0,
      max_pax: fb?.maxPax ?? 6,
      current_pax: fb?.seatsLeft != null ? Math.max(0, (fb.maxPax ?? 6) - fb.seatsLeft) : 0,
      status: 'ACTIVE',
      base_commission_rate: 0,
      bonus_threshold_pax: 0,
      bonus_amount_aud: 0,
      departure_start: fb?.nextDate ?? null,
      departure_end: fb?.endDate ?? null,
      slots_max: fb?.maxPax ?? 6,
      slots_booked: fb?.seatsLeft != null ? Math.max(0, (fb.maxPax ?? 6) - fb.seatsLeft) : null,
    };
    return enrichListingTour(tour);
  });
}

export function isFlagshipTripCode(code: string): boolean {
  return FLAGSHIP_SET.has(code.trim().toUpperCase());
}

export function filterListingTours(tours: ListingTour[], filter: TripFilterId): ListingTour[] {
  if (filter === 'all' || filter === 'by_season') return tours;
  return tours.filter((t) => {
    const code = t.trip_code.toUpperCase();
    const fb = findTourFallbackByCode(code);
    const oneDay = fb?.tripType === 'one_day' || ONE_DAY_CODES.has(code);
    return filter === 'one_day' ? oneDay : !oneDay;
  });
}

export function useTours() {
  const [tours, setTours] = useState<ListingTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('tours')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('trip_code', { ascending: true });

      if (qErr) throw new Error(qErr.message);

      const rows = (data ?? []).filter((row) => {
        const code = String((row as { trip_code?: string }).trip_code ?? '').trim().toUpperCase();
        return ACTIVE_SET.has(code);
      });

      if (!rows.length) {
        setTours(fallbackListingTours());
        return;
      }

      setTours(
        rows.map((row) => {
          const r = row as Record<string, unknown>;
          const cover = String(r.cover_image ?? '').trim() || null;
          return enrichListingTour(mapDbRow(r), cover);
        }),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load trips';
      setError(msg);
      setTours(fallbackListingTours());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flagship = useMemo(
    () =>
      tours.filter((t) => isFlagshipTripCode(t.trip_code)).sort((a, b) => a.trip_code.localeCompare(b.trip_code)),
    [tours],
  );

  const standard = useMemo(
    () => tours.filter((t) => !isFlagshipTripCode(t.trip_code)),
    [tours],
  );

  return { tours, flagship, standard, loading, error, reload: load };
}
