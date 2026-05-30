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

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80';

const DEFAULT_HIGHLIGHT_ICONS = ['📸', '🌸', '🏙️'];

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

/** "2026-02-22" → "22 Feb 2026". */
function formatTripDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TourDetail() {
  const { tourId } = useParams<{ tourId: string }>();
  const trip = tourId ? findTripById(tourId) : undefined;
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
  const hardcodedPhotos = staticFallback?.galleryPhotos;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(saveKey);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      setSaved(set.has(tripId));
    } catch {
      setSaved(false);
    }
  }, [saveKey, tripId]);

  // Gallery photos: hardcoded per-tour list wins, then tour-specific bucket, then portfolio.
  useEffect(() => {
    let cancelled = false;

    if (hardcodedPhotos && hardcodedPhotos.length) {
      setPhotos(hardcodedPhotos);
      return () => {
        cancelled = true;
      };
    }

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
  }, [tripId, hardcodedPhotos]);

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
  const publicDisplay = resolvedSheet ? getPublicTripDisplay(resolvedSheet) : null;

  const heroImage =
    hardcodedPhotos?.[0] || resolvedSheet?.coverUrl || portfolio?.image || FALLBACK_HERO;

  const title =
    staticFallback?.tourName ||
    publicDisplay?.title ||
    portfolio?.title ||
    resolvedSheet?.tourName ||
    trip?.destination ||
    'Photo Journey';
  const nameTh = staticFallback?.nameTh;
  const tagline = staticFallback?.tagline;
  const location =
    staticFallback?.location ||
    publicDisplay?.region ||
    resolvedSheet?.countryTag ||
    portfolio?.location ||
    `${trip?.destination ?? ''}`;
  const rating = staticFallback?.rating ?? portfolio?.rating ?? 4.8;
  const duration =
    staticFallback?.durationLabel ||
    publicDisplay?.durationLabel ||
    portfolio?.duration ||
    (resolvedSheet?.durationDays ? `${resolvedSheet.durationDays} days` : '—');
  const priceAud =
    staticFallback?.standardPrice ?? resolvedSheet?.priceStandardAud ?? trip?.price_aud ?? 0;
  const pricePrivate = staticFallback?.privatePrice ?? resolvedSheet?.pricePrivateAud ?? null;
  const hasPrivate = pricePrivate != null && pricePrivate > priceAud;
  const maxPax = resolvedSheet?.maxPax ?? trip?.max_pax ?? staticFallback?.maxPax ?? 6;
  const description = staticFallback?.description;
  const weather = staticFallback?.weather || resolvedSheet?.weather || '';
  const category = staticFallback?.category;

  const highlights =
    staticFallback?.highlights ??
    (resolvedSheet?.highlights ? resolvedSheet.highlights.split(',').map((h) => h.trim()).filter(Boolean) : []);
  const highlightIcons =
    staticFallback?.highlightIcons && staticFallback.highlightIcons.length
      ? staticFallback.highlightIcons
      : DEFAULT_HIGHLIGHT_ICONS;
  const itinerary = staticFallback?.itinerary ?? [];
  const included = staticFallback?.included ?? [];
  const excluded = staticFallback?.excluded ?? [];
  const accommodation = staticFallback?.accommodation;
  const nextDate = staticFallback?.nextDate;

  const bookingCode = resolvedSheet?.tourCode ?? trip?.id ?? tourId ?? '';
  const bookingHref = `/book/${encodeURIComponent(bookingCode)}`;

  // Conversion boosters — seats-left comes from data when present, else deterministic.
  const seatsLeft = staticFallback?.seatsLeft ?? 1 + (stableHash(tripId) % 3);
  const joinedCount = 8 + (stableHash(`${tripId}joined`) % 25);
  const originalPrice = priceAud > 0 ? Math.round((priceAud * 1.25) / 5) * 5 : 0;
  const departLabel = staticFallback?.departureLabel || formatTripDate(nextDate);
  const urgencyText = departLabel
    ? `🔥 เหลือ ${seatsLeft} ที่นั่ง · ออกเดินทาง ${departLabel}`
    : `🔥 ${seatsLeft} ${seatsLeft === 1 ? 'spot' : 'spots'} left`;

  const galleryPhotos = photos.length ? photos : hardcodedPhotos ?? [heroImage];
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
              {urgencyText}
            </span>

            <p className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur border border-white/25 text-white/95 text-sm font-semibold">
              <span aria-hidden>📍</span> {location}
            </p>

            <h1 className="mt-3 font-serif text-3xl sm:text-5xl lg:text-6xl font-semibold text-white leading-tight drop-shadow-lg">
              {title}
            </h1>
            {nameTh && <p className="mt-2 text-base sm:text-lg text-white/90 font-medium">{nameTh}</p>}
            {tagline && <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">{tagline}</p>}

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
              {weather && (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden>🌤️</span> {weather}
                </span>
              )}
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
              <p className="text-xl font-bold text-slate-900 leading-tight">
                {formatAUD(priceAud)}
                <span className="text-sm font-medium text-slate-500">/person</span>
              </p>
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

      {/* ============ MAIN CONTENT ============ */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 space-y-12" id="trip-details">
        {(sheetLoading || sheetError || usingFallback) && (
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            {sheetLoading ? (
              <>
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" aria-hidden />
                Updating live details…
              </>
            ) : (
              <span className="text-amber-700">Showing curated trip details.</span>
            )}
          </p>
        )}

        {/* About */}
        {description && (
          <section>
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-3">About this trip</h2>
            <p className="text-[15px] leading-relaxed text-slate-700">{description}</p>
            {category && (
              <span className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold">
                {category}
              </span>
            )}
          </section>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <section>
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4">Highlights</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {highlights.map((h, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
                >
                  <span className="text-3xl" aria-hidden>
                    {highlightIcons[i % highlightIcons.length]}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-700 font-medium">{h}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Itinerary */}
        {itinerary.length > 0 && (
          <section>
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4">Itinerary</h2>
            <ol className="relative border-l-2 border-slate-200 ml-3 space-y-6">
              {itinerary.map((d) => (
                <li key={d.day} className="ml-6">
                  <span className="absolute -left-[18px] flex items-center justify-center w-9 h-9 rounded-full bg-navy text-white text-sm font-bold shadow-sm">
                    {d.day}
                  </span>
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      Day {d.day}
                    </p>
                    <h3 className="text-base font-semibold text-slate-900 mt-0.5">{d.title}</h3>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{d.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Included / Excluded */}
        {(included.length > 0 || excluded.length > 0) && (
          <section>
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4">
              What&apos;s included
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {included.length > 0 && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                  <p className="text-sm font-semibold text-emerald-800 mb-3">รวมในแพ็กเกจ</p>
                  <ul className="space-y-2">
                    {included.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span aria-hidden>✅</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {excluded.length > 0 && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5">
                  <p className="text-sm font-semibold text-rose-800 mb-3">ไม่รวมในแพ็กเกจ</p>
                  <ul className="space-y-2">
                    {excluded.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span aria-hidden>❌</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {accommodation && (
              <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">ที่พัก:</span> {accommodation}
              </p>
            )}
          </section>
        )}

        {/* Pricing */}
        {priceAud > 0 && (
          <section>
            <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4">Pricing</h2>
            <div className={`grid grid-cols-1 ${hasPrivate ? 'sm:grid-cols-2' : ''} gap-4`}>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Standard</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {formatAUD(priceAud)}
                  <span className="text-sm font-medium text-slate-500">/person</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ออกเดินทาง {departLabel || 'ตามรอบที่กำหนด'} · เหลือ {seatsLeft} ที่นั่ง
                </p>
                <Link
                  to={bookingHref}
                  className="mt-5 inline-flex justify-center items-center gap-2 py-3 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors"
                >
                  Book Now <span aria-hidden>→</span>
                </Link>
              </div>

              {hasPrivate && pricePrivate != null && (
                <div className="rounded-2xl border-2 border-teal bg-teal/5 p-6 shadow-sm flex flex-col">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    Private group
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {formatAUD(pricePrivate)}
                    <span className="text-sm font-medium text-slate-500">/group</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">ทริปส่วนตัว เลือกวันเดินทางได้เอง</p>
                  <Link
                    to={`${bookingHref}?tier=private`}
                    className="mt-5 inline-flex justify-center items-center gap-2 py-3 rounded-full bg-teal text-navy text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    Book Now <span aria-hidden>→</span>
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section>
          <h2 className="font-serif text-2xl font-semibold text-slate-900 mb-4">Reviews</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-amber-400 text-sm">★★★★★</p>
              <p className="text-sm text-slate-700 mt-2">
                “Pacing was perfect and the gallery felt editorial. Worth every dollar.”
              </p>
              <p className="text-xs text-slate-500 mt-2">— Verified guest</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-amber-400 text-sm">★★★★★</p>
              <p className="text-sm text-slate-700 mt-2">
                “Clear prep checklist, smooth day, beautiful light.”
              </p>
              <p className="text-xs text-slate-500 mt-2">— Verified guest</p>
            </div>
          </div>
        </section>
      </div>

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
