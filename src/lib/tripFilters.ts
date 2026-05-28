import type { TripSheetRow } from './tripsSheetApi';

export type TripFilterId = 'all' | 'portrait' | 'landscape' | 'overnight' | 'wedding';

export function classifyTripFilters(trip: TripSheetRow): TripFilterId[] {
  const hay = `${trip.tourName} ${trip.categoryName} ${trip.tourCode}`.toLowerCase();
  const tags: TripFilterId[] = [];
  if ((trip.durationDays ?? 1) > 1) tags.push('overnight');
  if (hay.includes('wedding') || hay.includes('pre-wed')) tags.push('wedding');
  if (hay.includes('portrait') || hay.includes('model') || hay.includes('one day')) tags.push('portrait');
  if (hay.includes('landscape') || hay.includes('milky') || hay.includes('aurora')) tags.push('landscape');
  if (tags.length === 0) tags.push('portrait');
  return tags;
}

export function filterTripsByCategory(trips: TripSheetRow[], filter: TripFilterId): TripSheetRow[] {
  if (filter === 'all') return trips;
  return trips.filter((t) => classifyTripFilters(t).includes(filter));
}
