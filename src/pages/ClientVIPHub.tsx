import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import WeatherPill from '../components/shared/WeatherPill';
import { pickupShortLabel } from '../lib/pickup-options';
import {
  fetchCustomerBookingByIdFromSheet,
  fetchTripByCodeFromSheet,
  logConsentToSheet,
  TripSheetRow,
} from '../lib/tripsSheetApi';
import ItineraryTimeline from '../components/client/ItineraryTimeline';
import { fetchCityWeather } from '../lib/weather';

type TabId = 'pass' | 'portrait' | 'landscape';

type BookingSheet = { bookingId: string; customerName: string; tourCode: string };

function Pill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${
        active ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]' : 'bg-white text-[#1C1C1E] border-sage-100'
      }`}
    >
      {children}
    </button>
  );
}

function SoftCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-[28px] border border-sage-100 shadow-sm overflow-hidden">{children}</div>;
}

function parseWeather(input: string | undefined): { temp: number; condition: 'sunny' | 'cloudy' | 'rainy'; label: string } {
  const raw = (input ?? '').trim();
  const m = raw.match(/(-?\d+)\s*°?\s*c/i);
  const temp = m ? Number(m[1]) : 24;
  const lower = raw.toLowerCase();
  const condition: 'sunny' | 'cloudy' | 'rainy' =
    lower.includes('rain') || raw.includes('🌧') ? 'rainy' : lower.includes('cloud') || raw.includes('☁') ? 'cloudy' : 'sunny';
  return { temp: Number.isFinite(temp) ? temp : 24, condition, label: raw || 'Weather' };
}

function SwipeCheckIn({
  onChecked,
  disabled,
}: {
  onChecked: () => Promise<void>;
  disabled?: boolean;
}) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);

  const activate = async () => {
    if (busy || checked || disabled) return;
    setBusy(true);
    try {
      await onChecked();
      setChecked(true);
      setPct(100);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={activate}
      disabled={busy || checked || disabled}
      className={`w-full mt-3 rounded-full px-4 py-2.5 border transition-colors ${
        checked ? 'bg-sage-700/10 border-sage-200' : 'bg-white/15 border-white/25'
      }`}
    >
      <div className="relative h-10 rounded-full overflow-hidden">
        <div
          className={`absolute inset-0 transition-all duration-500 ${checked ? 'bg-sage-700/30' : 'bg-white/15'}`}
          style={{ width: `${pct || (checked ? 100 : 0)}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-semibold ${checked ? 'text-white' : 'text-white'}`}>
            {checked ? 'Checked in — pass active!' : busy ? 'Activating…' : 'Swipe to check-in (tap)'}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function ClientVIPHubPage() {
  const { bookingRef, bookingId } = useParams<{ bookingRef?: string; bookingId?: string }>();
  const resolvedBookingId = (bookingId || bookingRef || '').trim();

  const [tab, setTab] = useState<TabId>('pass');
  const [booking, setBooking] = useState<BookingSheet | null>(null);
  const [trip, setTrip] = useState<TripSheetRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [liveWeather, setLiveWeather] = useState<{ tempC: number; condition: 'sunny' | 'cloudy' | 'rainy'; city: string } | null>(
    null
  );

  const messengerUrl =
    trip?.messengerUrl?.trim() || 'https://m.me/trip2talk.chapter99';

  const cover = useMemo(() => {
    return trip?.coverUrl?.trim() || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80';
  }, [trip?.coverUrl]);

  const weather = useMemo(() => parseWeather(trip?.weather), [trip?.weather]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!trip?.city?.trim()) return;
      try {
        const w = await fetchCityWeather(trip.city.trim());
        if (!cancelled) setLiveWeather(w ? { tempC: w.tempC, condition: w.condition, city: w.city } : null);
      } catch {
        if (!cancelled) setLiveWeather(null);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [trip?.city]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!resolvedBookingId) return;
      setLoading(true);
      setError(null);
      try {
        const b = await fetchCustomerBookingByIdFromSheet(resolvedBookingId);
        if (!b) throw new Error('Booking not found');
        const t = await fetchTripByCodeFromSheet(b.tourCode);
        if (!t) throw new Error('Trip not found for this booking');
        if (cancelled) return;
        setBooking({ bookingId: b.bookingId, customerName: b.customerName, tourCode: b.tourCode });
        setTrip(t);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Load failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [resolvedBookingId]);

  const greetingName = booking?.customerName?.trim() || 'friend';

  const tripCode = trip?.tourCode ?? booking?.tourCode ?? 'TRIP';
  const destination = trip?.countryTag || 'Trip2Talk';
  const tripTitle = trip?.tourName || `${destination} Photo Journey`;
  const pax = 1;
  const pickup = pickupShortLabel(null);
  const depart = '—';

  const doCheckIn = async () => {
    if (!booking) throw new Error('Booking not loaded');
    const now = new Date().toISOString();
    await logConsentToSheet({
      timestampIso: now,
      bookingId: booking.bookingId,
      customerName: booking.customerName,
      tourCode: booking.tourCode,
      consentStatus: 'CHECKED_IN',
    });
    setCheckedIn(true);
  };

  if (!resolvedBookingId) {
    return (
      <div className="min-h-screen bg-sage-50 text-[#1C1C1E] px-4 py-16">
        <div className="max-w-lg mx-auto text-center bg-white rounded-[28px] border border-sage-100 p-6">
          <p className="text-sm text-[#9A9A9A]">Booking ID not found.</p>
          <Link to="/" className="text-sm mt-4 inline-block font-semibold text-sage-700 hover:underline">
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sage-50 text-[#1C1C1E] pb-28">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[#9A9A9A] font-medium">Hi,</p>
            <h1 className="text-[22px] font-bold leading-tight">
              {greetingName} <span aria-hidden>👋</span>
            </h1>
          </div>
          <WeatherPill
            temp={liveWeather?.tempC ?? weather.temp}
            city={liveWeather?.city ?? trip?.city ?? 'Weather'}
            condition={liveWeather?.condition ?? weather.condition}
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9A9A9A]">{destination}</p>
          <p className="text-[22px] font-bold leading-snug mt-1">{tripTitle}</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Pill active={tab === 'pass'} onClick={() => setTab('pass')}>
            Pass &amp; Consent
          </Pill>
          <Pill active={tab === 'portrait'} onClick={() => setTab('portrait')}>
            Portrait Poses
          </Pill>
          <Pill active={tab === 'landscape'} onClick={() => setTab('landscape')}>
            Landscape Guide
          </Pill>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-[#9A9A9A]">Loading…</p>}

        {tab === 'pass' && (
          <div className="space-y-4">
            <SoftCard>
              <div className="relative">
                <img src={cover} alt="" className="w-full h-[320px] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />

                <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
                  <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur border border-white/25 text-white text-xs font-semibold">
                    Photo Pass
                  </div>
                  <div className="bg-white rounded-2xl px-3 py-2 border border-sage-100 shadow-sm">
                    <p className="text-[11px] text-[#9A9A9A] font-medium">Days</p>
                    <p className="text-[18px] font-bold text-[#1C1C1E] leading-none">{trip?.durationDays ?? 1}</p>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-[20px] font-bold leading-snug">{tripCode}</p>
                  <p className="text-sm text-white/80 mt-0.5">{destination}</p>

                  <SwipeCheckIn onChecked={doCheckIn} disabled={checkedIn || loading} />

                  {checkedIn && (
                    <div className="mt-3 bg-sage-700/20 border border-sage-200/30 text-white rounded-2xl px-4 py-3 text-sm font-semibold">
                      Checked in — pass active!
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4">
                <p className="text-[11px] text-[#9A9A9A] text-center">
                  Checking in confirms details &amp; travel policy{' '}
                  <Link to="/terms" className="underline underline-offset-2 hover:text-sage-700">
                    Read T&amp;Cs
                  </Link>
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white border border-sage-100 px-3 py-2">
                    <p className="text-[10px] uppercase text-[#9A9A9A] font-semibold">Guests</p>
                    <p className="text-sm font-bold">{pax}</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-sage-100 px-3 py-2">
                    <p className="text-[10px] uppercase text-[#9A9A9A] font-semibold">Pickup</p>
                    <p className="text-sm font-bold truncate" title={pickup}>
                      {pickup}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white border border-sage-100 px-3 py-2">
                    <p className="text-[10px] uppercase text-[#9A9A9A] font-semibold">Depart</p>
                    <p className="text-sm font-bold truncate" title={depart}>
                      {depart}
                    </p>
                  </div>
                </div>
              </div>
            </SoftCard>

            {(trip?.durationDays ?? 1) > 1 && (trip?.itinerary?.length ?? 0) > 0 && (
              <>
                <ItineraryTimeline days={trip?.itinerary ?? []} title="Travel Timeline" />

                {(trip?.dormitoryPolicy?.trim() || trip?.dormUpgradeNote?.trim()) && (
                  <div className="bg-white rounded-[28px] border border-sage-100 shadow-sm p-4">
                    <p className="text-[11px] uppercase tracking-wide text-[#9A9A9A] font-semibold">Accommodation</p>
                    <p className="mt-2 text-[15px] leading-[1.75] text-[#1C1C1E] whitespace-pre-wrap">
                      {trip?.dormitoryPolicy?.trim() || 'Dormitory/shared room policy will be provided.'}
                    </p>
                    {trip?.dormUpgradeNote?.trim() && (
                      <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-600">{trip.dormUpgradeNote.trim()}</p>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-[18px] border border-sage-200 px-4 py-3 text-sm font-semibold text-[#1C1C1E] hover:bg-[#1C1C1E] hover:text-white transition-colors"
                        >
                          Request upgrade
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'portrait' && (
          <div className="space-y-4">
            {(trip?.spots ?? []).map((spot, idx) => (
              <SoftCard key={`${spot.spotName}-${idx}`}>
                <img src={spot.photoUrl || cover} alt="" className="w-full h-[200px] object-cover" />
                <div className="p-4 space-y-3">
                  <p className="text-[10px] uppercase tracking-wide text-[#9A9A9A] font-semibold">
                    Stop {String(idx + 1).padStart(2, '0')} · Portrait Guide
                  </p>
                  <p className="text-[18px] font-bold">{spot.spotName}</p>

                  <div className="border-l-4 border-sage-700 bg-sage-50 px-3 py-2 rounded-2xl">
                    <p className="text-sm text-[#1C1C1E]">
                      <span className="font-semibold text-sage-700">P'Saen Pro‑Tip:</span> {spot.proTip || '—'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-pink-light border border-[#F4C0D1] p-3 space-y-2">
                    <div className="rounded-2xl bg-white/60 border border-[#F4C0D1] px-3 py-2 text-sm text-[#993556] whitespace-pre-wrap">
                      {spot.portraitGuide || '—'}
                    </div>
                  </div>

                  {spot.mapsUrl ? (
                    <a
                      href={spot.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center rounded-[18px] border border-sage-200 px-4 py-3 text-sm font-semibold text-[#1C1C1E] hover:bg-[#1C1C1E] hover:text-white transition-colors"
                    >
                      📍 View in Maps
                    </a>
                  ) : null}
                </div>
              </SoftCard>
            ))}
          </div>
        )}

        {tab === 'landscape' && (
          <div className="space-y-4">
            {(trip?.spots ?? []).map((spot, idx) => (
              <SoftCard key={`${spot.spotName}-${idx}`}>
                <img src={spot.photoUrl || cover} alt="" className="w-full h-[200px] object-cover" />
                <div className="p-4 space-y-3">
                  <p className="text-[10px] uppercase tracking-wide text-[#9A9A9A] font-semibold">
                    Stop {String(idx + 1).padStart(2, '0')} · Landscape Guide
                  </p>
                  <p className="text-[18px] font-bold">{spot.spotName}</p>

                  <div className="rounded-2xl bg-[#E6F1FB] border border-[#B5D4F4] p-3 space-y-2">
                    <div className="text-sm text-[#0C447C] whitespace-pre-wrap">{spot.landscapeGuide || '—'}</div>
                  </div>

                  {spot.mapsUrl ? (
                    <a
                      href={spot.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center rounded-[18px] border border-sage-200 px-4 py-3 text-sm font-semibold text-[#1C1C1E] hover:bg-[#1C1C1E] hover:text-white transition-colors"
                    >
                      📍 View in Maps
                    </a>
                  ) : null}
                </div>
              </SoftCard>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-sage-50/95 backdrop-blur border-t border-sage-100 px-5 pt-3 pb-5">
        <p className="text-[12px] text-[#9A9A9A] text-center mb-2">
          เตรียมตัวพร้อมแล้ว ไปจอยกลุ่มเม้าท์มอยและอัปเดตแพลนทริปกัน!
        </p>
        <a
          href={messengerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-3 bg-messenger text-white rounded-[18px] px-4 py-3.5 font-semibold"
        >
          <span
            className="w-8 h-8 rounded-full"
            style={{ background: 'linear-gradient(135deg, #00c6ff, #0a7cff, #a033ff)' }}
            aria-hidden
          />
          กดเข้ากลุ่ม Facebook Messenger ของทริปนี้
        </a>
      </div>
    </div>
  );
}
