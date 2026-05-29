import { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { isUuidV4 } from '../lib/bookingRules';
import { findTripById } from '../lib/publicTours';
import { fetchAlbumBookingForTrip } from '../lib/albumDelivery';
import { supabase } from '../lib/supabase';
import AlbumCountdown from '../components/shared/AlbumCountdown';
import {
  AlbumMode,
  LANDSCAPE_FAQ,
  LANDSCAPE_GEAR,
  LANDSCAPE_SETTINGS,
  LANDSCAPE_SPOTS,
  LANDSCAPE_TABS,
  LANDSCAPE_TEAL,
  LENS_PER_LOCATION,
  MODEL_AVOID,
  MODEL_FAQ,
  MODEL_GEAR,
  MODEL_OUTFITS,
  MODEL_PINK,
  MODEL_SPOTS,
  MODEL_TABS,
  MODEL_TIMELINE,
  LandscapePreset,
} from '../lib/albumPrepData';

const NAVY = '#0d1b2a';

function ExpandableCard({
  title,
  lines,
  accent,
}: {
  title: string;
  lines: { label: string; value: string }[];
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[24px] border border-sage-100 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center px-4 py-3 text-left"
      >
        <span className="font-semibold text-[#1C1C1E]">{title}</span>
        <span className="text-[#9A9A9A]">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-sage-100">
          {lines.map((l) => (
            <div key={l.label} className="text-sm">
              <span className="font-medium" style={{ color: accent }}>
                {l.label}:
              </span>{' '}
              <span className="text-[#1C1C1E]">{l.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FaqList({ items, accent }: { items: { q: string; a: string }[]; accent: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={item.q} className="rounded-[24px] border border-sage-100 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full px-4 py-3 text-left text-sm font-medium text-[#1C1C1E] flex justify-between gap-2"
          >
            {item.q}
            <span className="text-[#9A9A9A] shrink-0">{openIdx === i ? '−' : '+'}</span>
          </button>
          {openIdx === i && (
            <p className="px-4 pb-3 text-sm text-[#1C1C1E] border-t border-sage-100 pt-2">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function GearBadge({ badge }: { badge: 'required' | 'recommended' | 'optional' }) {
  const styles = {
    required: 'bg-red-500/20 text-red-300 border-red-500/30',
    recommended: 'bg-amber-500/20 text-amber-200 border-amber-500/30',
    optional: 'bg-sage-50 text-[#9A9A9A] border-sage-100',
  };
  const labels = { required: 'Required', recommended: 'Recommended', optional: 'Optional' };
  return (
    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${styles[badge]}`}>
      {labels[badge]}
    </span>
  );
}

export default function AlbumPrep() {
  const { tourId } = useParams<{ tourId: string }>();
  const [search, setSearch] = useSearchParams();
  const trip = tourId ? findTripById(tourId) : undefined;
  const accessToken = search.get('token')?.trim() ?? '';
  const [tokenGate, setTokenGate] = useState<'loading' | 'ok' | 'deny'>('loading');

  useEffect(() => {
    if (!accessToken || !isUuidV4(accessToken)) {
      setTokenGate('deny');
      return;
    }
    let cancelled = false;
    void supabase
      .from('tour_bookings')
      .select('id')
      .eq('access_token', accessToken)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) setTokenGate('deny');
        else setTokenGate('ok');
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const mode: AlbumMode = search.get('type') === 'landscape' ? 'landscape' : 'model';
  const [albumExpiresAt, setAlbumExpiresAt] = useState<string | null>(null);
  const [albumDelivered, setAlbumDelivered] = useState(false);
  const albumReady = search.get('ready') !== '0' || albumDelivered;
  const accent = mode === 'model' ? MODEL_PINK : LANDSCAPE_TEAL;
  const tabs = mode === 'model' ? MODEL_TABS : LANDSCAPE_TABS;

  const [tab, setTab] = useState(0);
  const [preset, setPreset] = useState<LandscapePreset>('golden');

  useEffect(() => {
    if (!tourId) return;
    let cancelled = false;
    void fetchAlbumBookingForTrip(tourId).then((row) => {
      if (cancelled || !row) return;
      if (row.album_status === 'delivered') setAlbumDelivered(true);
      if (row.album_expires_at) setAlbumExpiresAt(row.album_expires_at);
    });
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  if (tokenGate === 'deny') {
    return <Navigate to="/" replace />;
  }

  if (tokenGate === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-white" style={{ background: NAVY }}>
        <p className="text-sm text-neutral-400">Validating secure token…</p>
      </div>
    );
  }

  const setMode = (m: AlbumMode) => {
    setSearch({ type: m, ready: search.get('ready') ?? '1' }, { replace: true });
    setTab(0);
  };

  const settings = LANDSCAPE_SETTINGS[preset];

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-sage-50 text-[#1C1C1E]">
        <div className="bg-white rounded-[28px] border border-sage-100 p-6 text-center">
          <p className="text-sm text-[#9A9A9A]">Trip not found.</p>
          <Link to="/" className="text-sage-700 font-semibold text-sm mt-3 inline-block hover:underline">
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans bg-sage-50 text-[#1C1C1E] pb-28">
      <div className="max-w-lg mx-auto px-4 py-6">
        <Link
          to={`/trip/${trip.trip_code}`}
          className="text-xs text-[#9A9A9A] hover:text-[#1C1C1E] mb-4 inline-block"
        >
          ← Trip hub
        </Link>

        <p className="font-mono text-xs mb-4 text-[#9A9A9A]">
          {trip.trip_code}
        </p>

        {/* Top toggle */}
        <div className="flex rounded-full p-1 bg-white border border-sage-100 mb-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setMode('model')}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${
              mode === 'model' ? 'bg-[#1C1C1E] text-white' : 'text-[#1C1C1E]'
            }`}
          >
            👗 Model
          </button>
          <button
            type="button"
            onClick={() => setMode('landscape')}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${
              mode === 'landscape' ? 'bg-[#1C1C1E] text-white' : 'text-[#1C1C1E]'
            }`}
          >
            🏔 Landscape
          </button>
        </div>

        {albumExpiresAt && albumDelivered && <AlbumCountdown expiresAt={albumExpiresAt} />}

        {/* Gallery ready — both Model & Landscape modes */}
        {albumReady && (
          <div className="bg-[#F0F4EF] border-l-4 border-sage-700 rounded-[24px] p-4 mb-4 text-sm space-y-2">
            <p className="font-semibold text-[#1C1C1E]">📸 คลังภาพพร้อมดาวน์โหลดแล้วครับ!</p>
            <p className="text-[#3B6D11] leading-relaxed">
              ส่งลิงก์ทาง Facebook Inbox ส่วนตัวแล้ว / เข้าผ่านทางลัดในแอปได้เช่นกัน
            </p>
            <p className="text-xs font-medium text-[#3B6D11]">
              ดาวน์โหลด .JPG ทั้งหมดภายใน 60 วัน (ลิงก์หมดอายุอัตโนมัติ)
            </p>
          </div>
        )}

        {!albumReady && (
          <div className="rounded-[24px] border border-dashed border-sage-200 p-6 mb-6 text-center text-[#9A9A9A] text-sm bg-white">
            <p className="uppercase tracking-wide text-xs">Status</p>
            <p className="mt-2 font-mono text-[#1C1C1E]">PREPARING GALLERY</p>
            <button
              type="button"
              onClick={() => setSearch({ type: mode, ready: '1' }, { replace: true })}
              className="mt-3 text-xs underline opacity-60"
            >
              Preview ready state
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {tabs.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setTab(i)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors border ${
                tab === i ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]' : 'bg-white text-[#1C1C1E] border-sage-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Model mode */}
        {mode === 'model' && tab === 0 && (
          <div className="space-y-3">
            {MODEL_SPOTS.map((spot) => (
              <ExpandableCard key={spot.id} title={spot.title} lines={spot.lines} accent={MODEL_PINK} />
            ))}
          </div>
        )}
        {mode === 'model' && tab === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {MODEL_OUTFITS.map((o) => (
                <div
                  key={o.title}
                  className="rounded-[24px] p-3 border border-sage-100 bg-white"
                  style={{ borderColor: `${MODEL_PINK}40` }}
                >
                  <p className="text-xs font-bold" style={{ color: MODEL_PINK }}>
                    {o.title}
                  </p>
                  <p className="text-xs text-[#1C1C1E] mt-1">{o.desc}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: MODEL_PINK }}>
                หลีกเลี่ยง
              </p>
              <ul className="text-sm text-[#1C1C1E] space-y-1">
                {MODEL_AVOID.map((a) => (
                  <li key={a}>✗ {a}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: MODEL_PINK }}>
                Gear checklist
              </p>
              <ul className="space-y-2">
                {MODEL_GEAR.map((g) => (
                  <li
                    key={g}
                    className="flex items-center gap-2 text-sm text-[#1C1C1E] border border-sage-100 rounded-[18px] px-3 py-2 bg-white"
                  >
                    <span style={{ color: MODEL_PINK }}>✓</span> {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {mode === 'model' && tab === 2 && (
          <div className="relative pl-6 border-l-2 space-y-6" style={{ borderColor: MODEL_PINK }}>
            {MODEL_TIMELINE.map((row) => (
              <div key={row.time} className="relative">
                <span
                  className="absolute -left-[1.65rem] w-3 h-3 rounded-full top-1"
                  style={{ background: MODEL_PINK }}
                />
                <p className="font-mono text-sm font-bold" style={{ color: MODEL_PINK }}>
                  {row.time}
                </p>
                <p className="text-sm text-[#1C1C1E] mt-0.5">{row.text}</p>
              </div>
            ))}
          </div>
        )}
        {mode === 'model' && tab === 3 && <FaqList items={MODEL_FAQ} accent={MODEL_PINK} />}

        {/* Landscape mode */}
        {mode === 'landscape' && tab === 0 && (
          <div className="space-y-3">
            {LANDSCAPE_SPOTS.map((spot) => (
              <ExpandableCard key={spot.id} title={spot.title} lines={spot.lines} accent={LANDSCAPE_TEAL} />
            ))}
          </div>
        )}
        {mode === 'landscape' && tab === 1 && (
          <div className="space-y-4">
            <ul className="space-y-2">
              {LANDSCAPE_GEAR.map((g) => (
                <li
                  key={g.item}
                  className="flex justify-between items-center gap-2 px-3 py-2 rounded-[24px] bg-white border border-sage-100"
                >
                  <span className="text-sm">{g.item}</span>
                  <GearBadge badge={g.badge} />
                </li>
              ))}
            </ul>
            <div>
              <p className="text-xs font-semibold text-[#9A9A9A] uppercase mb-2">Lens per location</p>
              <div className="grid grid-cols-2 gap-2">
                {LENS_PER_LOCATION.map((l) => (
                  <div key={l.spot} className="rounded-[18px] bg-white px-3 py-2 text-xs border border-sage-100">
                    <p className="text-[#1C1C1E] font-medium">{l.spot}</p>
                    <p className="font-mono mt-0.5" style={{ color: LANDSCAPE_TEAL }}>
                      {l.lens}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {mode === 'landscape' && tab === 2 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LANDSCAPE_SETTINGS) as LandscapePreset[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  className={`px-3 py-2 rounded-full text-xs font-semibold border transition-colors ${
                    preset === key
                      ? 'border-transparent bg-[#1C1C1E] text-white'
                      : 'border-sage-100 bg-white text-[#1C1C1E]'
                  }`}
                >
                  {LANDSCAPE_SETTINGS[key].label}
                </button>
              ))}
            </div>
            <div className="rounded-[24px] border border-sage-100 bg-white p-4 space-y-3 text-sm">
              {(
                [
                  ['Aperture', settings.aperture],
                  ['ISO', settings.iso],
                  ['Shutter', settings.shutter],
                  ['WB', settings.wb],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-sage-100 pb-2 last:border-0">
                  <span className="text-[#9A9A9A]">{k}</span>
                  <span className="font-mono font-medium" style={{ color: LANDSCAPE_TEAL }}>
                    {v}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-sage-100">
                <p className="text-xs text-[#9A9A9A] uppercase mb-1">Pro Tip</p>
                <p className="text-[#1C1C1E] leading-relaxed">{settings.tip}</p>
              </div>
            </div>
          </div>
        )}
        {mode === 'landscape' && tab === 3 && <FaqList items={LANDSCAPE_FAQ} accent={LANDSCAPE_TEAL} />}

        <p className="text-center mt-10 text-xs text-[#9A9A9A]">
          <Link to="/terms" className="hover:text-[#1C1C1E] underline">
            Photo delivery terms (.JPG only)
          </Link>
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-sage-50/95 backdrop-blur border-t border-sage-100 px-5 pt-3 pb-5">
        <p className="text-[12px] text-[#9A9A9A] text-center mb-2">
          เตรียมตัวพร้อมแล้ว ไปจอยกลุ่มเม้าท์มอยและอัปเดตแพลนทริปกัน!
        </p>
        <a
          href="https://m.me/trip2talk.chapter99"
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
