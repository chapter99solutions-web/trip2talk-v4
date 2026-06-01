import type { TripSheetRow } from './tripsSheetApi';

export type TripFilterId = 'all' | 'one_day' | 'overnight' | 'by_season';

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

  if (isOneDayTrip(trip)) tags.push('one_day');
  if (isOvernightTrip(trip)) tags.push('overnight');
  return tags;
}

export function filterTripsByCategory(trips: TripSheetRow[], filter: TripFilterId): TripSheetRow[] {
  if (filter === 'all') return trips;
  if (filter === 'by_season') return trips;
  return trips.filter((t) => classifyTripFilters(t).includes(filter));
}
