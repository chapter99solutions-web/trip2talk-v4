import { useCallback, useEffect, useMemo, useState } from 'react';
import { TOUR_FALLBACK_DATA, findTourFallbackByCode, TourFallback } from '../../data/tours';
import { formatAUD } from '../../lib/payidCalc';
import { supabase } from '../../lib/supabase';

type Lang = 'TH' | 'EN';
type TabKey = 'promo' | 'stats' | 'codes';
type Platform = 'Facebook' | 'Instagram' | 'LINE';
type Tone = 'fun' | 'professional' | 'urgency';

/** Per-trip marketing copy: Thai/English place labels + a location hashtag + a theme emoji.
 *  Keyed by the tourCode prefix (segment before the first dash). */
const TRIP_MARKETING: Record<string, { placeTh: string; placeEn: string; emoji: string }> = {
  MEL: { placeTh: 'เมลเบิร์น', placeEn: 'Melbourne', emoji: '🌸' },
  ULU: { placeTh: 'ทะเลทราย Outback', placeEn: 'Uluru', emoji: '🏜️' },
  NZ: { placeTh: 'นิวซีแลนด์', placeEn: 'NewZealand', emoji: '🏔️' },
  TAS: { placeTh: 'แทสมาเนีย', placeEn: 'Tasmania', emoji: '🌌' },
  KIA: { placeTh: 'ชายฝั่ง Kiama', placeEn: 'Kiama', emoji: '🌊' },
  CAN: { placeTh: 'ทุ่งคาโนลา Cowra', placeEn: 'Cowra', emoji: '🌼' },
  SYD: { placeTh: 'ซิดนีย์', placeEn: 'Sydney', emoji: '📸' },
};

function marketingFor(tourCode: string) {
  const prefix = tourCode.split('-')[0].toUpperCase();
  return TRIP_MARKETING[prefix] ?? { placeTh: 'ออสเตรเลีย', placeEn: 'Australia', emoji: '📸' };
}

/** "4 Days 3 Nights" → "4 วัน 3 คืน". */
function durationTh(label: string): string {
  const d = label.match(/(\d+)\s*Day/i);
  const n = label.match(/(\d+)\s*Night/i);
  if (d && n) return `${d[1]} วัน ${n[1]} คืน`;
  if (d) return `${d[1]} วัน`;
  return label;
}

/** Strip the English lead-in before an em-dash and trim for a tidy bullet. */
function cleanHighlight(h: string): string {
  const parts = h.split('—');
  const txt = (parts.length > 1 ? parts[1] : parts[0]).trim();
  return txt.length > 48 ? `${txt.slice(0, 47)}…` : txt;
}

function buildPromoPost(trip: TourFallback, platform: Platform, tone: Tone, seed: number): string {
  const mk = marketingFor(trip.tourCode);
  const seats = trip.seatsLeft ?? trip.maxPax;
  const price = trip.standardPrice.toLocaleString('en-US');
  const dur = durationTh(trip.durationLabel);

  const funHooks = [
    `${mk.emoji} ${mk.placeTh} กำลังรอคุณอยู่!`,
    `${mk.emoji} ได้เวลาออกเดินทาง! ${mk.placeTh} รอคุณอยู่ 🎉`,
    `${mk.emoji} อยากได้รูปปังไม่ซ้ำใคร? ไป${mk.placeTh}กัน! 📸`,
  ];
  const proHooks = [
    `${mk.emoji} ทริปถ่ายภาพ${mk.placeTh} โดยทีมช่างภาพมืออาชีพ`,
    `${mk.emoji} สัมผัสความงามของ${mk.placeTh} ผ่านเลนส์ระดับมืออาชีพ`,
    `${mk.emoji} ${mk.placeEn} Photography Tour — คุณภาพระดับพรีเมียม`,
  ];
  const urgencyHooks = [
    `🔥 ใกล้เต็มแล้ว! ทริป${mk.placeTh} เหลือเพียง ${seats} ที่นั่ง`,
    `⏰ ปิดรับจองเร็วๆ นี้! ${mk.placeTh} เหลือ ${seats} ที่นั่งสุดท้าย`,
    `🔥 รีบเลย! ${mk.placeTh} เหลือที่ว่างอีกไม่กี่ที่ (${seats} ที่นั่ง)`,
  ];
  const hooks = tone === 'fun' ? funHooks : tone === 'professional' ? proHooks : urgencyHooks;
  const hook = hooks[seed % hooks.length];

  const titleLine = `ทริปถ่ายภาพ ${mk.placeEn} ${dur}`;

  const numHi = platform === 'LINE' ? 2 : 3;
  const icons = trip.highlightIcons && trip.highlightIcons.length ? trip.highlightIcons : ['✨', '🌅', '📸'];
  const highlightLines = trip.highlights
    .slice(0, numHi)
    .map((h, i) => `${icons[i % icons.length]} ${cleanHighlight(h)}`);

  const photographerLine = '📸 ช่างภาพมืออาชีพดูแลตลอดทริป';

  const priceLine =
    tone === 'urgency'
      ? `🔥 เริ่มต้น $${price}/คน · เหลือเพียง ${seats} ที่นั่ง!`
      : `💰 เริ่มต้น $${price}/คน · จำกัด ${trip.maxPax} ที่นั่ง`;

  const cta =
    platform === 'Facebook'
      ? '👉 จองได้ที่ trip2talk.com.au'
      : platform === 'Instagram'
        ? '👉 ทักแชท IG หรือจองที่ trip2talk.com.au'
        : '👉 ทัก LINE: @trip2talk';

  const baseTags = ['#Trip2Talk', '#ถ่ายภาพออสเตรเลีย', `#${mk.placeEn}`, '#ThaiInAustralia'];
  const toneTag = tone === 'fun' ? '#เที่ยวออสเตรเลีย' : tone === 'urgency' ? '#รีบจองด่วน' : '#PhotographyTour';
  const tags = [...baseTags, toneTag];
  if (platform === 'Instagram') tags.push('#instatravel', '#travelgram');
  // Keep #Trip2Talk first; rotate the remainder so Regenerate reshuffles hashtag order.
  const rest = tags.slice(1);
  const rotated = rest.map((_, i) => rest[(i + seed) % rest.length]);
  const hashtagLine = [tags[0], ...rotated].join(' ');

  return [hook, titleLine, ...highlightLines, photographerLine, priceLine, cta, '', hashtagLine]
    .filter((line) => line !== undefined)
    .join('\n');
}

// ---------------------------------------------------------------------------
// TAB 1 — Promo Post Generator
// ---------------------------------------------------------------------------
function PromoPostTab({ lang }: { lang: Lang }) {
  const [tourCode, setTourCode] = useState('ULU-4D3N');
  const [platform, setPlatform] = useState<Platform>('Facebook');
  const [tone, setTone] = useState<Tone>('fun');
  const [seed, setSeed] = useState(0);
  const [copied, setCopied] = useState(false);

  const trip = useMemo(() => findTourFallbackByCode(tourCode), [tourCode]);
  const post = useMemo(
    () => (trip ? buildPromoPost(trip, platform, tone, seed) : ''),
    [trip, platform, tone, seed]
  );

  const copyPost = async () => {
    try {
      await navigator.clipboard.writeText(post);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const t = (th: string, en: string) => (lang === 'TH' ? th : en);
  const segBtn = (active: boolean) =>
    `px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
      active
        ? 'bg-amber-500 text-neutral-950 border-amber-500'
        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-600'
    }`;

  const tones: { key: Tone; label: string }[] = [
    { key: 'fun', label: 'สนุก 🎉' },
    { key: 'professional', label: 'Professional 💼' },
    { key: 'urgency', label: 'Urgency 🔥' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-5">
        <div>
          <label className="block text-xs text-neutral-500 mb-2 tracking-wide">
            {t('เลือกทริป', 'Trip')}
          </label>
          <select
            value={tourCode}
            onChange={(e) => setTourCode(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 font-mono text-sm text-amber-400 focus:outline-none focus:border-amber-400/40"
          >
            {TOUR_FALLBACK_DATA.map((tr) => (
              <option key={tr.tourCode} value={tr.tourCode}>
                {tr.tourCode} — {tr.nameTh ?? tr.tourName ?? tr.anonymizedTitle}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs text-neutral-500 mb-2 tracking-wide">{t('แพลตฟอร์ม', 'Platform')}</p>
          <div className="flex flex-wrap gap-2">
            {(['Facebook', 'Instagram', 'LINE'] as Platform[]).map((p) => (
              <button key={p} type="button" onClick={() => setPlatform(p)} className={segBtn(platform === p)}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-neutral-500 mb-2 tracking-wide">{t('โทน', 'Tone')}</p>
          <div className="flex flex-wrap gap-2">
            {tones.map((to) => (
              <button key={to.key} type="button" onClick={() => setTone(to.key)} className={segBtn(tone === to.key)}>
                {to.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-xs text-neutral-500 tracking-wide">
          {t('ตัวอย่างโพสต์ (อัปเดตอัตโนมัติ)', 'Live preview (auto-updates)')}
        </label>
        <pre className="whitespace-pre-wrap font-sans text-sm text-amber-100/90 bg-black/40 border border-amber-500/20 rounded-xl p-4 min-h-[220px]">
          {post || t('— ไม่พบทริป —', '— Trip not found —')}
        </pre>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyPost()}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              copied ? 'bg-green-500 text-white' : 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
            }`}
          >
            {copied ? '✅ Copied!' : '📋 Copy Post'}
          </button>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="px-4 py-3 rounded-xl text-sm font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700 hover:border-amber-400/50 transition-colors"
          >
            🔄 {t('สุ่มใหม่', 'Regenerate')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 2 — Booking Stats (Supabase: tour_bookings)
// ---------------------------------------------------------------------------
type BookingRow = {
  amount_paid_aud: number | null;
  status: string | null;
  tour_id: string | null;
  created_at: string | null;
  tours: { trip_code: string | null } | { trip_code: string | null }[] | null;
};

type Stats = {
  bookingsThisMonth: number;
  revenueThisMonth: number;
  popularTrip: string;
  pendingPayments: number;
};

const EMPTY_STATS: Stats = {
  bookingsThisMonth: 0,
  revenueThisMonth: 0,
  popularTrip: '—',
  pendingPayments: 0,
};

function tripCodeOf(row: BookingRow): string {
  const rel = row.tours;
  if (Array.isArray(rel)) return rel[0]?.trip_code ?? row.tour_id ?? '—';
  return rel?.trip_code ?? row.tour_id ?? '—';
}

function BookingStatsTab({ lang }: { lang: Lang }) {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const t = (th: string, en: string) => (lang === 'TH' ? th : en);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setNote(null);
    try {
      const { data, error } = await supabase
        .from('tour_bookings')
        .select('amount_paid_aud, status, tour_id, created_at, tours(trip_code)');

      if (error) {
        setStats(EMPTY_STATS);
        setNote(t('ไม่สามารถดึงข้อมูลได้ (RLS หรือไม่มีสิทธิ์) — แสดงค่าเริ่มต้น', 'Query blocked (RLS/permissions) — showing zeros'));
        return;
      }

      const rows = (data ?? []) as BookingRow[];
      if (rows.length === 0) {
        setStats(EMPTY_STATS);
        setNote(t('ยังไม่มีข้อมูลการจอง', 'No bookings yet'));
        return;
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let bookingsThisMonth = 0;
      let revenueThisMonth = 0;
      let pendingPayments = 0;
      const tripCounts = new Map<string, number>();

      for (const row of rows) {
        const created = row.created_at ? new Date(row.created_at) : null;
        const inMonth = created != null && created >= monthStart;
        if (inMonth) {
          bookingsThisMonth += 1;
          revenueThisMonth += Number(row.amount_paid_aud ?? 0);
          const code = tripCodeOf(row);
          tripCounts.set(code, (tripCounts.get(code) ?? 0) + 1);
        }
        if ((row.status ?? '').toUpperCase() === 'PENDING') pendingPayments += 1;
      }

      // Most popular trip falls back to all-time counts when the current month is empty.
      if (tripCounts.size === 0) {
        for (const row of rows) {
          const code = tripCodeOf(row);
          tripCounts.set(code, (tripCounts.get(code) ?? 0) + 1);
        }
      }
      let popularTrip = '—';
      let best = -1;
      for (const [code, count] of tripCounts) {
        if (count > best) {
          best = count;
          popularTrip = code;
        }
      }

      setStats({ bookingsThisMonth, revenueThisMonth, popularTrip, pendingPayments });
    } catch {
      setStats(EMPTY_STATS);
      setNote(t('เกิดข้อผิดพลาด — แสดงค่าเริ่มต้น', 'Unexpected error — showing zeros'));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const cards = [
    { label: t('การจองเดือนนี้', 'Bookings this month'), value: String(stats.bookingsThisMonth) },
    { label: t('รายได้เดือนนี้', 'Revenue this month'), value: formatAUD(stats.revenueThisMonth) },
    { label: t('ทริปยอดนิยม', 'Most popular trip'), value: stats.popularTrip },
    { label: t('รอชำระเงิน', 'Pending payments'), value: String(stats.pendingPayments) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">
          {t('สถิติการจองแบบเรียลไทม์จากฐานข้อมูล', 'Live booking stats from the database')}
        </p>
        <button
          type="button"
          onClick={() => void fetchStats()}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700 hover:border-amber-400/50 transition-colors disabled:opacity-50"
        >
          {loading ? t('กำลังโหลด…', 'Loading…') : `🔄 ${t('รีเฟรช', 'Refresh')}`}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="cyber-card p-4">
            <p className="text-xs text-neutral-500 tracking-wide">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-400 font-mono break-words">{c.value}</p>
          </div>
        ))}
      </div>

      {note && <p className="text-xs text-amber-400/80">{note}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 3 — Promo Code Generator (localStorage)
// ---------------------------------------------------------------------------
type DiscountType = 'percent' | 'fixed';

type PromoCode = {
  code: string;
  discountType: DiscountType;
  amount: number;
  expiry: string;
  maxUses: number;
  createdAt: string;
};

const PROMO_STORE_KEY = 'T2T_PROMO_CODES';

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function loadCodes(): PromoCode[] {
  try {
    const raw = localStorage.getItem(PROMO_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PromoCode[]) : [];
  } catch {
    return [];
  }
}

function buildCode(prefix: string, discountType: DiscountType, amount: number): string {
  const clean = (prefix || 'T2T').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'T2T';
  const token = discountType === 'percent' ? `SAVE${amount}` : `CASH${amount}`;
  return `${clean}-${token}`;
}

function PromoCodeTab({ lang }: { lang: Lang }) {
  const [prefix, setPrefix] = useState('T2T');
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [amount, setAmount] = useState(30);
  const [expiry, setExpiry] = useState(todayPlus(30));
  const [maxUses, setMaxUses] = useState(10);
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codes, setCodes] = useState<PromoCode[]>([]);

  useEffect(() => {
    setCodes(loadCodes());
  }, []);

  const persist = (next: PromoCode[]) => {
    setCodes(next);
    try {
      localStorage.setItem(PROMO_STORE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private-mode errors */
    }
  };

  const t = (th: string, en: string) => (lang === 'TH' ? th : en);

  const handleGenerate = () => {
    const code = buildCode(prefix, discountType, amount);
    setGenerated(code);
    setCopied(false);
    const entry: PromoCode = {
      code,
      discountType,
      amount,
      expiry,
      maxUses,
      createdAt: new Date().toISOString(),
    };
    // De-dupe by code: newest wins, pushed to the front.
    persist([entry, ...codes.filter((c) => c.code !== code)]);
  };

  const copyCode = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const deleteCode = (code: string) => persist(codes.filter((c) => c.code !== code));

  const discountLabel = (c: PromoCode) =>
    c.discountType === 'percent' ? `${c.amount}% off` : `${formatAUD(c.amount)} off`;

  const inputClass =
    'w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-neutral-100 focus:outline-none focus:border-amber-400/40';
  const labelClass = 'block text-xs text-neutral-500 mb-2 tracking-wide';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label className={labelClass}>{t('คำนำหน้าโค้ด', 'Code prefix')}</label>
          <input
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="T2T / EARLY / VIP"
            className={inputClass}
          />
        </div>

        <div>
          <p className={labelClass}>{t('ประเภทส่วนลด', 'Discount type')}</p>
          <div className="flex gap-2">
            {([
              { k: 'percent' as DiscountType, l: '% ' + t('เปอร์เซ็นต์', 'percent') },
              { k: 'fixed' as DiscountType, l: '$ AUD' },
            ]).map((o) => (
              <button
                key={o.k}
                type="button"
                onClick={() => setDiscountType(o.k)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  discountType === o.k
                    ? 'bg-amber-500 text-neutral-950 border-amber-500'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-600'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>
            {discountType === 'percent' ? t('ส่วนลด (%)', 'Discount (%)') : t('ส่วนลด ($AUD)', 'Discount ($AUD)')}
          </label>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{t('วันหมดอายุ', 'Expiry date')}</label>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('ใช้ได้สูงสุด', 'Max uses')}</label>
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value) || 1))}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors"
        >
          🎯 {t('สร้างโค้ด', 'Generate code')}
        </button>
      </div>

      <div className="space-y-4">
        {generated && (
          <div className="cyber-card p-5 text-center space-y-3">
            <p className="text-xs text-neutral-500 tracking-wide">{t('โค้ดส่วนลด', 'Promo code')}</p>
            <p className="text-3xl font-mono font-bold text-amber-400 tracking-wider break-all">{generated}</p>
            <button
              type="button"
              onClick={() => void copyCode()}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                copied ? 'bg-green-500 text-white' : 'bg-neutral-800 text-neutral-200 border border-neutral-700 hover:border-amber-400/50'
              }`}
            >
              {copied ? '✅ Copied!' : `📋 ${t('คัดลอกโค้ด', 'Copy code')}`}
            </button>
          </div>
        )}

        <div>
          <p className="text-xs text-neutral-500 tracking-wide mb-2">
            {t('โค้ดที่บันทึกไว้', 'Saved codes')} ({codes.length})
          </p>
          {codes.length === 0 ? (
            <p className="text-sm text-neutral-600 py-3 text-center">
              {t('ยังไม่มีโค้ด — กดสร้างโค้ดด้านซ้าย', 'No codes yet — generate one on the left')}
            </p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {codes.map((c) => (
                <li
                  key={c.code}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950/80 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-amber-400 font-semibold break-all">{c.code}</p>
                    <p className="text-xs text-neutral-500">
                      {discountLabel(c)} · {t('หมดอายุ', 'exp')} {c.expiry} · {t('ใช้ได้', 'max')} {c.maxUses}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCode(c.code)}
                    className="shrink-0 text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg px-2.5 py-1.5"
                  >
                    {t('ลบ', 'Delete')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Marketing Hub shell — tabbed container
// ---------------------------------------------------------------------------
export default function MarketingHub() {
  const [lang, setLang] = useState<Lang>('TH');
  const [tab, setTab] = useState<TabKey>('promo');

  const t = (th: string, en: string) => (lang === 'TH' ? th : en);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'promo', label: t('📣 สร้างโพสต์โปรโมท', '📣 Promo Post') },
    { key: 'stats', label: t('📊 สถิติการจอง', '📊 Booking Stats') },
    { key: 'codes', label: t('🎯 สร้างโค้ดส่วนลด', '🎯 Promo Codes') },
  ];

  return (
    <section className="cyber-card p-5 space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-amber-400 font-semibold text-lg tracking-wide">
            {t('🚀 ศูนย์การตลาด', '🚀 Marketing Hub')}
          </h2>
          <p className="text-xs text-neutral-500 mt-1 tracking-wide">
            {t('เครื่องมือสร้างโพสต์ · สถิติ · โค้ดส่วนลด', 'Promo posts · stats · discount codes')}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-black/30 p-1">
          {(['TH', 'EN'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                lang === l ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-amber-300'
              }`}
            >
              {l === 'TH' ? 'ไทย' : 'EN'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === tb.key
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
                : 'text-neutral-400 hover:text-amber-300 border border-transparent'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'promo' && <PromoPostTab lang={lang} />}
      {tab === 'stats' && <BookingStatsTab lang={lang} />}
      {tab === 'codes' && <PromoCodeTab lang={lang} />}
    </section>
  );
}
