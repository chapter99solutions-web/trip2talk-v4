import { Link } from 'react-router-dom';
import type { TripSheetRow } from '../../lib/tripsSheetApi';
import { tripCapacityLabel, tripDurationLabel, tripRegionBadge } from '../../lib/tripDisplay';

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80';

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
          <img
            src={tour.coverUrl || FALLBACK_COVER}
            alt={tour.tourName || tour.tourCode}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3 z-10">
            <span className="inline-flex items-center rounded-full bg-black/35 backdrop-blur-md border border-white/15 px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
              {tripRegionBadge(tour.countryTag, tour.tourName || tour.tourCode)}
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
              {tour.tourName || tour.tourCode}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden>📅</span>
                {tripDurationLabel(tour.durationDays)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden>👥</span>
                {tripCapacityLabel(tour)}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}
