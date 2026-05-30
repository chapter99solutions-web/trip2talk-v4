import type { TripSheetRow } from './tripsSheetApi';

export type TripFilterId = 'all' | 'portrait' | 'landscape' | 'one_day' | 'overnight' | 'by_season';

const ONE_DAY_CODES = new Set(['KIA-1DAY', 'SYD-1DAY']);

export function isOneDayTrip(trip: TripSheetRow): boolean {
  if (trip.tripType === 'one_day') return true;
  if (trip.tripType === 'overnight') return false;
  if (ONE_DAY_CODES.has(trip.tourCode.toUpperCase())) return true;
  return (trip.durationDays ?? 1) <= 1;
}

export function classifyTripFilters(trip: TripSheetRow): TripFilterId[] {
  const tags: TripFilterId[] = [];
  if (isOneDayTrip(trip)) tags.push('one_day');
  else tags.push('overnight');

  const hay = `${trip.tourName} ${trip.highlights} ${trip.tourCode}`.toLowerCase();
  if (hay.includes('portrait') || hay.includes('model')) tags.push('portrait');
  if (hay.includes('landscape') || hay.includes('milky') || hay.includes('aurora')) tags.push('landscape');
  if (!tags.includes('portrait') && !tags.includes('landscape')) tags.push('portrait');
  return tags;
}

export function filterTripsByCategory(trips: TripSheetRow[], filter: TripFilterId): TripSheetRow[] {
  if (filter === 'all' || filter === 'by_season') return trips;
  return trips.filter((t) => classifyTripFilters(t).includes(filter));
}
