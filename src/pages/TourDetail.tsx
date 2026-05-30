import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findTourFallbackByCode, tourFallbackToSheetRow } from '../data/tours';
import { findTripById } from '../lib/publicTours';
import { formatAUD } from '../lib/payidCalc';
import { PORTFOLIO_TOURS } from '../lib/portfolioTours';
import { supabase } from '../lib/supabase';
import { fetchShuffledMixedCover } from '../lib/galleryStorage';
import { fetchTripByCodeFromSheet, TripSheetRow } from '../lib/tripsSheetApi';
import { getPublicTripDisplay } from '../lib/publicTripDisplay';

type TourTab = 'details' | 'included' | 'reviews';

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80';

const AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&q=80&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&q=80&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&q=80&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&q=80&fit=crop&crop=faces',
];

function stableHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function TourDetail() {
  const { tourId } = useParams<{ tourId: string }>();
  const trip = tourId ? findTripById(tourId) : undefined;
  const [activeTab, setActiveTab] = useState<TourTab>('details');
  const [saved, setSaved] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [sheetTrip, setSheetTrip] = useState<TripSheetRow | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetLoading, setSheetLoading] = useState(true);

  // Hero parallax + cinematic gallery state
  const [scrollY, setScrollY] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [galleryPaused, setGalleryPaused] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);

  const staticFallback = tourId ? findTourFallbackByCode(tourId) : undefined;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!tourId) {
        setSheetLoading(false);
        return;
      }
      setSheetLoading(true);
      setSheetError(null);
      try {
        const row = await fetchTripByCodeFromSheet(tourId);
        if (!cancelled) setSheetTrip(row);
      } catch (e) {
        if (!cancelled) {
          setSheetError(e instanceof Error ? e.message : 'Could not load trip');
        }
      } finally {
        if (!cancelled) setSheetLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  const resolvedSheet = useMemo(() => {
    if (sheetTrip) return sheetTrip;
    if (staticFallback) return tourFallbackToSheetRow(staticFallback);
    return null;
  }, [sheetTrip, staticFallback]);

  const tripId = trip?.id ?? resolvedSheet?.tourCode ?? tourId ?? 'trip';
  const saveKey = useMemo(() => `t2t:savedTours:v1`, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(saveKey);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      setSaved(set.has(tripId));
    } catch {
      setSaved(false);
    }
  }, [saveKey, tripId]);

  // Gallery photos: tour-specific bucket first, then portfolio/ folders as fallback.
  useEffect(() => {
    let cancelled = false;

    async function loadPhotos() {
      try {
        const prefix = `${tripId}/`;
        const { data, error } = await supabase.storage.from('tour-photos').list(prefix, {
          limit: 24,
          sortBy: { column: 'name', order: 'asc' },
        });
        if (!error) {
          const urls =
            data
              ?.filter((f) => f.name && !f.name.endsWith('/'))
              .map(
                (f) =>
                  supabase.storage.from('tour-photos').getPublicUrl(`${prefix}${f.name}`).data
                    .publicUrl,
              ) ?? [];
          if (urls.length) {
            if (!cancelled) setPhotos(urls);
            return;
          }
        }
      } catch {
        // Ignore: bucket may be private or not created yet
      }

      // Fallback: pull from Supabase portfolio/ storage so the gallery is never empty.
      try {
        const portfolioUrls = await fetchShuffledMixedCover(12);
        if (!cancelled && portfolioUrls.length) setPhotos(portfolioUrls);
      } catch {
        // ignore
      }
    }

    void loadPhotos();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  // Reset gallery position whenever the photo set changes.
  useEffect(() => {
    setActiveSlide(0);
    slideRefs.current = [];
  }, [photos.length]);

  // Hero parallax — translate the hero image slower than the scroll.
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Gallery auto-play — advance every 5s, paused on hover/touch.
  useEffect(() => {
    const count = photos.length;
    if (galleryPaused || count < 2) return;
    const id = window.setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % count;
        const el = slideRefs.current[next];
        const container = galleryRef.current;
        if (el && container) {
          container.scrollTo({ left: el.offsetLeft - container.offsetLeft, behavior: 'smooth' });
        }
        return next;
      });
    }, 5000);
    return () => window.clearInterval(id);
  }, [galleryPaused, photos.length]);

  const usingFallback = Boolean(!sheetTrip && staticFallback && resolvedSheet);
  const hasContent = Boolean(trip || resolvedSheet);

  // Only block on the network when there is nothing to show yet.
  if (!hasContent && sheetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-red-600 font-sans">Trip not found.</p>
        <Link to="/" className="inline-block mt-4 text-teal text-sm">
          ← Back to journeys
        </Link>
      </div>
    );
  }

  const portfolio = trip
    ? PORTFOLIO_TOURS.find((t) => t.id === trip.id || t.id === tourId)
    : undefined;
  const heroImage = resolvedSheet?.coverUrl || portfolio?.image || FALLBACK_HERO;
  const publicDisplay = resolvedSheet ? getPublicTripDisplay(resolvedSheet) : null;
  const title =
    publicDisplay?.title || portfolio?.title || resolvedSheet?.tourName || trip?.destination || 'Photo Journey';
  const location =
    publicDisplay?.region || resolvedSheet?.countryTag || portfolio?.location || `${trip?.destination ?? ''}`;
  const rating = portfolio?.rating ?? 4.8;
  const duration =
    publicDisplay?.durationLabel ||
    portfolio?.duration ||
    (resolvedSheet?.durationDays ? `${resolvedSheet.durationDays} days` : '—');
  const priceAud =
    resolvedSheet?.priceStandardAud ?? trip?.price_aud ?? staticFallback?.standardPrice ?? 0;
  const maxPax = resolvedSheet?.maxPax ?? trip?.max_pax ?? staticFallback?.maxPax ?? 6;
  const description = staticFallback?.description;

  const bookingCode = resolvedSheet?.tourCode ?? trip?.id ?? tourId ?? '';
  const bookingHref = `/book/${encodeURIComponent(bookingCode)}`;

  // Conversion boosters (deterministic per-trip so they stay stable across renders).
  const spotsLeft = 1 + (stableHash(tripId) % 3); // 1–3
  const joinedCount = 8 + (stableHash(`${tripId}joined`) % 25); // 8–32
  const originalPrice = priceAud > 0 ? Math.round((priceAud * 1.25) / 5) * 5 : 0;

  const galleryPhotos = photos.length ? photos : [heroImage];
  const heroParallax = Math.min(scrollY * 0.4, 80);

  const toggleSave = () => {
    try {
      const raw = localStorage.getItem(saveKey);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      if (set.has(tripId)) set.delete(tripId);
      else set.add(tripId);
      localStorage.setItem(saveKey, JSON.stringify([...set]));
      setSaved(set.has(tripId));
    } catch {
      setSaved((s) => !s);
    }
  };

  const handleGalleryScroll = () => {
    const container = galleryRef.current;
    if (!container) return;
    let closest = 0;
    let min = Infinity;
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const d = Math.abs(el.offsetLeft - container.offsetLeft - container.scrollLeft);
      if (d < min) {
        min = d;
        closest = i;
      }
    });
    setActiveSlide(closest);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-24 md:pb-0">
      {/* ============ HERO — full-screen, parallax, overlay ============ */}
      <section className="relative h-screen min-h-[560px] overflow-hidden bg-slate-900">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={heroImage}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            fetchPriority="high"
            decoding="async"
            style={{
              transform: `translate3d(0, ${heroParallax}px, 0) scale(1.18)`,
              willChange: 'transform',
            }}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== FALLBACK_HERO) img.src = FALLBACK_HERO;
            }}
          />
        </div>

        {/* Gradient: transparent at top → black/70 at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        {/* Top bar: back + save */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-20">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 backdrop-blur border border-white/40 text-slate-900 text-sm font-semibold shadow-sm"
          >
            ← back
          </Link>
          <button
            type="button"
            onClick={toggleSave}
            className="w-11 h-11 rounded-full bg-white/90 backdrop-blur border border-white/40 flex items-center justify-center text-lg shadow-sm"
            aria-label={saved ? 'Unsave' : 'Save'}
          >
            {saved ? '❤️' : '🤍'}
          </button>
        </div>

        {/* Bottom-left overlay: urgency badge, location, title, rating */}
        <div className="absolute bottom-0 inset-x-0 z-10 px-5 pb-10 sm:px-8 sm:pb-14">
          <div className="max-w-3xl mx-auto w-full">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/90 backdrop-blur text-white text-xs font-bold shadow-lg animate-pulse">
              🔥 {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
            </span>

            <p className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur border border-white/25 text-white/95 text-sm font-semibold">
              <span aria-hidden>📍</span> {location}
            </p>

            <h1 className="mt-3 font-serif text-3xl sm:text-5xl lg:text-6xl font-semibold text-white leading-tight drop-shadow-lg">
              {title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-white/90 text-sm font-medium">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-amber-300">★</span> {rating.toFixed(1)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden>⏱</span> {duration}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden>👥</span> Max {maxPax}
              </span>
            </div>
          </div>
        </div>

        {/* Floating CTA — desktop, sticky on scroll */}
        <Link
          to={bookingHref}
          className="hidden md:inline-flex fixed bottom-6 right-6 z-50 items-center justify-center gap-2 px-7 py-4 rounded-full bg-teal text-navy font-bold text-base shadow-2xl shadow-black/30 hover:scale-105 transition-transform"
        >
          Book This Trip <span aria-hidden>→</span>
        </Link>
      </section>

      {/* ============ SOCIAL PROOF + PRICE ANCHOR ============ */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {AVATARS.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-9 h-9 rounded-full border-2 border-white object-cover"
                  loading="lazy"
                />
              ))}
              <span className="w-9 h-9 rounded-full border-2 border-white bg-navy text-white text-xs font-bold flex items-center justify-center">
                +{joinedCount}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{joinedCount} travelers</span> joined this trip
            </p>
          </div>

          {priceAud > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-400">
                {originalPrice > priceAud && (
                  <span className="line-through mr-1.5">{formatAUD(originalPrice)}</span>
                )}
                <span className="text-emerald-600 font-semibold">Limited offer</span>
              </p>
              <p className="text-xl font-bold text-slate-900 leading-tight">{formatAUD(priceAud)}<span className="text-sm font-medium text-slate-500">/person</span></p>
            </div>
          )}
        </div>
      </div>

      {/* ============ CINEMATIC GALLERY ============ */}
      <section className="py-8 bg-slate-50 overflow-hidden">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 flex items-center justify-between mb-4">
          <h2 className="font-serif text-2xl font-semibold text-slate-900">Gallery</h2>
          <p className="text-xs text-slate-400">Swipe to explore →</p>
        </div>

        <div className="relative">
          <div
            ref={galleryRef}
            onScroll={handleGalleryScroll}
            onMouseEnter={() => setGalleryPaused(true)}
            onMouseLeave={() => setGalleryPaused(false)}
            onTouchStart={() => setGalleryPaused(true)}
            className="flex gap-4 overflow-x-auto px-5 sm:px-8 pb-4 scrollbar-none"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
          >
            {galleryPhotos.map((src, idx) => {
              const isActive = idx === activeSlide;
              return (
                <div
                  key={`${src}-${idx}`}
                  ref={(el) => (slideRefs.current[idx] = el)}
                  className="relative flex-shrink-0 w-[80vw] max-w-[680px] h-[60vh] max-h-[520px] rounded-2xl overflow-hidden shadow-xl shadow-black/10"
                  style={{ scrollSnapAlign: 'center' }}
                >
                  <img
                    src={src}
                    alt=""
                    loading={idx < 2 ? 'eager' : 'lazy'}
                    className="absolute inset-0 w-full h-full object-cover transition-transform ease-out"
                    style={{
                      transform: isActive ? 'scale(1.12)' : 'scale(1)',
                      transitionDuration: '5000ms',
                    }}
                  />
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Slide counter */}
          {galleryPhotos.length > 1 && (
            <div className="max-w-3xl mx-auto px-5 sm:px-8 -mt-1">
              <div className="flex justify-end">
                <span className="px-3 py-1 rounded-full bg-slate-900/85 text-white text-xs font-semibold tracking-wide">
                  {activeSlide + 1} / {galleryPhotos.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============ DETAILS CARD (tabs) ============ */}
      <section className="max-w-2xl mx-auto px-4 py-8" id="trip-details">
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5">
          {sheetLoading && (
            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" aria-hidden />
              Updating live details…
            </p>
          )}
          {!sheetLoading && (sheetError || usingFallback) && (
            <p className="text-xs text-amber-700 mb-2">
              {sheetError
                ? 'Live sheet unavailable — showing curated trip details.'
                : 'Showing curated trip details.'}
            </p>
          )}

          <div className="flex gap-2">
            {(
              [
                ['details', 'Details'],
                ['included', "What's Included"],
                ['reviews', 'Reviews'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  activeTab === key ? 'bg-navy text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {activeTab === 'details' && (
              <div className="text-sm text-slate-700 leading-relaxed space-y-3">
                <p>
                  {description ||
                    'A Private Photo Journey designed around light and pacing — small group, calm schedule, and a finished .JPG delivery.'}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {trip?.start_date && trip?.end_date
                    ? `${trip.start_date} → ${trip.end_date} · ${trip.trip_code}`
                    : resolvedSheet?.tourCode}
                </p>

                {resolvedSheet?.spots?.length ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Spots</p>
                    {resolvedSheet.spots.slice(0, 4).map((s, idx) => (
                      <div key={`${s.spotName}-${idx}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-900">{s.spotName || `Spot ${idx + 1}`}</p>
                        {s.proTip && <p className="text-sm text-slate-600 mt-1">Pro tip: {s.proTip}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {s.mapsUrl && (
                            <a
                              href={s.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-emerald-700 hover:underline"
                            >
                              Open maps →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === 'included' && (
              <ul className="text-sm text-slate-700 space-y-2">
                <li>✓ Private photo guide</li>
                <li>✓ Finished .JPG delivery (no RAW)</li>
                <li>✓ Trip briefing + safety checklist</li>
              </ul>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-amber-400 text-sm">★★★★★</p>
                  <p className="text-sm text-slate-700 mt-2">
                    “Pacing was perfect and the gallery felt editorial. Worth every dollar.”
                  </p>
                  <p className="text-xs text-slate-500 mt-2">— Verified guest</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-amber-400 text-sm">★★★★★</p>
                  <p className="text-sm text-slate-700 mt-2">“Clear prep checklist, smooth day, beautiful light.”</p>
                  <p className="text-xs text-slate-500 mt-2">— Verified guest</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ STICKY BOOKING BAR — mobile ============ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-slate-100">
        <div className="px-4 h-16 flex items-center gap-3">
          <Link
            to={bookingHref}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-teal text-navy font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Book {bookingCode || 'this trip'} — {priceAud > 0 ? formatAUD(priceAud) : 'enquire'}{' '}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
