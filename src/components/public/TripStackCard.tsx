import { Link } from 'react-router-dom';
import type { TripSheetRow } from '../../lib/tripsSheetApi';
import { tripDurationBadge, tripMaxPaxLabel, tripPriceFromLabel, tripSeasonBadge } from '../../lib/tripDisplay';
import { getPublicTripDisplay } from '../../lib/publicTripDisplay';
import TourCardCover from './TourCardCover';

type Props = {
  tour: TripSheetRow;
  saved: boolean;
  onToggleSave: () => void;
  stackDepth: number;
  isActive: boolean;
  onActivate: () => void;
};

export default function TripStackCard({
  tour,
  saved,
  onToggleSave,
  stackDepth,
  isActive,
  onActivate,
}: Props) {
  const display = getPublicTripDisplay(tour);
  const scale = stackDepth === 0 ? 1 : stackDepth === 1 ? 0.95 : 0.9;
  const translateY = stackDepth === 0 ? 0 : stackDepth === 1 ? -14 : -26;
  const opacity = stackDepth === 0 ? 1 : stackDepth === 1 ? 0.92 : 0.78;
  const pointerEvents = isActive ? 'auto' : 'none';

  return (
    <article
      className="absolute inset-x-0 top-0 transition-all duration-500 ease-out"
      style={{
        zIndex: 30 - stackDepth,
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity,
        pointerEvents,
      }}
      aria-hidden={!isActive}
    >
      <div
        className={`relative rounded-[32px] overflow-hidden shadow-xl bg-neutral-900 ${
          isActive ? 'ring-1 ring-white/10' : ''
        }`}
      >
        <Link
          to={`/tours/${encodeURIComponent(tour.tourCode)}`}
          onClick={() => onActivate()}
          className="block aspect-[4/5] max-h-[min(72vh,520px)] relative"
        >
          <div className="absolute inset-0">
            <TourCardCover
              tourCode={tour.tourCode}
              alt={display.title}
              aspectClassName="h-full w-full"
              imgClassName="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3 z-10">
            <span className="inline-flex items-center rounded-full bg-black/35 backdrop-blur-md border border-white/15 px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
              {display.region}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave();
              }}
              className="backdrop-blur-md bg-white/20 rounded-full p-2 text-lg leading-none shadow-sm hover:bg-white/30 transition-colors"
              aria-label={saved ? 'Remove from saved' : 'Save trip'}
            >
              {saved ? '★' : '☆'}
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 z-10">
            <h3 className="font-serif text-2xl font-bold text-white leading-tight tracking-tight">
              {display.title}
            </h3>
            {display.priceLabel ? (
              <p className="mt-2 text-sm font-semibold text-emerald-300">{display.priceLabel}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/90">
              <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur px-2.5 py-1 font-semibold">
                {tripDurationBadge(tour.durationDays, tour.tripType)}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur px-2.5 py-1 font-semibold">
                {tripSeasonBadge(tour.season)}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur px-2.5 py-1 font-semibold">
                {tripMaxPaxLabel(tour)}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}
