import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findTourFallbackByCode, tourFallbackToSheetRow } from '../data/tours';
import { findTripById } from '../lib/publicTours';
import { formatAUD } from '../lib/payidCalc';
import { PORTFOLIO_TOURS } from '../lib/portfolioTours';
import { supabase } from '../lib/supabase';
import { fetchTripByCodeFromSheet, TripSheetRow } from '../lib/tripsSheetApi';
import { getPublicTripDisplay } from '../lib/publicTripDisplay';

type TourTab = 'details' | 'included' | 'reviews';

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80';

export default function TourDetail() {
  const { tourId } = useParams<{ tourId: string }>();
  const trip = tourId ? findTripById(tourId) : undefined;
  const [activeTab, setActiveTab] = useState<TourTab>('details');
  const [saved, setSaved] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [sheetTrip, setSheetTrip] = useState<TripSheetRow | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetLoading, setSheetLoading] = useState(true);

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

  const usingFallback = Boolean(!sheetTrip && staticFallback && resolvedSheet);

  if (sheetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!trip && !resolvedSheet) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-red-600 font-sans">Trip not found.</p>
        <Link to="/" className="inline-block mt-4 text-teal text-sm">
          ← Back to journeys
        </Link>
      </div>
    );
  }

  const tripId = trip?.id ?? resolvedSheet?.tourCode ?? tourId ?? 'trip';

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

  useEffect(() => {
    let cancelled = false;

    async function loadPhotos() {
      try {
        const prefix = `${tripId}/`;
        const { data, error } = await supabase.storage.from('tour-photos').list(prefix, {
          limit: 24,
          sortBy: { column: 'name', order: 'asc' },
        });
        if (error) return;
        const urls =
          data
            ?.filter((f) => f.name && !f.name.endsWith('/'))
            .map((f) => supabase.storage.from('tour-photos').getPublicUrl(`${prefix}${f.name}`).data.publicUrl) ??
          [];
        if (!cancelled) setPhotos(urls);
      } catch {
        // Ignore: bucket may be private or not created yet
      }
    }

    loadPhotos();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

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

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-24">
      <section className="relative h-[55vh] min-h-[360px] overflow-hidden">
        <img src={heroImage} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 backdrop-blur border border-white/40 text-slate-900 text-sm font-semibold"
          >
            ← back
          </Link>
          <button
            type="button"
            onClick={toggleSave}
            className="w-11 h-11 rounded-full bg-white/90 backdrop-blur border border-white/40 flex items-center justify-center text-lg"
            aria-label={saved ? 'Unsave' : 'Save'}
          >
            {saved ? '❤️' : '🤍'}
          </button>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-4 -mt-10 relative z-20">
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5">
          <p className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700">
            <span aria-hidden>📍</span> {location}
          </p>

          <h1 className="mt-3 text-[24px] leading-snug font-semibold text-slate-900">{title}</h1>
          {(sheetError || usingFallback) && (
            <p className="text-xs text-amber-700 mt-2">
              {sheetError
                ? 'Live sheet unavailable — showing curated trip details.'
                : 'Showing curated trip details.'}
            </p>
          )}

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span aria-hidden>⏱</span> Duration
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-1">{duration}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span aria-hidden>👥</span> Max Pax
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-1">{maxPax}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span aria-hidden>⭐</span> Rating
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-1">{rating.toFixed(1)}</p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
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

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-semibold text-slate-900">Gallery</h2>
            <p className="text-xs text-slate-500">Supabase Storage: `tour-photos/{tripId}/`</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 pr-2">
            {(photos.length ? photos : [heroImage]).map((src, idx) => (
              <img
                key={`${src}-${idx}`}
                src={src}
                alt=""
                className="h-40 w-64 object-cover rounded-2xl border border-slate-100 flex-shrink-0"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/92 backdrop-blur border-t border-slate-100">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">From</p>
            <p className="text-lg font-semibold text-slate-900">{formatAUD(priceAud)}/person</p>
          </div>
          <Link
            to={`/book/${encodeURIComponent(resolvedSheet?.tourCode ?? trip?.id ?? tourId ?? '')}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-teal text-navy font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Book this trip <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
