import type { TripSheetRow } from './tripsSheetApi';

export type TripFilterId = 'all' | 'portrait' | 'landscape' | 'overnight' | 'wedding';

const ONE_DAY_CODES = new Set(['KIA-1DAY', 'SYD-1DAY']);

export function isOneDayTrip(trip: TripSheetRow): boolean {
  if (trip.tripType === 'one_day') return true;
  if (trip.tripType === 'overnight') return false;
  if (ONE_DAY_CODES.has(trip.tourCode.toUpperCase())) return true;
  return (trip.durationDays ?? 1) <= 1;
}

export function isOvernightTrip(trip: TripSheetRow): boolean {
  return !isOneDayTrip(trip);
}

export function classifyTripFilters(trip: TripSheetRow): TripFilterId[] {
  const tags: TripFilterId[] = [];
  const hay = `${trip.tourName} ${trip.highlights} ${trip.tourCode}`.toLowerCase();

  if (isOvernightTrip(trip)) tags.push('overnight');
  if (hay.includes('wedding') || hay.includes('vow') || hay.includes('-wed') || hay.includes('bridal')) {
    tags.push('wedding');
  }
  if (hay.includes('portrait') || hay.includes('model') || hay.includes('fashion')) tags.push('portrait');
  if (hay.includes('landscape') || hay.includes('milky') || hay.includes('aurora')) tags.push('landscape');
  if (!tags.includes('portrait') && !tags.includes('landscape') && !tags.includes('wedding')) {
    tags.push('portrait');
  }
  return tags;
}

export function filterTripsByCategory(trips: TripSheetRow[], filter: TripFilterId): TripSheetRow[] {
  if (filter === 'all') return trips;
  return trips.filter((t) => classifyTripFilters(t).includes(filter));
}
