import { Link } from 'react-router-dom';
import { findTourFallbackByCode } from '../../data/tours';
import type { ListingTour } from '../../hooks/useTours';
import { formatAUD } from '../../lib/payidCalc';
import TourCardCover from '../public/TourCardCover';

type Props = {
  tour: ListingTour;
  staggerIndex?: number;
};

export default function StandardTripCard({ tour, staggerIndex = 0 }: Props) {
  const code = tour.trip_code.trim().toUpperCase();
  const fallback = findTourFallbackByCode(code);
  const ctaHref = tour.canReserve ? `/book/${encodeURIComponent(code)}` : '/contact';
  const ctaLabel = tour.canReserve ? 'Reserve $100' : 'Enquire';

  return (
    <article
      className="trip-card-enter group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-lg"
      style={{ animationDelay: `${staggerIndex * 0.1}s` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <TourCardCover
          tourCode={code}
          alt={tour.displayName}
          fallbackUrls={[fallback?.galleryPhotos?.[0], tour.cover_image, undefined]}
          aspectClassName="aspect-[4/3]"
          imgClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">{code}</p>
        <h3 className="font-serif text-xl font-semibold text-slate-900 mt-1 tour-name">{tour.displayName}</h3>
        <p className="text-sm text-slate-600 mt-1">{tour.destination}</p>
        <p className="text-base font-semibold text-emerald-700 mt-3">{formatAUD(tour.price_aud)}</p>
        <p className="text-sm text-slate-500 mt-2">
          {tour.canReserve ? (
            <>Available dates · {tour.dateLabel}</>
          ) : (
            <Link to="/contact" className="text-emerald-700 hover:text-emerald-800 font-medium">
              Ask us →
            </Link>
          )}
        </p>
        <Link
          to={ctaHref}
          className="mt-auto pt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-dark"
        >
          {ctaLabel} <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}
