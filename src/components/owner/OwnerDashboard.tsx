import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { daysUntilTrip, MARGIN_TABLE } from '../../lib/bookingRules';
import { generatePortalLink } from '../../lib/platformBookings';
import IntakeFormModal from '../IntakeFormModal';
import FBInboxTrigger from '../FBInboxTrigger';

type Lang = 'TH' | 'EN';

type BookingRow = {
  bookingId: string;
  customerName: string;
  tourCode: string;
  tourName: string;
  pax: number;
  tourDate: string;
  totalAmount: number;
  bookingStatus: string;
  intakeStatus: string;
  emergencyContact: string;
  dietaryReq: string;
  medicalCondition: string;
  motionSickness: string;
  photoStyle: string;
};

type TripRow = {
  tourCode: string;
  tourName: string;
  departureStart?: string;
  departureEnd?: string;
};

const NAVY = '#0d1b2a';
const GOLD = '#d4af37';
const TEAL = '#4dd8a0';

function formatAud(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function todayLabel(lang: Lang, now: Date) {
  if (lang === 'TH') {
    return now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  return now.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseMoney(v: unknown): number {
  const raw = typeof v === 'number' ? String(v) : typeof v === 'string' ? v : '';
  const cleaned = raw.replace(/[^0-9.-]+/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parsePax(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v || '').trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 1;
}

function isSameMonth(dateStr: string, now: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return false;
  return monthKey(d) === monthKey(now);
}

function bestTripDateForTour(rows: BookingRow[], tourCode: string): string {
  const dates = rows
    .filter((b) => b.tourCode.toUpperCase() === tourCode.toUpperCase())
    .map((b) => b.tourDate)
    .filter(Boolean)
    .map((s) => new Date(s))
    .filter((d) => Number.isFinite(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  return dates[0] ? dates[0].toISOString().slice(0, 10) : '';
}

function paxForTour(rows: BookingRow[], tourCode: string): number {
  return rows.filter((b) => b.tourCode.toUpperCase() === tourCode.toUpperCase()).reduce((s, b) => s + (b.pax || 0), 0);
}

function tripStatusFromBookings(rows: BookingRow[], tourCode: string): 'Pending' | 'Confirmed' | 'Full' {
  const subset = rows.filter((b) => b.tourCode.toUpperCase() === tourCode.toUpperCase());
  const statuses = subset.map((b) => (b.bookingStatus || '').trim());
  if (statuses.some((s) => /full/i.test(s))) return 'Full';
  if (statuses.some((s) => /deposit/i.test(s))) return 'Confirmed';
  return 'Pending';
}

function paxTone(pax: number): 'green' | 'red' | 'gold' {
  if (pax === 4) return 'gold';
  if (pax >= 6) return 'green';
  return 'red';
}

function estimateNetMargin(totalRevenue: number, pax: number): number {
  // Spec rows are for fixed pax (8 shared / 4 private). We scale cohost per head and keep fixed costs.
  const isPrivate = pax <= 4;
  const base = isPrivate ? MARGIN_TABLE.private4 : MARGIN_TABLE.shared8;
  const cohost = pax * 50;
  const fixedCosts = base.van + base.photographer + base.snacks;
  return totalRevenue - cohost - fixedCosts;
}

function isConfirmedStatus(status: string): boolean {
  const s = (status || '').trim().toLowerCase();
  return /confirm|deposit|paid|full/.test(s);
}

function toastTone(tone: 'ok' | 'err') {
  return tone === 'ok'
    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
    : 'border-red-400/30 bg-red-500/10 text-red-200';
}

export default function OwnerDashboard({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('trip2talk_language') === 'EN' ? 'EN' : 'TH'));
  const [now, setNow] = useState(() => new Date());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);

  const [toast, setToast] = useState<{ tone: 'ok' | 'err'; msg: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [intakeBooking, setIntakeBooking] = useState<BookingRow | null>(null);
  const [portalBookingId, setPortalBookingId] = useState('');
  const [portalBusy, setPortalBusy] = useState(false);
  const lastSyncedIso = useMemo(() => localStorage.getItem('t2t_owner_last_synced') || '', []);
  const [lastSynced, setLastSynced] = useState(lastSyncedIso);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const gasUrl = (import.meta.env.VITE_GAS_WEBAPP_URL as string | undefined)?.trim() || '';
    if (!gasUrl) {
      setError('Missing VITE_GAS_WEBAPP_URL');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [bRes, tRes] = await Promise.all([
        fetch(`${gasUrl}?action=getBookings`, { method: 'GET', cache: 'no-store' }),
        fetch(`${gasUrl}?action=getTrips`, { method: 'GET', cache: 'no-store' }),
      ]);
      const bJson = (await bRes.json()) as unknown;
      const tJson = (await tRes.json()) as unknown;

      const bArr = (bJson as any)?.bookings ?? (bJson as any)?.data ?? [];
      const tArr = (tJson as any)?.trips ?? (tJson as any)?.data ?? [];

      const normalizedBookings: BookingRow[] = (Array.isArray(bArr) ? bArr : []).map((r: any) => ({
        bookingId: String(r.bookingId || r.booking_id || r['Booking ID'] || '').trim(),
        customerName: String(r.customerName || r.customer_name || r['Customer Name'] || '').trim(),
        tourCode: String(r.tourCode || r.tour_code || r['Tour Code'] || '').trim(),
        tourName: String(r.tourName || r.tour_name || r['Tour Name'] || '').trim(),
        pax: parsePax(r.pax ?? r.guests ?? r['Guests'] ?? r['Pax']),
        tourDate: String(r.tourDate || r.tour_date || r['Tour Date'] || '').trim(),
        totalAmount: parseMoney(r.totalAmount || r.total_amount || r['Total Amount']),
        bookingStatus: String(r.bookingStatus || r['Booking Status'] || '').trim(),
        intakeStatus: String(r.intakeStatus || r['Intake Status'] || '').trim() || 'Pending',
        emergencyContact: String(r.emergencyContact || r['Emergency Contact'] || '').trim(),
        dietaryReq: String(r.dietaryReq || r['Dietary Req'] || '').trim(),
        medicalCondition: String(r.medicalCondition || r['Medical Condition'] || '').trim(),
        motionSickness: String(r.motionSickness || r['Motion Sickness'] || '').trim(),
        photoStyle: String(r.photoStyle || r['Photo Style'] || '').trim(),
      })).filter((b) => Boolean(b.bookingId));

      const normalizedTrips: TripRow[] = (Array.isArray(tArr) ? tArr : []).map((r: any) => ({
        tourCode: String(r.tourCode || r.tour_code || '').trim(),
        tourName: String(r.tourName || r.tour_name || '').trim(),
        departureStart: typeof r.departureStart === 'string' ? r.departureStart : '',
        departureEnd: typeof r.departureEnd === 'string' ? r.departureEnd : '',
      })).filter((t) => Boolean(t.tourCode));

      setBookings(normalizedBookings);
      setTrips(normalizedTrips);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setBookings([]);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const exit = () => {
    sessionStorage.removeItem('trip2talk_role');
    onLogout();
    navigate('/', { replace: true });
  };

  const monthRevenue = useMemo(() => {
    return bookings.filter((b) => isSameMonth(b.tourDate, now)).reduce((s, b) => s + b.totalAmount, 0);
  }, [bookings, now]);

  const monthBookingsCount = useMemo(() => {
    return bookings.filter((b) => isSameMonth(b.tourDate, now)).length;
  }, [bookings, now]);

  const monthNetMargin = useMemo(() => {
    const monthRows = bookings.filter((b) => isSameMonth(b.tourDate, now));
    const byTour = new Map<string, { revenue: number; pax: number }>();
    for (const b of monthRows) {
      const key = b.tourCode.toUpperCase();
      const prev = byTour.get(key) ?? { revenue: 0, pax: 0 };
      prev.revenue += b.totalAmount;
      prev.pax += b.pax;
      byTour.set(key, prev);
    }
    let total = 0;
    for (const v of byTour.values()) {
      total += estimateNetMargin(v.revenue, v.pax);
    }
    return total;
  }, [bookings, now]);

  const pendingIntakesCount = useMemo(() => {
    return bookings.filter((b) => (b.intakeStatus || '').trim() === 'Pending').length;
  }, [bookings]);

  const pendingIntakes = useMemo(() => {
    return bookings
      .filter((b) => (b.intakeStatus || '').trim() === 'Pending')
      .sort((a, b) => (a.tourDate || '9999').localeCompare(b.tourDate || '9999'));
  }, [bookings]);

  const totalBookingsCount = bookings.length;

  const confirmedRevenue = useMemo(() => {
    return bookings.filter((b) => isConfirmedStatus(b.bookingStatus)).reduce((s, b) => s + b.totalAmount, 0);
  }, [bookings]);

  const upcomingRows = useMemo(() => {
    const tourCodes = Array.from(new Set([...trips.map((t) => t.tourCode), ...bookings.map((b) => b.tourCode)])).filter(Boolean);
    const rows = tourCodes.map((code) => {
      const trip = trips.find((t) => t.tourCode.toUpperCase() === code.toUpperCase());
      const pax = paxForTour(bookings, code);
      const date = bestTripDateForTour(bookings, code);
      const status = tripStatusFromBookings(bookings, code);
      const name = trip?.tourName || bookings.find((b) => b.tourCode.toUpperCase() === code.toUpperCase())?.tourName || code;
      return { tourCode: code, tourName: name, date, pax, status };
    });
    return rows.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')).slice(0, 12);
  }, [trips, bookings]);

  const copyUpgradeMessage = async (tourCode: string, pax: number, dateIso: string) => {
    const days = dateIso ? daysUntilTrip(dateIso) : null;
    const msgTh = `⚡ อัปเกรดเป็นทริปไพรเวท (4 คน)\nทริป: ${tourCode}\nจำนวนตอนนี้: ${pax} คน\nวันเดินทาง: ${dateIso || '—'}\n\nเนื่องจากใกล้วันเดินทาง (${days ?? '—'} วัน) และยอดแชร์ยังไม่ถึง 6 คน\nขอเสนออัปเกรดเป็นไพรเวท เพื่อคอนเฟิร์มออกเดินทางแน่นอนครับ\n\nยอดอัปเกรด: +$130 AUD / คน (รวม 4 คน)\nหากสะดวกตอบกลับ “CONFIRM PRIVATE” ได้เลยครับ`;
    const msgEn = `⚡ Upgrade to Private (4 pax)\nTrip: ${tourCode}\nCurrent: ${pax} pax\nDate: ${dateIso || '—'}\n\nWe are within the 45-day window and the shared group is still below 6 pax.\nTo guarantee departure, we recommend upgrading to Private.\n\nUpgrade: +$130 AUD / person (4 pax)\nReply “CONFIRM PRIVATE” to proceed.`;

    try {
      await navigator.clipboard.writeText(lang === 'TH' ? msgTh : msgEn);
      setToast({ tone: 'ok', msg: lang === 'TH' ? 'คัดลอกข้อความอัปเกรดแล้ว' : 'Upgrade message copied' });
      window.setTimeout(() => setToast(null), 2200);
    } catch {
      setToast({ tone: 'err', msg: lang === 'TH' ? 'คัดลอกไม่สำเร็จ' : 'Copy failed' });
      window.setTimeout(() => setToast(null), 2200);
    }
  };

  const runGeneratePortalLink = async () => {
    const ref = portalBookingId.trim() || bookings[0]?.bookingId || '';
    if (!ref) {
      setToast({ tone: 'err', msg: lang === 'TH' ? 'ไม่มี Booking ID' : 'No booking ID available' });
      window.setTimeout(() => setToast(null), 2200);
      return;
    }
    setPortalBusy(true);
    try {
      const { url } = await generatePortalLink(ref);
      await navigator.clipboard.writeText(url);
      setToast({ tone: 'ok', msg: lang === 'TH' ? 'คัดลอกลิงก์ Album Prep แล้ว' : 'Album prep link copied' });
    } catch (e) {
      setToast({ tone: 'err', msg: e instanceof Error ? e.message : 'Portal link failed' });
    } finally {
      setPortalBusy(false);
      window.setTimeout(() => setToast(null), 2800);
    }
  };

  const syncAll = async () => {
    // Current repo uses `sync-pipeline` edge function for safe GAS writes.
    // Here we only store a timestamp and provide a hook point (no destructive actions).
    setSyncing(true);
    try {
      const ts = new Date().toISOString();
      localStorage.setItem('t2t_owner_last_synced', ts);
      setLastSynced(ts);
      setToast({ tone: 'ok', msg: lang === 'TH' ? 'บันทึกเวลา SYNC แล้ว' : 'Sync timestamp saved' });
    } catch (e) {
      setToast({ tone: 'err', msg: e instanceof Error ? e.message : 'Sync failed' });
    } finally {
      setSyncing(false);
      window.setTimeout(() => setToast(null), 2200);
    }
  };

  const clockStr = now.toLocaleTimeString(lang === 'TH' ? 'th-TH' : 'en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="min-h-screen" style={{ background: NAVY, color: 'white' }}>
      {/* SECTION 1 — Header & Live Clock */}
      <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur" style={{ background: 'rgba(13,27,42,0.92)' }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.28em]" style={{ color: GOLD }}>
              OWNER DASHBOARD
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <p className="font-mono text-xs text-white/70">{todayLabel(lang, now)}</p>
              <span className="text-white/30">•</span>
              <p className="font-mono text-xs" style={{ color: TEAL }}>
                {clockStr}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLang((p) => (p === 'TH' ? 'EN' : 'TH'))}
              className="px-3 py-2 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10"
            >
              {lang === 'TH' ? 'EN' : 'ไทย'}
            </button>
            <button
              type="button"
              onClick={exit}
              className="px-3 py-2 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10"
            >
              EXIT
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {toast && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${toastTone(toast.tone)}`}>
            {toast.msg}
          </div>
        )}

        {/* SECTION 2 — Revenue Summary Cards */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
              {lang === 'TH' ? 'สรุปเดือนนี้' : 'This month summary'}
            </h2>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs font-mono text-white/70 hover:text-white"
            >
              {lang === 'TH' ? 'รีเฟรช' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse h-[84px]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">{lang === 'TH' ? 'รายได้เดือนนี้' : 'Revenue this month'}</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: TEAL }}>
                  {formatAud(monthRevenue)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">{lang === 'TH' ? 'กำไรสุทธิเดือนนี้' : 'Net margin this month'}</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: GOLD }}>
                  {formatAud(monthNetMargin)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">{lang === 'TH' ? 'จำนวนการจองเดือนนี้' : 'Total bookings this month'}</p>
                <p className="text-2xl font-semibold mt-1">{monthBookingsCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">{lang === 'TH' ? 'ค้างกรอกอินเทค' : 'Pending intakes'}</p>
                <p className="text-2xl font-semibold mt-1">{pendingIntakesCount}</p>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-200">{error}</p>}
        </section>

        {/* All-time summary */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
            {lang === 'TH' ? 'สรุปทั้งหมด' : 'All-time summary'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">{lang === 'TH' ? 'การจองทั้งหมด' : 'Total bookings'}</p>
              <p className="text-2xl font-semibold mt-1">{totalBookingsCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">
                {lang === 'TH' ? 'รายได้จากการจองที่ยืนยันแล้ว' : 'Confirmed bookings revenue'}
              </p>
              <p className="text-2xl font-semibold mt-1" style={{ color: TEAL }}>
                {formatAud(confirmedRevenue)}
              </p>
            </div>
          </div>
        </section>

        {/* Pending intakes */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
            {lang === 'TH' ? 'รายการค้างกรอกอินเทค' : 'Pending intake list'}
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
            <table className="min-w-[640px] w-full text-left">
              <thead className="text-[11px] uppercase tracking-wider text-white/60">
                <tr className="border-b border-white/10">
                  <th className="p-3">Booking ID</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Trip</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pendingIntakes.length === 0 ? (
                  <tr>
                    <td className="p-4 text-white/60" colSpan={5}>
                      {lang === 'TH' ? 'ไม่มีรายการค้าง' : 'No pending intakes'}
                    </td>
                  </tr>
                ) : (
                  pendingIntakes.map((b) => (
                    <tr key={b.bookingId} className="border-b border-white/5">
                      <td className="p-3 font-mono text-xs" style={{ color: TEAL }}>
                        {b.bookingId}
                      </td>
                      <td className="p-3">{b.customerName}</td>
                      <td className="p-3">{b.tourName || b.tourCode}</td>
                      <td className="p-3 font-mono text-xs text-white/70">{b.tourDate || '—'}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setIntakeBooking(b)}
                          className="px-3 py-2 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10"
                        >
                          {lang === 'TH' ? 'เปิดฟอร์ม' : 'Open intake'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Generate portal link */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
            {lang === 'TH' ? 'สร้างลิงก์ Album Prep' : 'Generate portal link'}
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row gap-3">
            <select
              value={portalBookingId || bookings[0]?.bookingId || ''}
              onChange={(e) => setPortalBookingId(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
            >
              {bookings.map((b) => (
                <option key={b.bookingId} value={b.bookingId}>
                  {b.bookingId} — {b.customerName}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={portalBusy || bookings.length === 0}
              onClick={() => void runGeneratePortalLink()}
              className="px-4 py-2.5 rounded-full text-sm font-semibold border shrink-0 disabled:opacity-50"
              style={{ borderColor: GOLD, color: NAVY, background: GOLD }}
            >
              {portalBusy ? '…' : lang === 'TH' ? 'สร้างและคัดลอกลิงก์' : 'Generate & copy link'}
            </button>
          </div>
        </section>

        {/* SECTION 3 — Upcoming Trips Table */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
            {lang === 'TH' ? 'ทริปที่กำลังจะมาถึง' : 'Upcoming trips'}
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
            <table className="min-w-[820px] w-full text-left">
              <thead className="text-[11px] uppercase tracking-wider text-white/60">
                <tr className="border-b border-white/10">
                  <th className="p-3">Tour Code</th>
                  <th className="p-3">Trip Name</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Pax</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {upcomingRows.length === 0 ? (
                  <tr>
                    <td className="p-4 text-white/60" colSpan={6}>
                      {lang === 'TH' ? 'ยังไม่มีข้อมูล' : 'No data yet'}
                    </td>
                  </tr>
                ) : (
                  upcomingRows.map((r) => {
                    const tone = paxTone(r.pax);
                    const badge =
                      tone === 'green'
                        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25'
                        : tone === 'gold'
                          ? 'bg-amber-500/15 text-amber-200 border-amber-400/25'
                          : 'bg-red-500/15 text-red-200 border-red-400/25';

                    const statusBadge =
                      r.status === 'Full'
                        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25'
                        : r.status === 'Confirmed'
                          ? 'bg-amber-500/15 text-amber-200 border-amber-400/25'
                          : 'bg-white/5 text-white/70 border-white/10';

                    const showUpgrade =
                      r.pax === 4 &&
                      r.date &&
                      (() => {
                        const days = daysUntilTrip(r.date);
                        return days >= 0 && days <= 45;
                      })();

                    return (
                      <tr key={r.tourCode} className="border-b border-white/5">
                        <td className="p-3 font-mono text-xs" style={{ color: TEAL }}>
                          {r.tourCode}
                        </td>
                        <td className="p-3 text-white/90">{r.tourName}</td>
                        <td className="p-3 font-mono text-xs text-white/70">{r.date || '—'}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold ${badge}`}>
                            {r.pax} pax
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold ${statusBadge}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {showUpgrade ? (
                            <button
                              type="button"
                              onClick={() => void copyUpgradeMessage(r.tourCode, r.pax, r.date)}
                              className="px-3 py-2 rounded-full text-xs font-semibold border"
                              style={{ borderColor: GOLD, color: NAVY, background: GOLD }}
                            >
                              ⚡ {lang === 'TH' ? 'Upgrade to Private' : 'Upgrade to Private'}
                            </button>
                          ) : (
                            <span className="text-xs text-white/40">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 4 — Financial Margin Calculator */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
            {lang === 'TH' ? 'เครื่องคิดมาร์จิ้น (สเปก)' : 'Margin calculator (spec)'}
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
            <table className="min-w-[720px] w-full text-left">
              <thead className="text-[11px] uppercase tracking-wider text-white/60">
                <tr className="border-b border-white/10">
                  <th className="p-3">Type</th>
                  <th className="p-3">Gross Revenue</th>
                  <th className="p-3">Cohost</th>
                  <th className="p-3">Van</th>
                  <th className="p-3">Photographer</th>
                  <th className="p-3">Snacks</th>
                  <th className="p-3">NET</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[MARGIN_TABLE.shared8, MARGIN_TABLE.private4].map((row) => (
                  <tr key={row.label.en} className="border-b border-white/5">
                    <td className="p-3 text-white/90">{lang === 'TH' ? row.label.th : row.label.en}</td>
                    <td className="p-3 font-mono text-xs text-white/80">{formatAud(row.revenue)}</td>
                    <td className="p-3 font-mono text-xs text-white/80">-{formatAud(row.cohost)}</td>
                    <td className="p-3 font-mono text-xs text-white/80">-{formatAud(row.van)}</td>
                    <td className="p-3 font-mono text-xs text-white/80">-{formatAud(row.photographer)}</td>
                    <td className="p-3 font-mono text-xs text-white/80">-{formatAud(row.snacks)}</td>
                    <td className="p-3 font-mono text-xs" style={{ color: TEAL }}>
                      {formatAud(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 5 — Google Sheets Sync Button */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
            {lang === 'TH' ? 'ซิงก์ Google Sheets' : 'Google Sheets sync'}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={syncing}
              onClick={() => void syncAll()}
              className="px-4 py-3 rounded-full text-sm font-semibold border"
              style={{ borderColor: TEAL, color: NAVY, background: TEAL, opacity: syncing ? 0.7 : 1 }}
            >
              🔄 {lang === 'TH' ? 'SYNC ALL TO GOOGLE SHEETS' : 'SYNC ALL TO GOOGLE SHEETS'}
            </button>
            <p className="text-xs text-white/60 font-mono">
              {lang === 'TH' ? 'ซิงก์ล่าสุด' : 'Last synced'}:{' '}
              {lastSynced ? new Date(lastSynced).toLocaleString('en-AU') : '—'}
            </p>
          </div>
        </section>

        {/* SECTION 6 — FB Inbox Template */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
            {lang === 'TH' ? 'เทมเพลต FB Inbox' : 'FB inbox template'}
          </h2>
          <FBInboxTrigger
            bookingId={bookings[0]?.bookingId || 'BK-000'}
            clientName={bookings[0]?.customerName || 'Client'}
            albumUrl="https://trip2talk.com.au/album/demo"
            expiryDate={new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString().slice(0, 10)}
            lang={lang}
          />
        </section>
      </main>

      {intakeBooking && (
        <IntakeFormModal
          bookingId={intakeBooking.bookingId}
          tourCode={intakeBooking.tourCode}
          language={lang}
          defaultFullName={intakeBooking.customerName}
          onComplete={() => {
            setIntakeBooking(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
