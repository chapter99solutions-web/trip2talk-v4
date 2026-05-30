import { Link } from 'react-router-dom';
import type { TripSheetRow } from '../../lib/tripsSheetApi';
import { getPublicTripDisplay } from '../../lib/publicTripDisplay';
import TripCardBadges from './TripCardBadges';
import TourCardCover from './TourCardCover';

type Props = {
  tour: TripSheetRow;
  saved: boolean;
  onToggleSave: () => void;
  large?: boolean;
};

export default function TourCard({ tour, saved, onToggleSave, large }: Props) {
  const display = getPublicTripDisplay(tour);

  return (
    <article
      className={`group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-shadow ${
        large ? 'lg:col-span-2' : ''
      }`}
    >
      <div className={`relative ${large ? 'aspect-[21/9]' : ''}`}>
        <TourCardCover
          tourCode={tour.tourCode}
          alt={display.title}
          aspectClassName={large ? 'aspect-[21/9]' : 'aspect-video'}
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleSave();
          }}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-lg shadow-sm hover:scale-110 transition-transform"
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          {saved ? '❤️' : '🤍'}
        </button>
      </div>
      <div className="p-4 md:p-5">
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-emerald-700">
              {display.region}
            </p>
            <h3 className={`font-serif font-semibold text-slate-900 mt-1 ${large ? 'text-2xl' : 'text-lg'}`}>
              {display.title}
            </h3>
          </div>
          {tour.weather ? (
            <p className="text-xs font-semibold text-slate-600 whitespace-nowrap">{tour.weather}</p>
          ) : display.durationLabel ? (
            <p className="text-xs font-semibold text-slate-500 whitespace-nowrap">{display.durationLabel}</p>
          ) : null}
        </div>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{display.tagline}</p>
        <TripCardBadges tour={tour} className="mt-3" />
        <Link
          to={`/tours/${encodeURIComponent(tour.tourCode)}`}
          className="mt-4 inline-flex w-full justify-center items-center gap-2 py-2.5 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors"
        >
          View trip details <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}
