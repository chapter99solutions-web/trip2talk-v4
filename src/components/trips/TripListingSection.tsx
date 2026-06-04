import { useMemo, useState } from 'react';
import SeasonPrepSection from '../public/SeasonPrepSection';
import { usePublicStrings } from '../../lib/publicI18n';
import type { TripFilterId } from '../../lib/tripFilters';
import { filterListingTours, useTours } from '../../hooks/useTours';
import FlagshipTripCard from './FlagshipTripCard';
import StandardTripCard from './StandardTripCard';

const TRIP_FILTERS: { id: TripFilterId; labelKey: keyof ReturnType<typeof usePublicStrings> }[] = [
  { id: 'all', labelKey: 'filter_all' },
  { id: 'one_day', labelKey: 'filter_one_day' },
  { id: 'overnight', labelKey: 'filter_overnight' },
  { id: 'by_season', labelKey: 'filter_by_season' },
];

export default function TripListingSection() {
  const t = usePublicStrings();
  const { flagship, standard, loading, error } = useTours();
  const [tripFilter, setTripFilter] = useState<TripFilterId>('all');

  const filteredFlagship = useMemo(
    () => filterListingTours(flagship, tripFilter),
    [flagship, tripFilter],
  );
  const filteredStandard = useMemo(
    () => filterListingTours(standard, tripFilter),
    [standard, tripFilter],
  );

  const showSeasonPrep = tripFilter === 'by_season';
  const hasResults = filteredFlagship.length > 0 || filteredStandard.length > 0;

  return (
    <section id="tours" className="max-w-6xl mx-auto px-4 py-20">
      <div className="text-center mb-10">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold text-slate-900">{t.curated_journeys}</h2>
        <p className="text-slate-500 mt-2 text-sm">{t.tier_subtitle}</p>
        {error ? (
          <p className="text-xs text-red-700 mt-2">Live trips unavailable: {error}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {TRIP_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setTripFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tripFilter === f.id
                ? 'bg-neutral-950 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {t[f.labelKey]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-8">
          <div className="rounded-2xl bg-slate-100 h-[420px] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-slate-100 h-[360px] animate-pulse" />
            ))}
          </div>
        </div>
      ) : showSeasonPrep ? (
        <SeasonPrepSection />
      ) : !hasResults ? (
        <div className="max-w-xl mx-auto text-center py-12">
          <p className="text-slate-700 font-semibold">No trips match this filter.</p>
        </div>
      ) : (
        <div className="space-y-14 md:space-y-16">
          {filteredFlagship.length > 0 ? (
            <div className="space-y-8">
              {filteredFlagship.map((tour, idx) => (
                <FlagshipTripCard key={tour.trip_code} tour={tour} staggerIndex={idx} />
              ))}
            </div>
          ) : null}

          {filteredStandard.length > 0 ? (
            <div
              id="gallery"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10"
            >
              {filteredStandard.map((tour, idx) => (
                <StandardTripCard
                  key={tour.trip_code}
                  tour={tour}
                  staggerIndex={filteredFlagship.length + idx}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
