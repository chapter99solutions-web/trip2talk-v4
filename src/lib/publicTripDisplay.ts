import type { TripSheetRow } from './tripsSheetApi';
import { tripDurationBadge, tripPriceFromLabel, tripRegionBadge } from './tripDisplay';

/** Public-facing copy — marketing title only, no real place names in taglines. */
export function getPublicTripDisplay(trip: TripSheetRow) {
  const title = (trip.tourName || 'Private Photo Journey').trim();
  const region = tripRegionBadge(trip.countryTag);
  const durationLabel = tripDurationBadge(trip.durationDays, trip.tripType);
  const priceLabel = tripPriceFromLabel(trip);
  const tagline = priceLabel
    ? `${priceLabel} · ${durationLabel}`
    : `${region} · Private photo journey`;

  return {
    title,
    region,
    tagline,
    durationLabel,
    priceLabel,
  };
}
