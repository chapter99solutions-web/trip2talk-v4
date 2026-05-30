import type { TripSheetRow } from '../../lib/tripsSheetApi';
import {
  tripDurationBadge,
  tripMaxPaxLabel,
  tripPriceFromLabel,
  tripSeasonBadge,
} from '../../lib/tripDisplay';

export default function TripCardBadges({ tour, className = '' }: { tour: TripSheetRow; className?: string }) {
  const price = tripPriceFromLabel(tour);
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {price ? (
        <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 text-[11px] font-semibold">
          {price}
        </span>
      ) : null}
      <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-[11px] font-semibold">
        {tripDurationBadge(tour.durationDays, tour.tripType)}
      </span>
      <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-[11px] font-semibold">
        {tripSeasonBadge(tour.season)}
      </span>
      <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-[11px] font-semibold">
        {tripMaxPaxLabel(tour)}
      </span>
    </div>
  );
}
