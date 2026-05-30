import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicBottomNav from '../components/public/PublicBottomNav';
import { mergeTripsWithFallback, findTourFallbackByCode } from '../data/tours';
import { fetchTripsFromSheet, TripSheetRow } from '../lib/tripsSheetApi';
import MeetTheCrew from '../components/public/MeetTheCrew';
import TestimonialsSection from '../components/public/TestimonialsSection';
import MobileTripStack from '../components/public/MobileTripStack';
import PortfolioGallery from '../components/public/PortfolioGallery';
import LanguageToggle from '../components/i18n/LanguageToggle';
import { usePublicStrings } from '../lib/publicI18n';
import { filterTripsByCategory, TripFilterId } from '../lib/tripFilters';
import SeasonPrepSection from '../components/public/SeasonPrepSection';
import HeroSlideshowBackground from '../components/public/HeroSlideshowBackground';
import TourCard from '../components/public/TourCard';
import { useSavedTrips } from '../hooks/useSavedTrips';

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

const STATS = [
  { value: '400+', label: 'Destinations' },
  { value: '98%', label: 'Satisfaction' },
  { value: '120+', label: 'Guides' },
];

const FEATURES = [
  {
    title: 'Custom Itinerary',
    desc: 'Every Private Photo Journey is shaped around your group, light, and story.',
    icon: '✦',
  },
  {
    title: 'Visa & OSHC',
    desc: 'Compliance-ready support for international student travellers.',
    icon: '🛂',
  },
  {
    title: 'Expert Guides',
    desc: 'Led by working photographers — not generic mass-market trip operators.',
    icon: '📷',
  },
  {
    title: 'Sustainable',
    desc: 'Small groups, low impact, and respectful wildlife practices.',
    icon: '🌿',
  },
];

const TRIP_FILTERS: { id: TripFilterId; labelKey: keyof ReturnType<typeof usePublicStrings> }[] = [
  { id: 'all', labelKey: 'filter_all' },
  { id: 'one_day', labelKey: 'filter_one_day' },
  { id: 'overnight', labelKey: 'filter_overnight' },
  { id: 'by_season', labelKey: 'filter_by_season' },
];

export default function PublicPortfolio() {
  const t = usePublicStrings();
  const { saved, toggle: toggleSave } = useSavedTrips();
  const [trips, setTrips] = useState<TripSheetRow[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [tripError, setTripError] = useState<string | null>(null);
  const [tripFilter, setTripFilter] = useState<TripFilterId>('all');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingTrips(true);
      setTripError(null);
      try {
        const rows = await fetchTripsFromSheet();
        if (!cancelled) setTrips(mergeTripsWithFallback(rows));
      } catch (e) {
        if (!cancelled) {
          setTripError(e instanceof Error ? e.message : 'Could not load trips');
          setTrips(mergeTripsWithFallback([]));
        }
      } finally {
        if (!cancelled) setLoadingTrips(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const exploreHref = useMemo(() => {
    const first = trips[0];
    return first ? `/tours/${encodeURIComponent(first.tourCode)}` : '/';
  }, [trips]);

  const filteredTrips = useMemo(() => {
    const list = filterTripsByCategory(trips, tripFilter);
    // Flagship/featured trips lead the grid.
    return [...list].sort((a, b) => {
      const fa = findTourFallbackByCode(a.tourCode)?.featured ? 1 : 0;
      const fb = findTourFallbackByCode(b.tourCode)?.featured ? 1 : 0;
      return fb - fa;
    });
  }, [trips, tripFilter]);
  const showSeasonPrep = tripFilter === 'by_season';

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased pb-20">
      {/* Sticky nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="font-serif text-xl font-semibold text-slate-900 tracking-tight">
            Trip2Talk
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#tours" className="hover:text-emerald-600 transition-colors">
              Trips
            </a>
            <a href="#gallery" className="hover:text-emerald-600 transition-colors">
              Gallery
            </a>
            <a href="#reviews" className="hover:text-emerald-600 transition-colors">
              Reviews
            </a>
            <Link to="/about" className="hover:text-emerald-600 transition-colors">
              About
            </Link>
            <Link to="/contact" className="hover:text-emerald-600 transition-colors">
              Contact
            </Link>
            <a href="#pricing" className="hover:text-emerald-600 transition-colors">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />
            <Link
              to={exploreHref}
              className="px-4 py-2 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors shadow-sm"
            >
              Explore Now <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden bg-[#0d1b2a]">
        <HeroSlideshowBackground maxPhotos={20} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60 z-[3]" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
          <p className="flex items-center justify-center gap-2 text-sm font-medium mb-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span className="text-emerald-300 italic font-medium">Now booking Summer 2025</span>
          </p>
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-semibold leading-tight tracking-tight">
            Capture the World,
            <br />
            <span className="text-emerald-300 italic font-medium">One Journey</span>
          </h1>
          <div className="mt-6 max-w-xl mx-auto text-center">
            <p className="font-light text-lg text-white">
              Small group. Real light. Photos you'll actually keep.
            </p>
            <p className="font-light text-base text-gray-300 mt-2">
              ออกทริป · เก็บแสง · กลับมาพร้อมรูประดับ Premium
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button
              type="button"
              onClick={() => scrollToSection('tours')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-slate-900 text-white text-sm font-semibold tracking-wide shadow-lg shadow-black/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-300"
            >
              {t.view_all_trips}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('reviews')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-white/40 bg-transparent text-white text-sm font-semibold tracking-wide hover:bg-white/10 hover:border-white/60 transition-all duration-300"
            >
              {t.read_reviews}
            </button>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto border-t border-white/20 pt-8">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-serif text-2xl md:text-3xl font-semibold">{s.value}</p>
                <p className="text-xs text-white/70 mt-1 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PortfolioGallery title={t.portfolio_gallery} />

      {/* Trips */}
      <section id="tours" className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-10">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-slate-900">{t.curated_journeys}</h2>
          <p className="text-slate-500 mt-2 text-sm">{t.tier_subtitle}</p>
          {tripError && <p className="text-xs text-red-700 mt-2">Live trips unavailable: {tripError}</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
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
        {loadingTrips ? (
          <>
            <div className="md:hidden space-y-4 px-4">
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 w-28 rounded-full bg-slate-100 animate-pulse shrink-0" />
                ))}
              </div>
              <div className="rounded-[32px] bg-slate-100 h-[min(72vh,520px)] animate-pulse" />
            </div>
            <div id="gallery" className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 h-[360px] animate-pulse" />
              ))}
            </div>
          </>
        ) : trips.length === 0 ? (
          <div className="max-w-xl mx-auto text-center py-12">
            <p className="text-slate-700 font-semibold">No trips available right now.</p>
            <p className="text-sm text-slate-500 mt-2">Please check again soon.</p>
          </div>
        ) : showSeasonPrep ? (
          <SeasonPrepSection />
        ) : filteredTrips.length === 0 ? (
          <div className="max-w-xl mx-auto text-center py-12">
            <p className="text-slate-700 font-semibold">No trips match this filter.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <MobileTripStack trips={filteredTrips} saved={saved} onToggleSave={toggleSave} />
            <div id="gallery" className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrips.map((tour, idx) => (
                <TourCard
                  key={tour.tourCode}
                  tour={tour}
                  saved={saved.has(tour.tourCode)}
                  onToggleSave={() => toggleSave(tour.tourCode)}
                  large={idx === 0 && tripFilter === 'all'}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="bg-slate-50 border-y border-slate-100 py-20">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="text-center md:text-left">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-serif text-lg font-semibold text-slate-900 mt-3">{f.title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Meet the Crew — teaser */}
      <section className="max-w-6xl mx-auto px-4 py-20 md:py-28 border-t border-slate-100">
        <MeetTheCrew />
        <p className="text-center mt-12">
          <Link
            to="/about"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-emerald-700 transition-colors tracking-wide"
          >
            Full story on About <span aria-hidden>→</span>
          </Link>
        </p>
      </section>

      <TestimonialsSection />

      {/* Pricing */}
      <section id="pricing" className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">Simple pricing</h2>
        <div className="mt-8 grid sm:grid-cols-2 gap-4 text-left">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase text-emerald-600">Tier 1 Standard</p>
            <p className="font-serif text-xl mt-2">4–6 guests</p>
            <p className="text-sm text-slate-500 mt-1">List price per person</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
            <p className="text-xs font-semibold uppercase text-emerald-700">Tier 2 Private</p>
            <p className="font-serif text-xl mt-2">1–3 guests</p>
            <p className="text-sm text-slate-500 mt-1">Guaranteed Departure · premium rate</p>
          </div>
        </div>
        <Link to="/package-terms" className="inline-block mt-6 text-sm text-emerald-600 hover:underline">
          View package & cancellation terms →
        </Link>
      </section>

      {/* CTA */}
      <section className="mx-4 mb-20 rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white py-16 px-6 text-center">
        <h2 className="font-serif text-3xl md:text-4xl font-semibold max-w-xl mx-auto">
          Ready to frame your next chapter?
        </h2>
        <p className="mt-4 text-emerald-100/90 text-sm max-w-md mx-auto">
          Private Photo Journeys from Warrawee — not a mass-market escorted travel service (บริการนำเที่ยวทั่วไป).
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/tours/MEL-4D3N"
            className="px-6 py-3 rounded-full bg-white text-navy font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Explore trips <span aria-hidden>→</span>
          </Link>
          <Link
            to="/book/MEL-4D3N"
            className="px-6 py-3 rounded-full border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
          >
            Book this trip <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-500">
          <div className="text-center md:text-left">
            <p className="font-serif text-lg font-semibold text-slate-900">Trip2Talk</p>
            <p className="mt-1">Chapter 99 Photography</p>
            <p className="mt-1">ABN: XX XXX XXX XXX · Warrawee NSW 2074</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 font-medium" aria-label="Legal">
            <Link to="/terms" className="hover:text-teal">
              Photo delivery terms
            </Link>
            <Link to="/package-terms" className="hover:text-teal">
              Package &amp; cancellation terms
            </Link>
            <Link to="/portal" className="text-slate-400 hover:text-slate-600">
              Staff
            </Link>
          </nav>
        </div>
      </footer>

      <PublicBottomNav />
    </div>
  );
}
