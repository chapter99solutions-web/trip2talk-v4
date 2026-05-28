import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import WeatherPill from '../components/shared/WeatherPill';
import ItineraryTimeline from '../components/client/ItineraryTimeline';
import {
  ActiveTripHomeScreen,
  PassConsentScreen,
  TripDetailGroupScreen,
  TripExplorerStackScreen,
} from '../components/dashboard/SoftDashboardScreens';
import { fetchCityWeather } from '../lib/weather';
import {
  fetchCustomerBookingByBookingIdOrPhone,
  fetchTripByCodeFromSheet,
  logConsentToSheet,
  TripSheetRow,
} from '../lib/tripsSheetApi';

type TabId = 'home' | 'pass' | 'itinerary' | 'profile';

type Session = {
  query: string;
  bookingId: string;
  customerName: string;
  tourCode: string;
};

const SESSION_KEY = 't2t_client_portal_session_v1';

function SoftCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-[28px] border border-sage-100 shadow-sm overflow-hidden">{children}</div>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white border border-sage-100 px-3 py-1.5 text-xs font-semibold text-[#1C1C1E] shadow-sm">
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-full bg-[#1C1C1E] text-white font-semibold tracking-wide py-3.5 hover:-translate-y-0.5 transition-all"
    >
      {children}
    </button>
  );
}

function PortalNav({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  const items: Array<{ id: TabId; label: string; icon: string }> = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'pass', label: 'Pass', icon: '🎟️' },
    { id: 'itinerary', label: 'Trip', icon: '🗺️' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/92 backdrop-blur border-t border-sage-100">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
        {items.map((it) => {
          const active = it.id === tab;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange(it.id)}
              className="flex flex-col items-center justify-center gap-1 w-16"
              aria-current={active ? 'page' : undefined}
            >
              <span className={`text-lg leading-none ${active ? 'text-[#1C1C1E]' : 'text-[#9A9A9A]'}`} aria-hidden>
                {it.icon}
              </span>
              <span className={`text-[10px] font-semibold ${active ? 'text-[#1C1C1E]' : 'text-[#9A9A9A]'}`}>
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function buildHighlights(trip: TripSheetRow | null): string[] {
  const tags: string[] = [];
  if (!trip) return tags;
  const name = (trip.tourName || trip.tourCode).toLowerCase();
  const hasNight = trip.itinerary?.some((d) => (d.night || '').toLowerCase().includes('milky') || (d.night || '').includes('ทางช้างเผือก'));
  if (hasNight || name.includes('milky') || name.includes('aurora')) tags.push('🌌 Milky Way Hunt');
  tags.push('📸 Portrait Pro');
  if ((trip.durationDays || 1) > 1) tags.push('🚗 Road Trip');
  return tags.slice(0, 3);
}

function SpotCard({ spot }: { spot: { spotName: string; mapsUrl: string; photoUrl: string } }) {
  return (
    <div className="rounded-[28px] overflow-hidden border border-sage-100 bg-white shadow-sm">
      <div className="relative aspect-[16/10] bg-sage-50">
        {spot.photoUrl ? (
          <img src={spot.photoUrl} alt={spot.spotName} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : null}
        <button
          type="button"
          className="absolute top-3 right-3 backdrop-blur-md bg-white/20 rounded-full p-2 text-lg leading-none shadow-sm"
          aria-label="Star"
        >
          ☆
        </button>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <p className="absolute bottom-3 left-3 right-3 text-white font-semibold">{spot.spotName}</p>
      </div>
      <div className="p-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#1C1C1E]">Signature spot</span>
        {spot.mapsUrl ? (
          <a
            href={spot.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-sage-700 hover:underline"
          >
            📍 Open Maps
          </a>
        ) : (
          <span className="text-xs text-[#9A9A9A]">📍 Open Maps</span>
        )}
      </div>
    </div>
  );
}

function OneDayPlanCard({
  title,
  morning,
  afternoon,
  evening,
}: {
  title?: string;
  morning: string;
  afternoon: string;
  evening: string;
}) {
  return (
    <div className="rounded-[28px] border border-sage-100 bg-white shadow-sm overflow-hidden">
      <div className="p-5">
        <p className="text-[11px] font-semibold tracking-[0.25em] text-[#9A9A9A] uppercase">Itinerary</p>
        <h3 className="mt-1 text-[18px] font-bold text-[#1C1C1E]">{title ?? 'One-day plan'}</h3>
      </div>
      <div className="border-t border-sage-100 p-5 space-y-4">
        <div className="flex gap-3">
          <span className="w-9 h-9 rounded-2xl bg-sage-50 border border-sage-100 flex items-center justify-center shrink-0" aria-hidden>
            🌤️
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-[#9A9A9A] font-semibold">Morning</p>
            <p className="text-[14px] leading-[1.7] text-[#1C1C1E] whitespace-pre-wrap">{morning}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="w-9 h-9 rounded-2xl bg-sage-50 border border-sage-100 flex items-center justify-center shrink-0" aria-hidden>
            🚗
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-[#9A9A9A] font-semibold">Afternoon</p>
            <p className="text-[14px] leading-[1.7] text-[#1C1C1E] whitespace-pre-wrap">{afternoon}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="w-9 h-9 rounded-2xl bg-sage-50 border border-sage-100 flex items-center justify-center shrink-0" aria-hidden>
            📸
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-[#9A9A9A] font-semibold">Evening</p>
            <p className="text-[14px] leading-[1.7] text-[#1C1C1E] whitespace-pre-wrap">{evening}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SwipeCheckIn({ onChecked, disabled }: { onChecked: () => Promise<void>; disabled?: boolean }) {
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
      className={`w-full rounded-full px-4 py-2.5 border transition-colors ${
        checked ? 'bg-sage-700/10 border-sage-200' : 'bg-white border-sage-100'
      }`}
    >
      <div className="relative h-10 rounded-full overflow-hidden">
        <div
          className={`absolute inset-0 transition-all duration-500 ${checked ? 'bg-sage-700/25' : 'bg-sage-50'}`}
          style={{ width: `${pct || (checked ? 100 : 0)}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-[#1C1C1E]">
            {checked ? 'Checked in — pass active!' : busy ? 'Activating…' : 'Swipe to Check-In & Activate Your Photo Pass (tap)'}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function ClientPortal() {
  const location = useLocation();
  const [tab, setTab] = useState<TabId>('home');
  const [query, setQuery] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [trip, setTrip] = useState<TripSheetRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<{ tempC: number; condition: 'sunny' | 'cloudy' | 'rainy'; city: string } | null>(null);

  const uiPreview = useMemo(() => new URLSearchParams(location.search).get('ui') === '1', [location.search]);

  const highlights = useMemo(() => buildHighlights(trip), [trip]);

  // UI Preview Mode (bypass auth entirely)
  if (uiPreview) {
    const previewTrip: TripSheetRow = {
      tourCode: 'MEL-4D3N',
      tourName: 'The Sounds of Nature',
      countryTag: 'AU · Melbourne',
      weather: '15°C ☀️',
      messengerUrl: 'https://m.me/trip2talk.chapter99',
      coverUrl: 'https://images.unsplash.com/photo-1469854523086-cc02afe5c88?w=1400&q=85&auto=format&fit=crop',
      spots: [
        {
          spotName: 'Signature Lookout',
          proTip: 'Golden hour + soft breeze',
          mapsUrl: 'https://maps.google.com',
          photoUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1400&q=85&auto=format&fit=crop',
          portraitGuide: 'Editorial portrait framing',
          landscapeGuide: 'Wide + layered depth',
        },
      ],
      seasonGroup: 'seasonal',
      city: 'Melbourne',
      durationDays: 7,
      priceStandardAud: null,
      pricePrivateAud: null,
      categoryCode: 'MEL-4D3N',
      categoryName: 'Road Trip',
      basePriceAud: 1550,
      depositAud: 100,
      dormitoryPolicy: 'Dorm setup (budget) · Upgrade available',
      dormUpgradeNote: 'Upgrade to private room: +A$350–$550 (subject to availability)',
      itinerary: [],
      departureStart: '2026-05-08',
      departureEnd: '2026-05-15',
      slotsBooked: 8,
      slotsMax: 10,
    };

    const previewSession: Session = {
      query: 'ui',
      bookingId: 'BK-PREVIEW',
      customerName: 'Saen',
      tourCode: previewTrip.tourCode,
    };

    const previewHighlights = buildHighlights(previewTrip).map((t) => {
      const m = t.match(/^(\S+)\s+(.*)$/);
      return { icon: m?.[1] ?? '✦', label: m?.[2] ?? t };
    });

    const durationLabel = '7 days';
    const capacityLabel = '8/10';
    const countryTag = '🇦🇺 AU · MELBOURNE';

    return (
      <div className="min-h-screen bg-sage-50 text-[#1C1C1E] font-sans antialiased">
        <div className="max-w-md mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-[#9A9A9A]">UI Preview Mode</p>
          <Link to="/dashboard" className="text-xs font-semibold text-sage-700 hover:underline">
            Exit
          </Link>
        </div>

        {tab === 'home' ? (
          <ActiveTripHomeScreen
            name={previewSession.customerName}
            tempC={15}
            tags={previewHighlights}
            heroImageUrl={previewTrip.coverUrl}
            tripTitle={previewTrip.tourName}
            tripSubtitle="Private Photo Journey · premium edit"
            durationLabel={durationLabel}
            distanceLabel="10 km"
            capacityLabel={capacityLabel}
            onStartTrip={() => setTab('pass')}
          />
        ) : tab === 'itinerary' ? (
          <TripDetailGroupScreen
            bannerUrl={previewTrip.coverUrl}
            countryTag={countryTag}
            title="Discovering the Magic of Austrian Mountains"
            metaLeft={durationLabel}
            metaRight={capacityLabel}
            hotelName="Hotel / Accommodation"
            hotelNote="Floating details card — calm, minimal, editorial spacing."
          />
        ) : tab === 'profile' ? (
          <TripExplorerStackScreen
            heading="Popular"
            datePills={[
              { id: 'p1', label: '27/03 - 7/04' },
              { id: 'p2', label: '10/04 - 15/04' },
              { id: 'p3', label: '21/04 - 27/04' },
            ]}
            heroCards={[
              {
                id: 'c1',
                imageUrl: previewTrip.coverUrl,
                badge: '🇦🇺 TASMANIA',
                title: 'First Snow Hunt',
                meta: '7 days • 10 km • 8/10',
              },
              {
                id: 'c2',
                imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1400&q=85&auto=format&fit=crop',
                badge: '🇳🇿 QUEENSTOWN',
                title: 'Autumn Road Trip',
                meta: '6 days • 8 km • 4/5',
              },
              {
                id: 'c3',
                imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&q=85&auto=format&fit=crop',
                badge: '🇦🇺 SYDNEY',
                title: 'One Day Highlights',
                meta: '1 day • 3 km • 3/4',
              },
            ]}
          />
        ) : (
          <PassConsentScreen
            bookingId={previewSession.bookingId}
            tripName={previewTrip.tourName}
            dateLabel="Fri 8 May 2026 · 08:00–Evening"
            paxLabel="4 guests"
            emergencyName="Ploy (Trip Staff)"
            emergencyPhone="+61 4XX XXX XXX"
          />
        )}

        <PortalNav tab={tab} onChange={setTab} />
      </div>
    );
  }

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Session;
      if (parsed?.bookingId && parsed?.tourCode) setSession(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const t = await fetchTripByCodeFromSheet(session.tourCode);
        if (!cancelled) setTrip(t);
        if (t?.city) {
          const w = await fetchCityWeather(t.city);
          if (!cancelled && w) setWeather({ tempC: w.tempC, condition: w.condition, city: w.city });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load trip');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const login = async () => {
    setLoading(true);
    setError(null);
    try {
      const match = await fetchCustomerBookingByBookingIdOrPhone(query);
      if (!match) {
        setError('Booking not found. Please check your Booking ID / phone number.');
        return;
      }
      const next: Session = {
        query,
        bookingId: match.bookingId,
        customerName: match.customerName || 'friend',
        tourCode: match.tourCode,
      };
      setSession(next);
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setTab('home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setSession(null);
    setTrip(null);
    setWeather(null);
    setQuery('');
    setTab('home');
    localStorage.removeItem(SESSION_KEY);
  };

  const onCheckIn = async () => {
    if (!session) return;
    await logConsentToSheet({
      timestampIso: new Date().toISOString(),
      bookingId: session.bookingId,
      customerName: session.customerName,
      tourCode: session.tourCode,
      consentStatus: 'CHECKED_IN',
    });
  };

  // Unauthed view
  if (!session) {
    return (
      <div className="min-h-screen bg-sage-50 text-[#1C1C1E] font-sans antialiased pb-20">
        <header className="sticky top-0 z-40 bg-sage-50/95 backdrop-blur border-b border-sage-100">
          <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/" className="font-serif text-lg font-semibold">
              Trip2Talk
            </Link>
            <Link to="/ops" className="text-xs font-semibold text-[#9A9A9A]">
              Ops
            </Link>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 pt-8 space-y-5">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Client Portal</h1>
          <p className="text-sm text-[#6B6B6B] leading-relaxed">
            Enter your <span className="font-semibold">Booking ID</span> or <span className="font-semibold">Phone Number</span> to access your trip.
          </p>

          <SoftCard>
            <div className="p-5 space-y-3">
              <label className="text-xs font-semibold text-[#6B6B6B]">Booking ID / Phone</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. BK-12345 or +614XXXXXXXX"
                className="w-full rounded-2xl border border-sage-100 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-sage-200"
              />
              {error && <p className="text-sm text-rose-700">{error}</p>}
              <button
                type="button"
                onClick={() => void login()}
                disabled={!query.trim() || loading}
                className="w-full rounded-full bg-[#1C1C1E] text-white font-semibold tracking-wide py-3.5 hover:-translate-y-0.5 transition-all disabled:opacity-40"
              >
                {loading ? 'Checking…' : 'Enter Portal'}
              </button>
              <p className="text-[11px] text-[#9A9A9A] leading-relaxed">
                If you can’t find your booking, contact admin via Messenger.
              </p>
            </div>
          </SoftCard>
        </main>
      </div>
    );
  }

  const messengerUrl = trip?.messengerUrl?.trim() || 'https://m.me/trip2talk.chapter99';
  const cover = trip?.coverUrl?.trim() || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80';
  const oneDay = (trip?.durationDays ?? 1) === 1;
  const tempC = weather?.tempC ?? 15;
  const tagPills = highlights.map((t) => {
    const m = t.match(/^(\S+)\s+(.*)$/);
    return { icon: m?.[1] ?? '✦', label: m?.[2] ?? t };
  });
  const durationLabel = trip ? (trip.durationDays === 1 ? '1 day' : `${trip.durationDays} days`) : '—';
  const distanceLabel = '— km';
  const capacityLabel = trip?.slotsMax ? `${trip.slotsBooked ?? 1}/${trip.slotsMax}` : '—';
  const countryTag = (trip?.countryTag || 'Trip2Talk').toUpperCase();
  const hotelName = trip?.dormitoryPolicy?.split('\n')[0]?.trim() || 'Accommodation';
  const hotelNote = trip?.dormitoryPolicy?.trim() || 'Details will appear here once confirmed.';

  return (
    <div className="min-h-screen bg-sage-50 text-[#1C1C1E] font-sans antialiased pb-20">
      <header className="sticky top-0 z-40 bg-sage-50/95 backdrop-blur border-b border-sage-100">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg font-semibold">
            Trip2Talk
          </Link>
          <button type="button" onClick={logout} className="text-xs font-semibold text-[#9A9A9A]">
            Logout
          </button>
        </div>
      </header>

      {tab === 'home' ? (
        <ActiveTripHomeScreen
          name={session.customerName}
          tempC={tempC}
          tags={tagPills}
          heroImageUrl={cover}
          tripTitle={trip?.tourName || session.tourCode}
          tripSubtitle={trip?.countryTag || 'Private Photo Journey'}
          durationLabel={durationLabel}
          distanceLabel={distanceLabel}
          capacityLabel={capacityLabel}
          onStartTrip={() => setTab('pass')}
        />
      ) : tab === 'itinerary' ? (
        <TripDetailGroupScreen
          bannerUrl={cover}
          countryTag={countryTag}
          title={trip?.tourName || session.tourCode}
          metaLeft={durationLabel}
          metaRight={capacityLabel}
          hotelName={hotelName}
          hotelNote={hotelNote}
        />
      ) : tab === 'profile' ? (
        <TripExplorerStackScreen
          heading="All Trips"
          datePills={[
            { id: 'all', label: 'All dates' },
            ...(trip?.departureStart && trip?.departureEnd
              ? [{ id: 'next', label: `${trip.departureStart} - ${trip.departureEnd}` }]
              : []),
          ]}
          heroCards={[
            {
              id: trip?.tourCode || session.tourCode,
              imageUrl: cover,
              badge: countryTag,
              title: trip?.tourName || session.tourCode,
              meta: `${durationLabel} • ${capacityLabel}`,
            },
          ]}
        />
      ) : (
        <div className="min-h-screen bg-sage-50 text-[#1C1C1E] font-sans antialiased pb-20">
          <header className="sticky top-0 z-40 bg-sage-50/95 backdrop-blur border-b border-sage-100">
            <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
              <Link to="/" className="font-serif text-lg font-semibold">
                Trip2Talk
              </Link>
              <button type="button" onClick={logout} className="text-xs font-semibold text-[#9A9A9A]">
                Logout
              </button>
            </div>
          </header>
          <main className="max-w-md mx-auto px-4 pt-5 space-y-5">
            <h2 className="font-serif text-xl font-semibold">Pass &amp; Consent</h2>

        {tab === 'pass' && (
          <>
            <SoftCard>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl border border-sage-100 bg-sage-50 p-3">
                    <p className="text-[11px] text-[#6B6B6B] font-semibold">Guests</p>
                    <p className="mt-1 font-semibold">{'—'}</p>
                  </div>
                  <div className="rounded-2xl border border-sage-100 bg-sage-50 p-3">
                    <p className="text-[11px] text-[#6B6B6B] font-semibold">Pickup</p>
                    <p className="mt-1 font-semibold">{'—'}</p>
                  </div>
                  <div className="rounded-2xl border border-sage-100 bg-sage-50 p-3">
                    <p className="text-[11px] text-[#6B6B6B] font-semibold">Depart</p>
                    <p className="mt-1 font-semibold">{'—'}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <SwipeCheckIn onChecked={onCheckIn} disabled={loading} />
                  <p className="mt-2 text-xs text-[#6B6B6B] leading-relaxed">
                    Checking in logs a consent timestamp to Google Sheets (Consents tab).
                  </p>
                </div>
              </div>
            </SoftCard>

            <div className="h-16" />
            <div className="fixed bottom-16 left-0 right-0 z-40">
              <div className="max-w-md mx-auto px-4">
                <a
                  href={messengerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center rounded-2xl bg-messenger text-white font-semibold py-3 shadow-lg shadow-blue-500/20"
                >
                  Open Messenger group
                </a>
              </div>
            </div>
          </>
        )}

        {loading && (
          <div className="rounded-[28px] border border-sage-100 bg-white p-5 animate-pulse">
            <div className="h-4 w-28 bg-sage-100 rounded" />
            <div className="mt-3 h-3 w-full bg-sage-100 rounded" />
            <div className="mt-2 h-3 w-2/3 bg-sage-100 rounded" />
          </div>
        )}
        {error && (
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
        )}
          </main>
          <PortalNav tab={tab} onChange={setTab} />
        </div>
      )}
    </div>
  );
}

