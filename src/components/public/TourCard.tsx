import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import type { TripSheetRow } from '../../lib/tripsSheetApi';
import { getPublicTripDisplay } from '../../lib/publicTripDisplay';
import { findTourFallbackByCode } from '../../data/tours';
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
  const featured = Boolean(findTourFallbackByCode(tour.tourCode)?.featured);
  const big = large || featured;

  return (
    <article
      className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow ${
        big ? 'lg:col-span-2' : ''
      } ${
        featured
          ? 'border-2 border-amber-400 shadow-amber-200/40 ring-1 ring-amber-200'
          : 'border border-slate-100'
      }`}
    >
      <div className={`relative ${featured ? 'aspect-[16/7] min-h-[320px]' : big ? 'aspect-[21/9]' : ''}`}>
        <TourCardCover
          tourCode={tour.tourCode}
          alt={display.title}
          aspectClassName={featured ? 'aspect-[16/7] min-h-[320px]' : big ? 'aspect-[21/9]' : 'aspect-video'}
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {featured && (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 text-amber-950 text-[11px] font-extrabold tracking-wide shadow-lg uppercase">
              ⭐ Flagship Trip
            </span>
          </>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave();
          }}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
          aria-label={saved ? 'Unsave trip' : 'Save trip'}
          aria-pressed={saved}
        >
          <Bookmark
            size={18}
            strokeWidth={2.25}
            className={saved ? 'text-amber-500' : 'text-slate-400'}
            fill={saved ? 'currentColor' : 'none'}
          />
        </button>
      </div>
      <div className="p-4 md:p-5">
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-emerald-700">
              {display.region}
            </p>
            <h3
              className={`font-serif font-semibold text-slate-900 mt-1 ${
                featured ? 'text-2xl md:text-3xl' : big ? 'text-2xl' : 'text-lg'
              }`}
            >
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
        <TripCardBadges tour={tour} className="mt-3" priceGold={featured} />
        <Link
          to={`/tours/${encodeURIComponent(tour.tourCode)}`}
          className={`mt-4 inline-flex w-full justify-center items-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-colors ${
            featured
              ? 'bg-amber-400 text-amber-950 hover:bg-amber-300'
              : 'bg-navy text-white hover:bg-navy-dark'
          }`}
        >
          {featured ? 'Explore the flagship trip' : 'View trip details'} <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}
