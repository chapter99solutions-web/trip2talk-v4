import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { findTourFallbackByCode } from '../../data/tours';
import type { ListingTour } from '../../hooks/useTours';
import { formatAUD } from '../../lib/payidCalc';
import TourCardCover from '../public/TourCardCover';

type Props = {
  tour: ListingTour;
  staggerIndex?: number;
};

export default function FlagshipTripCard({ tour, staggerIndex = 0 }: Props) {
  const shellRef = useRef<HTMLElement>(null);
  const [parallaxY, setParallaxY] = useState(0);
  const code = tour.trip_code.trim().toUpperCase();
  const fallback = findTourFallbackByCode(code);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const onScroll = () => {
      const el = shellRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;
      const progress = (vh - rect.top) / (vh + rect.height);
      setParallaxY((progress - 0.5) * 32);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const ctaHref = tour.canReserve ? `/book/${encodeURIComponent(code)}` : '/contact';
  const ctaLabel = tour.canReserve ? 'Reserve $100' : 'Enquire';

  return (
    <article
      ref={shellRef}
      className="trip-card-enter group relative overflow-hidden rounded-2xl bg-[color:var(--navy,#0d1b2a)] shadow-xl ring-1 ring-[color:var(--gold-border,rgba(212,175,55,0.35))]"
      style={{ animationDelay: `${staggerIndex * 0.1}s` }}
    >
      <div className="relative min-h-[420px] md:min-h-[480px] overflow-hidden">
        <div
          className="absolute inset-0 will-change-transform transition-transform duration-75 ease-out"
          style={{ transform: `translate3d(0, ${parallaxY}px, 0) scale(1.06)` }}
        >
          <TourCardCover
            tourCode={code}
            alt={tour.displayName}
            fallbackUrls={[fallback?.galleryPhotos?.[0], tour.cover_image, undefined]}
            aspectClassName="h-full min-h-[420px] md:min-h-[480px]"
            imgClassName="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15 pointer-events-none" />

        <span className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--gold-border)] bg-black/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--gold)] backdrop-blur-md">
          Flagship
        </span>

        {tour.seatsRemaining > 0 && tour.seatsRemaining <= tour.max_pax ? (
          <span className="absolute top-4 right-4 z-10 inline-flex items-center rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
            Limited seats · {tour.seatsRemaining} left
          </span>
        ) : null}

        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/70">{code}</p>
          <h3 className="font-serif text-2xl md:text-4xl font-semibold text-white mt-2 leading-tight tour-name">
            {tour.displayName}
          </h3>
          <p className="text-sm text-white/80 mt-2">{tour.destination}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-[color:var(--gold)]">{formatAUD(tour.price_aud)}</span>
            <span className="text-white/60">·</span>
            <span className="text-white/85">{tour.dateLabel}</span>
          </div>
          <Link
            to={ctaHref}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--gold)] px-6 py-3 text-sm font-semibold text-[color:var(--navy)] transition-[filter] hover:brightness-110"
          >
            {ctaLabel} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
