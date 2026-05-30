import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { daysUntilTrip, MARGIN_TABLE } from '../../lib/bookingRules';
import { generatePortalLink } from '../../lib/platformBookings';
import { supabase } from '../../lib/supabase';
import { resolveDefaultTenantId } from '../../lib/customerJourney';
import type { TourStatus } from '../../types/tour';
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

// Row shape for the Supabase-backed `tours` table (subset we read/write here).
type SupaTour = {
  id: string;
  trip_code: string | null;
  title: string | null;
  anonymized_title: string | null;
  destination: string | null;
  duration_text: string | null;
  price_aud: number | null;
  price_per_person: number | null;
  private_price_aud: number | null;
  max_pax: number | null;
  start_date: string | null;
  end_date: string | null;
  status: TourStatus | null;
  trip_type: string | null;
  environment_tags: string[] | null;
  description: string | null;
  cover_image_url: string | null;
};

type TripForm = {
  trip_code: string;
  name_en: string;
  name_th: string;
  destination: string;
  duration_text: string;
  price_aud: string;
  private_price_aud: string;
  max_pax: string;
  start_date: string;
  end_date: string;
  status: TourStatus;
  trip_type: 'one_day' | 'overnight';
  weather: string;
  description: string;
  cover_image_url: string;
};

const EMPTY_TRIP_FORM: TripForm = {
  trip_code: '',
  name_en: '',
  name_th: '',
  destination: '',
  duration_text: '',
  price_aud: '',
  private_price_aud: '',
  max_pax: '5',
  start_date: '',
  end_date: '',
  status: 'ACTIVE',
  trip_type: 'one_day',
  weather: '',
  description: '',
  cover_image_url: '',
};

// Real tour_status enum values (supabase/01-schema-tours-staff.sql) with bilingual labels.
const TOUR_STATUS_OPTIONS: { value: TourStatus; th: string; en: string }[] = [
  { value: 'PLANNING', th: 'ร่าง (Planning)', en: 'Draft / Planning' },
  { value: 'CONFIRMED', th: 'ยืนยันแล้ว', en: 'Confirmed' },
  { value: 'ACTIVE', th: 'เปิดรับจอง', en: 'Active' },
  { value: 'COMPLETED', th: 'จบทริปแล้ว', en: 'Completed' },
  { value: 'CANCELLED', th: 'ยกเลิก', en: 'Cancelled' },
];

function statusLabel(lang: Lang, status: string | null): string {
  const opt = TOUR_STATUS_OPTIONS.find((o) => o.value === status);
  if (!opt) return status || '—';
  return lang === 'TH' ? opt.th : opt.en;
}

function tourStatusBadge(status: string | null): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25';
    case 'CONFIRMED':
      return 'bg-amber-500/15 text-amber-200 border-amber-400/25';
    case 'CANCELLED':
      return 'bg-red-500/15 text-red-200 border-red-400/25';
    case 'COMPLETED':
      return 'bg-sky-500/15 text-sky-200 border-sky-400/25';
    default:
      return 'bg-white/5 text-white/70 border-white/10';
  }
}

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

  // Supabase-backed tours management (Add / Edit / status toggle).
  const [supaTours, setSupaTours] = useState<SupaTour[]>([]);
  const [supaLoading, setSupaLoading] = useState(true);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tripForm, setTripForm] = useState<TripForm>(EMPTY_TRIP_FORM);
  const [savingTrip, setSavingTrip] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const showToast = useCallback((tone: 'ok' | 'err', msg: string, ms = 2600) => {
    setToast({ tone, msg });
    window.setTimeout(() => setToast(null), ms);
  }, []);

  const loadSupaTours = useCallback(async () => {
    setSupaLoading(true);
    try {
      const { data, error } = await supabase
        .from('tours')
        .select('*')
        .order('start_date', { ascending: true });
      if (error) throw error;
      setSupaTours((data ?? []) as SupaTour[]);
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Failed to load trips');
      setSupaTours([]);
    } finally {
      setSupaLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadSupaTours();
  }, [loadSupaTours]);

  const openAddTrip = () => {
    setEditingId(null);
    setTripForm(EMPTY_TRIP_FORM);
    setTripModalOpen(true);
  };

  const openEditTrip = (row: SupaTour) => {
    setEditingId(row.id);
    setTripForm({
      trip_code: row.trip_code || '',
      name_en: row.title || '',
      name_th: row.anonymized_title || '',
      destination: row.destination || '',
      duration_text: row.duration_text || '',
      price_aud: row.price_aud != null ? String(row.price_aud) : '',
      private_price_aud: row.private_price_aud != null ? String(row.private_price_aud) : '',
      max_pax: row.max_pax != null ? String(row.max_pax) : '5',
      start_date: row.start_date || '',
      end_date: row.end_date || '',
      status: (row.status as TourStatus) || 'PLANNING',
      trip_type: row.trip_type === 'overnight' ? 'overnight' : 'one_day',
      weather: Array.isArray(row.environment_tags) ? row.environment_tags[0] || '' : '',
      description: row.description || '',
      cover_image_url: row.cover_image_url || '',
    });
    setTripModalOpen(true);
  };

  const closeTripModal = () => {
    if (savingTrip) return;
    setTripModalOpen(false);
    setEditingId(null);
  };

  const updateForm = <K extends keyof TripForm>(key: K, value: TripForm[K]) => {
    setTripForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveTrip = async () => {
    const tripCode = tripForm.trip_code.trim();
    const nameEn = tripForm.name_en.trim();
    const nameTh = tripForm.name_th.trim();
    if (!tripCode || !nameEn || !nameTh) {
      showToast('err', lang === 'TH' ? 'กรอกรหัสทริป + ชื่อ EN/TH ก่อน' : 'Tour Code, Name EN and Name TH are required');
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const numericPrice = tripForm.price_aud.trim() ? Number(tripForm.price_aud) : 0;
    const numericPrivate = tripForm.private_price_aud.trim() ? Number(tripForm.private_price_aud) : null;
    const numericPax = tripForm.max_pax.trim() ? Number(tripForm.max_pax) : 5;

    const payload: Record<string, unknown> = {
      trip_code: tripCode,
      title: nameEn,
      anonymized_title: nameTh,
      destination: tripForm.destination.trim() || nameEn,
      duration_text: tripForm.duration_text.trim() || null,
      price_aud: Number.isFinite(numericPrice) ? numericPrice : 0,
      price_per_person: Number.isFinite(numericPrice) ? numericPrice : null,
      private_price_aud: numericPrivate != null && Number.isFinite(numericPrivate) ? numericPrivate : null,
      max_pax: Number.isFinite(numericPax) ? numericPax : 5,
      start_date: tripForm.start_date || todayIso,
      end_date: tripForm.end_date || tripForm.start_date || todayIso,
      status: tripForm.status,
      trip_type: tripForm.trip_type,
      environment_tags: tripForm.weather.trim() ? [tripForm.weather.trim()] : null,
      description: tripForm.description.trim() || null,
      cover_image_url: tripForm.cover_image_url.trim() || null,
    };

    setSavingTrip(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('tours').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('ok', lang === 'TH' ? '✅ บันทึกการแก้ไขแล้ว' : '✅ Trip updated successfully');
      } else {
        const tenantId = await resolveDefaultTenantId();
        if (tenantId) payload.tenant_id = tenantId;
        const { error } = await supabase.from('tours').insert(payload);
        if (error) throw error;
        showToast('ok', '✅ Trip added successfully');
      }
      setTripModalOpen(false);
      setEditingId(null);
      await loadSupaTours();
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Save failed', 5000);
    } finally {
      setSavingTrip(false);
    }
  };

  const toggleTripStatus = async (row: SupaTour) => {
    const next: TourStatus = row.status === 'ACTIVE' ? 'CONFIRMED' : 'ACTIVE';
    setTogglingId(row.id);
    try {
      const { error } = await supabase.from('tours').update({ status: next }).eq('id', row.id);
      if (error) throw error;
      showToast('ok', lang === 'TH' ? `อัปเดตสถานะเป็น ${next}` : `Status set to ${next}`);
      await loadSupaTours();
    } catch (e) {
      showToast('err', e instanceof Error ? e.message : 'Status update failed', 5000);
    } finally {
      setTogglingId(null);
    }
  };

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

        {/* SECTION 3.5 — Manage trips (Supabase tours) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
              {lang === 'TH' ? 'จัดการทริป (Supabase)' : 'Manage trips (Supabase)'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadSupaTours()}
                className="text-xs font-mono text-white/70 hover:text-white"
              >
                {lang === 'TH' ? 'รีเฟรช' : 'Refresh'}
              </button>
              <button
                type="button"
                onClick={openAddTrip}
                className="px-3 py-2 rounded-full text-xs font-semibold border"
                style={{ borderColor: GOLD, color: NAVY, background: GOLD }}
              >
                + {lang === 'TH' ? 'เพิ่มทริป' : 'Add Trip'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
            <table className="min-w-[860px] w-full text-left">
              <thead className="text-[11px] uppercase tracking-wider text-white/60">
                <tr className="border-b border-white/10">
                  <th className="p-3">Tour Code</th>
                  <th className="p-3">Trip Name</th>
                  <th className="p-3">Dates</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {supaLoading ? (
                  <tr>
                    <td className="p-4 text-white/60" colSpan={6}>
                      {lang === 'TH' ? 'กำลังโหลด…' : 'Loading…'}
                    </td>
                  </tr>
                ) : supaTours.length === 0 ? (
                  <tr>
                    <td className="p-4 text-white/60" colSpan={6}>
                      {lang === 'TH' ? 'ยังไม่มีทริป กด “+ เพิ่มทริป”' : 'No trips yet — click “+ Add Trip”'}
                    </td>
                  </tr>
                ) : (
                  supaTours.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 align-top">
                      <td className="p-3 font-mono text-xs" style={{ color: TEAL }}>
                        {t.trip_code || '—'}
                      </td>
                      <td className="p-3">
                        <div className="text-white/90">{t.title || '—'}</div>
                        {t.anonymized_title && (
                          <div className="text-xs text-white/50">{t.anonymized_title}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-white/70">
                        {t.start_date || '—'}
                        {t.end_date ? ` → ${t.end_date}` : ''}
                      </td>
                      <td className="p-3 font-mono text-xs text-white/80">
                        {t.price_aud != null ? formatAud(t.price_aud) : '—'}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold ${tourStatusBadge(t.status)}`}>
                          {statusLabel(lang, t.status)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditTrip(t)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10"
                          >
                            {lang === 'TH' ? 'แก้ไข' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            disabled={togglingId === t.id}
                            onClick={() => void toggleTripStatus(t)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border disabled:opacity-50"
                            style={{ borderColor: TEAL, color: TEAL }}
                          >
                            {togglingId === t.id
                              ? '…'
                              : t.status === 'ACTIVE'
                                ? lang === 'TH'
                                  ? 'ตั้งเป็น Confirmed'
                                  : 'Set Confirmed'
                                : lang === 'TH'
                                  ? 'ตั้งเป็น Active'
                                  : 'Set Active'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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

      {tripModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={closeTripModal}
        >
          <div
            className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10"
            style={{ background: NAVY }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 backdrop-blur" style={{ background: 'rgba(13,27,42,0.92)' }}>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.28em]" style={{ color: GOLD }}>
                  {editingId ? (lang === 'TH' ? 'แก้ไขทริป' : 'EDIT TRIP') : lang === 'TH' ? 'เพิ่มทริปใหม่' : 'ADD NEW TRIP'}
                </p>
                <p className="text-xs text-white/50 font-mono">tours · Supabase</p>
              </div>
              <button
                type="button"
                onClick={closeTripModal}
                className="px-3 py-2 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'รหัสทริป (เช่น MEL-4D3N)' : 'Tour Code (e.g. MEL-4D3N)'} *</span>
                <input
                  value={tripForm.trip_code}
                  onChange={(e) => updateForm('trip_code', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                  placeholder="MEL-4D3N"
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'หมวดหมู่' : 'Category'}</span>
                <select
                  value={tripForm.trip_type}
                  onChange={(e) => updateForm('trip_type', e.target.value as TripForm['trip_type'])}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                >
                  <option value="one_day">ทริปวันเดียว (One day)</option>
                  <option value="overnight">ทริปค้างคืน (Overnight)</option>
                </select>
              </label>

              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'ชื่อทริป (EN)' : 'Trip Name EN'} *</span>
                <input
                  value={tripForm.name_en}
                  onChange={(e) => updateForm('name_en', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                  placeholder="Melbourne 4D3N"
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'ชื่อทริป (TH)' : 'Trip Name TH'} *</span>
                <input
                  value={tripForm.name_th}
                  onChange={(e) => updateForm('name_th', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                  placeholder="เมลเบิร์น 4 วัน 3 คืน"
                />
              </label>

              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'สถานที่' : 'Location'}</span>
                <input
                  value={tripForm.destination}
                  onChange={(e) => updateForm('destination', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                  placeholder="Melbourne"
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'ระยะเวลา' : 'Duration'}</span>
                <input
                  value={tripForm.duration_text}
                  onChange={(e) => updateForm('duration_text', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                  placeholder="4 Days 3 Nights"
                />
              </label>

              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'ราคา/คน (AUD)' : 'Price per person (AUD)'}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={tripForm.price_aud}
                  onChange={(e) => updateForm('price_aud', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                  placeholder="0"
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'ราคาไพรเวท (AUD)' : 'Private price (AUD)'}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={tripForm.private_price_aud}
                  onChange={(e) => updateForm('private_price_aud', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                  placeholder="0"
                />
              </label>

              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'จำนวนคนสูงสุด' : 'Max Pax'}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={tripForm.max_pax}
                  onChange={(e) => updateForm('max_pax', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                  placeholder="5"
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'สถานะ' : 'Status'}</span>
                <select
                  value={tripForm.status}
                  onChange={(e) => updateForm('status', e.target.value as TourStatus)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                >
                  {TOUR_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {lang === 'TH' ? o.th : o.en}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'วันเริ่มทริป' : 'Trip Start Date'}</span>
                <input
                  type="date"
                  value={tripForm.start_date}
                  onChange={(e) => updateForm('start_date', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'วันจบทริป' : 'Trip End Date'}</span>
                <input
                  type="date"
                  value={tripForm.end_date}
                  onChange={(e) => updateForm('end_date', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                />
              </label>

              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'สภาพอากาศ' : 'Weather'}</span>
                <input
                  value={tripForm.weather}
                  onChange={(e) => updateForm('weather', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                  placeholder="Sunny 18-24°C"
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'รูปปก (URL)' : 'Cover image URL'}</span>
                <input
                  value={tripForm.cover_image_url}
                  onChange={(e) => updateForm('cover_image_url', e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                  placeholder="https://…supabase.co/storage/…"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs text-white/60">{lang === 'TH' ? 'รายละเอียด' : 'Description'}</span>
                <textarea
                  value={tripForm.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm resize-y"
                  placeholder={lang === 'TH' ? 'รายละเอียดทริป…' : 'Trip details…'}
                />
              </label>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 px-5 py-4 border-t border-white/10 backdrop-blur" style={{ background: 'rgba(13,27,42,0.92)' }}>
              <button
                type="button"
                onClick={closeTripModal}
                disabled={savingTrip}
                className="px-4 py-2.5 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50"
              >
                {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void saveTrip()}
                disabled={savingTrip}
                className="px-5 py-2.5 rounded-full text-sm font-semibold border disabled:opacity-50"
                style={{ borderColor: GOLD, color: NAVY, background: GOLD }}
              >
                {savingTrip ? '…' : lang === 'TH' ? 'บันทึกทริป' : 'Save Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
