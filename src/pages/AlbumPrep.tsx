import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { findTripById } from '../lib/publicTours';
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
    <div className="rounded-xl border border-white/10 bg-[#132333] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center px-4 py-3 text-left"
      >
        <span className="font-semibold text-white">{title}</span>
        <span className="text-white/50">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/10">
          {lines.map((l) => (
            <div key={l.label} className="text-sm">
              <span className="font-medium" style={{ color: accent }}>
                {l.label}:
              </span>{' '}
              <span className="text-white/75">{l.value}</span>
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
        <div key={item.q} className="rounded-xl border border-white/10 bg-[#132333] overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="w-full px-4 py-3 text-left text-sm font-medium text-white flex justify-between gap-2"
          >
            {item.q}
            <span className="text-white/40 shrink-0">{openIdx === i ? '−' : '+'}</span>
          </button>
          {openIdx === i && (
            <p className="px-4 pb-3 text-sm text-white/70 border-t border-white/10 pt-2">{item.a}</p>
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
    optional: 'bg-white/10 text-white/60 border-white/20',
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

  const mode: AlbumMode = search.get('type') === 'landscape' ? 'landscape' : 'model';
  const albumReady = search.get('ready') !== '0';
  const accent = mode === 'model' ? MODEL_PINK : LANDSCAPE_TEAL;
  const tabs = mode === 'model' ? MODEL_TABS : LANDSCAPE_TABS;

  const [tab, setTab] = useState(0);
  const [preset, setPreset] = useState<LandscapePreset>('golden');

  const setMode = (m: AlbumMode) => {
    setSearch({ type: m, ready: search.get('ready') ?? '1' }, { replace: true });
    setTab(0);
  };

  const settings = LANDSCAPE_SETTINGS[preset];

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: NAVY }}>
        <p className="text-red-400">
          Trip not found. <Link to="/" className="text-[#4dd8a0]">Home</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white font-sans" style={{ background: NAVY }}>
      <div className="max-w-lg mx-auto px-4 py-6 pb-16">
        <Link
          to={`/trip/${trip.trip_code}`}
          className="text-xs text-white/50 hover:text-white mb-4 inline-block"
        >
          ← Trip hub
        </Link>

        <p className="font-mono text-xs mb-4" style={{ color: accent }}>
          {trip.trip_code}
        </p>

        {/* Top toggle */}
        <div className="flex rounded-full p-1 bg-white/10 mb-6">
          <button
            type="button"
            onClick={() => setMode('model')}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${
              mode === 'model' ? 'text-white shadow-md' : 'text-white/50'
            }`}
            style={mode === 'model' ? { background: MODEL_PINK } : undefined}
          >
            👗 Model
          </button>
          <button
            type="button"
            onClick={() => setMode('landscape')}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${
              mode === 'landscape' ? 'text-white shadow-md' : 'text-white/50'
            }`}
            style={mode === 'landscape' ? { background: LANDSCAPE_TEAL, color: NAVY } : undefined}
          >
            🏔 Landscape
          </button>
        </div>

        {/* Gallery ready — both Model & Landscape modes */}
        {albumReady && (
          <div className="bg-[#E1F5EE] border border-[#5DCAA5] rounded-xl p-4 mb-4 text-[#1a4d3a] text-sm space-y-2">
            <p className="font-semibold">📸 คลังภาพพร้อมดาวน์โหลดแล้วครับ!</p>
            <p className="text-[#2d6b52] leading-relaxed">
              ส่งลิงก์ทาง Facebook Inbox ส่วนตัวแล้ว / เข้าผ่านทางลัดในแอปได้เช่นกัน
            </p>
            <p className="text-xs font-medium text-[#2d6b52]">
              ดาวน์โหลด .JPG ทั้งหมดภายใน 60 วัน (ลิงก์หมดอายุอัตโนมัติ)
            </p>
          </div>
        )}

        {!albumReady && (
          <div className="rounded-xl border border-dashed border-white/20 p-6 mb-6 text-center text-white/50 text-sm">
            <p className="uppercase tracking-wide text-xs">Status</p>
            <p className="mt-2 font-mono" style={{ color: accent }}>
              PREPARING GALLERY
            </p>
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
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {tabs.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setTab(i)}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === i ? 'text-white' : 'text-white/45 bg-white/5'
              }`}
              style={tab === i ? { background: accent, color: mode === 'landscape' ? NAVY : '#fff' } : undefined}
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
                  className="rounded-xl p-3 border border-white/10 bg-white/5"
                  style={{ borderColor: `${MODEL_PINK}40` }}
                >
                  <p className="text-xs font-bold" style={{ color: MODEL_PINK }}>
                    {o.title}
                  </p>
                  <p className="text-xs text-white/70 mt-1">{o.desc}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: MODEL_PINK }}>
                หลีกเลี่ยง
              </p>
              <ul className="text-sm text-white/70 space-y-1">
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
                    className="flex items-center gap-2 text-sm text-white/80 border border-white/10 rounded-lg px-3 py-2"
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
                <p className="text-sm text-white/75 mt-0.5">{row.text}</p>
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
                  className="flex justify-between items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                >
                  <span className="text-sm">{g.item}</span>
                  <GearBadge badge={g.badge} />
                </li>
              ))}
            </ul>
            <div>
              <p className="text-xs font-semibold text-white/50 uppercase mb-2">Lens per location</p>
              <div className="grid grid-cols-2 gap-2">
                {LENS_PER_LOCATION.map((l) => (
                  <div key={l.spot} className="rounded-lg bg-white/5 px-3 py-2 text-xs border border-white/10">
                    <p className="text-white/90 font-medium">{l.spot}</p>
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
                    preset === key ? 'border-transparent' : 'border-white/20 text-white/60'
                  }`}
                  style={
                    preset === key
                      ? { background: LANDSCAPE_TEAL, color: NAVY }
                      : undefined
                  }
                >
                  {LANDSCAPE_SETTINGS[key].label}
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 text-sm">
              {(
                [
                  ['Aperture', settings.aperture],
                  ['ISO', settings.iso],
                  ['Shutter', settings.shutter],
                  ['WB', settings.wb],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-white/5 pb-2 last:border-0">
                  <span className="text-white/50">{k}</span>
                  <span className="font-mono font-medium" style={{ color: LANDSCAPE_TEAL }}>
                    {v}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-white/50 uppercase mb-1">Pro Tip</p>
                <p className="text-white/80 leading-relaxed">{settings.tip}</p>
              </div>
            </div>
          </div>
        )}
        {mode === 'landscape' && tab === 3 && <FaqList items={LANDSCAPE_FAQ} accent={LANDSCAPE_TEAL} />}

        <p className="text-center mt-10 text-xs text-white/40">
          <Link to="/terms" className="hover:text-white/70 underline">
            Photo delivery terms (.JPG only)
          </Link>
        </p>
      </div>
    </div>
  );
}
