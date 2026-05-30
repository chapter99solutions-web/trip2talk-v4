import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import IntakeFormModal from '../IntakeFormModal';
import { BookingsTableMissingError, fetchConfirmedBookings, type PlatformBooking } from '../../lib/platformBookings';
import { logConsentToSheet } from '../../lib/tripsSheetApi';
import { saveExpenseLocally } from '../../lib/expenseDb';
import ReceiptUploadSection from './ReceiptUploadSection';
import type { ATOCategory, Expense } from '../../types/tour';

const ATO_CATEGORIES: ATOCategory[] = [
  'Transport',
  'Accommodation',
  'Meals',
  'Attractions',
  'Marketing',
  'Insurance',
  'Other',
];

type Lang = 'TH' | 'EN';

type IntakeBooking = {
  bookingId: string;
  customerName: string;
  tourCode: string;
  tourDate: string;
  intakeStatus: string;
  bookingStatus: string;
  fullNamePassport: string;
  dob: string;
  emergencyContact: string;
  dietaryReq: string;
  medicalCondition: string;
  motionSickness: string;
  photoStyle: string;
  pickupDisplay: string;
};

const NAVY = '#0d1b2a';
const GOLD = '#d4af37';
const TEAL = '#4dd8a0';

function isSeafoodAllergy(dietary: string) {
  return /seafood/i.test(dietary) || /\bshrimp\b/i.test(dietary) || /แพ้.*ทะเล/i.test(dietary);
}

function parseDietaryFlags(dietary: string): string[] {
  const d = (dietary || '').toLowerCase();
  const out: string[] = [];
  if (d.includes('vegetarian') || d.includes('มังสวิรัติ')) out.push('vegetarian');
  if (d.includes('vegan') || d.includes('วีแกน')) out.push('vegan');
  if (d.includes('halal') || d.includes('ฮาลาล')) out.push('halal');
  if (isSeafoodAllergy(dietary)) out.push('seafood_allergy');
  return out;
}

function dietaryBadge(flag: string) {
  if (flag === 'seafood_allergy') return '🦐';
  if (flag === 'vegan') return '🌱';
  if (flag === 'vegetarian') return '🥗';
  if (flag === 'halal') return '🕌';
  return '•';
}

function photoEmoji(style: string) {
  const s = (style || '').toLowerCase();
  if (s.includes('candid')) return '🌿';
  if (s.includes('fashion')) return '👗';
  if (s.includes('landscape')) return '🏔️';
  if (s.includes('cafe')) return '☕';
  return '📷';
}

function isBirthdayOnTrip(dob: string, tripDateIso: string): boolean {
  if (!dob || !tripDateIso) return false;
  const d = new Date(dob);
  const t = new Date(tripDateIso);
  if (!Number.isFinite(d.getTime()) || !Number.isFinite(t.getTime())) return false;
  return d.getUTCMonth() === t.getUTCMonth() && d.getUTCDate() === t.getUTCDate();
}

function printableHtml(title: string, rows: IntakeBooking[]) {
  const escape = (s: string) =>
    (s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(title)}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system; padding: 24px; }
      h1 { margin: 0 0 10px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #e5e7eb; padding: 10px; font-size: 12px; vertical-align: top; }
      th { background: #f3f4f6; text-align: left; }
      .muted { color: #6b7280; }
    </style>
  </head>
  <body>
    <h1>${escape(title)}</h1>
    <p class="muted">Generated: ${new Date().toLocaleString('en-AU')}</p>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Pickup</th>
          <th>Dietary</th>
          <th>Medical</th>
          <th>Emergency</th>
          <th>Photo style</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) =>
              `<tr>
                <td><b>${escape(r.fullNamePassport || r.customerName)}</b><br/><span class="muted">${escape(r.bookingId)}</span></td>
                <td>${escape(r.pickupDisplay)}</td>
                <td>${escape(r.dietaryReq)}</td>
                <td>${escape(r.medicalCondition)}</td>
                <td>${escape(r.emergencyContact)}</td>
                <td>${escape(r.photoStyle)}</td>
              </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </body>
  </html>`;
}

export default function StaffDashboard({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('trip2talk_language') === 'EN' ? 'EN' : 'TH'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<IntakeBooking[]>([]);
  const [manifestBookings, setManifestBookings] = useState<PlatformBooking[]>([]);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [intakeTarget, setIntakeTarget] = useState<PlatformBooking | null>(null);
  const [checkedIn, setCheckedIn] = useState<Set<string>>(() => new Set());
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [staffToast, setStaffToast] = useState<{ tone: 'ok' | 'err'; msg: string } | null>(null);

  // Quick expense drop (saved offline to IndexedDB, synced later).
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<ATOCategory>('Meals');
  const [expVendor, setExpVendor] = useState('');
  const [expHasGst, setExpHasGst] = useState(true);
  const [expBusy, setExpBusy] = useState(false);

  const flashToast = useCallback((tone: 'ok' | 'err', msg: string) => {
    setStaffToast({ tone, msg });
    window.setTimeout(() => setStaffToast(null), 2600);
  }, []);

  const handleCheckIn = async (b: IntakeBooking) => {
    if (checkedIn.has(b.bookingId) || checkingId) return;
    setCheckingId(b.bookingId);
    try {
      await logConsentToSheet({
        timestampIso: new Date().toISOString(),
        bookingId: b.bookingId,
        customerName: b.fullNamePassport || b.customerName,
        tourCode: b.tourCode,
        consentStatus: 'CHECKED_IN',
      });
      setCheckedIn((prev) => new Set(prev).add(b.bookingId));
      flashToast('ok', lang === 'TH' ? `เช็คอิน ${b.customerName} แล้ว` : `Checked in ${b.customerName}`);
    } catch (e) {
      flashToast('err', e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setCheckingId(null);
    }
  };

  const submitExpense = async () => {
    const amount = Number(expAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      flashToast('err', lang === 'TH' ? 'กรอกจำนวนเงินให้ถูกต้อง' : 'Enter a valid amount');
      return;
    }
    setExpBusy(true);
    try {
      const expense: Expense = {
        id: crypto.randomUUID(),
        tour_id: assignedTourCode || null,
        amount_aud: Math.round(amount * 100) / 100,
        has_gst: expHasGst,
        gst_amount_aud: expHasGst ? Math.round((amount / 11) * 100) / 100 : 0,
        ato_category: expCategory,
        vendor_name: expVendor.trim() || 'Unknown',
        receipt_filename: '',
        is_synced: false,
        created_at: new Date().toISOString(),
      };
      await saveExpenseLocally(expense, new Blob([], { type: 'application/octet-stream' }));
      setExpAmount('');
      setExpVendor('');
      flashToast('ok', lang === 'TH' ? 'บันทึกค่าใช้จ่ายแล้ว (ออฟไลน์)' : 'Expense saved (offline)');
    } catch (e) {
      flashToast('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setExpBusy(false);
    }
  };

  const assignedTourCode = (params.get('tourCode') || sessionStorage.getItem('t2t_staff_tourCode') || '').trim();
  const assignedTripDate = (params.get('date') || sessionStorage.getItem('t2t_staff_tripDate') || '').trim();

  const exit = () => {
    sessionStorage.removeItem('trip2talk_role');
    onLogout();
    navigate('/', { replace: true });
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
      const res = await fetch(`${gasUrl}?action=getBookings`, { method: 'GET', cache: 'no-store' });
      const json = (await res.json()) as any;
      const arr = json?.bookings ?? json?.data ?? [];
      const normalized: IntakeBooking[] = (Array.isArray(arr) ? arr : [])
        .map((r: any) => ({
          bookingId: String(r.bookingId || '').trim(),
          customerName: String(r.customerName || '').trim(),
          tourCode: String(r.tourCode || '').trim(),
          tourDate: String(r.tourDate || '').trim(),
          intakeStatus: String(r.intakeStatus || '').trim() || 'Pending',
          bookingStatus: String(r.bookingStatus || '').trim(),
          // Requires GAS `readBookings_()` to include these columns for full functionality.
          fullNamePassport: String(r.fullNamePassport || r['Full Name Passport'] || '').trim(),
          dob: String(r.dob || r['DOB'] || '').trim(),
          emergencyContact: String(r.emergencyContact || r['Emergency Contact'] || '').trim(),
          dietaryReq: String(r.dietaryReq || r['Dietary Req'] || '').trim(),
          medicalCondition: String(r.medicalCondition || r['Medical Condition'] || '').trim(),
          motionSickness: String(r.motionSickness || r['Motion Sickness'] || '').trim(),
          photoStyle: String(r.photoStyle || r['Photo Style'] || '').trim(),
          pickupDisplay: String(r.pickupDisplay || '').trim(),
        }))
        .filter((b) => Boolean(b.bookingId));

      setBookings(normalized);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadManifest = useCallback(async () => {
    setManifestError(null);
    try {
      const rows = await fetchConfirmedBookings();
      setManifestBookings(rows);
    } catch (e) {
      if (e instanceof BookingsTableMissingError) {
        setManifestError(
          lang === 'TH'
            ? 'ยังไม่ได้ตั้งค่าตาราง bookings ใน Supabase (รัน supabase/14-schema-receipts-bookings.sql)'
            : 'Bookings table not set up in Supabase yet (run supabase/14-schema-receipts-bookings.sql)'
        );
      } else {
        setManifestError(e instanceof Error ? e.message : 'Failed to load intake manifest');
      }
      setManifestBookings([]);
    }
  }, [lang]);

  useEffect(() => {
    void loadManifest();
  }, [loadManifest]);

  const scoped = useMemo(() => {
    let rows = bookings;
    if (assignedTourCode) {
      rows = rows.filter((b) => b.tourCode.toUpperCase() === assignedTourCode.toUpperCase());
    }
    if (assignedTripDate) {
      rows = rows.filter((b) => (b.tourDate || '').slice(0, 10) === assignedTripDate.slice(0, 10));
    }
    return rows;
  }, [bookings, assignedTourCode, assignedTripDate]);

  const critical = useMemo(() => {
    return scoped.filter((b) => Boolean(b.medicalCondition.trim()) || isSeafoodAllergy(b.dietaryReq));
  }, [scoped]);

  const dietaryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of scoped) {
      for (const f of parseDietaryFlags(b.dietaryReq)) {
        counts.set(f, (counts.get(f) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [scoped]);

  const motionCount = useMemo(() => {
    return scoped.filter((b) => String(b.motionSickness || '').toLowerCase() === 'yes').length;
  }, [scoped]);

  const downloadManifest = () => {
    const title = `${assignedTourCode || 'Trip'} Manifest`;
    const html = printableHtml(title, scoped);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY, color: 'white' }}>
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: NAVY, color: 'white' }}>
      <header className="sticky top-0 z-40 border-b border-white/10" style={{ background: 'rgba(13,27,42,0.92)' }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.28em]" style={{ color: GOLD }}>
              STAFF DASHBOARD
            </p>
            <p className="text-xs font-mono text-white/70 truncate">
              {assignedTourCode ? `Trip: ${assignedTourCode}` : 'Trip: (not set)'}
              {assignedTripDate ? ` • Date: ${assignedTripDate}` : ''}
            </p>
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
        {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        {staffToast && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              staffToast.tone === 'ok'
                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                : 'border-red-400/30 bg-red-500/10 text-red-200'
            }`}
          >
            {staffToast.msg}
          </div>
        )}

        {/* Quick expense drop */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
            {lang === 'TH' ? 'บันทึกค่าใช้จ่ายด่วน' : 'Quick expense drop'}
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <label className="block">
              <span className="text-xs text-white/60">{lang === 'TH' ? 'จำนวน (AUD)' : 'Amount (AUD)'}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/60">{lang === 'TH' ? 'หมวด ATO' : 'ATO category'}</span>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as ATOCategory)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white"
              >
                {ATO_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2 lg:col-span-1">
              <span className="text-xs text-white/60">{lang === 'TH' ? 'ร้านค้า / ผู้ขาย' : 'Vendor'}</span>
              <input
                type="text"
                value={expVendor}
                onChange={(e) => setExpVendor(e.target.value)}
                placeholder={lang === 'TH' ? 'เช่น ปั๊มน้ำมัน' : 'e.g. Fuel station'}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white"
              />
            </label>
            <label className="flex items-center gap-2 mt-5">
              <input type="checkbox" checked={expHasGst} onChange={(e) => setExpHasGst(e.target.checked)} className="h-4 w-4" />
              <span className="text-xs text-white/70">{lang === 'TH' ? 'รวม GST' : 'Has GST'}</span>
            </label>
            <button
              type="button"
              disabled={expBusy}
              onClick={() => void submitExpense()}
              className="mt-5 px-4 py-2.5 rounded-full text-sm font-semibold border disabled:opacity-50"
              style={{ borderColor: TEAL, color: NAVY, background: TEAL }}
            >
              {expBusy ? '…' : lang === 'TH' ? 'บันทึก' : 'Save expense'}
            </button>
          </div>
        </section>

        <ReceiptUploadSection lang={lang} tripCode={assignedTourCode} onToast={flashToast} />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
            {lang === 'TH' ? 'Critical Safety Briefing' : 'Critical Safety Briefing'}
          </h2>
          {critical.length === 0 ? (
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              ✅ {lang === 'TH' ? 'ไม่มีเคสเสี่ยงด้านสุขภาพสำหรับทริปนี้' : 'No medical alerts for this trip'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {critical.map((b) => (
                <div key={b.bookingId} className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4">
                  <p className="font-semibold text-red-100">
                    {b.fullNamePassport || b.customerName}{' '}
                    <span className="text-xs font-mono text-white/50">({b.bookingId})</span>
                  </p>
                  {b.medicalCondition.trim() && (
                    <p className="text-sm text-white/80 mt-2">
                      <span className="font-semibold text-red-200">Medical:</span> {b.medicalCondition}
                    </p>
                  )}
                  {isSeafoodAllergy(b.dietaryReq) && (
                    <p className="text-sm text-white/80 mt-2">
                      <span className="font-semibold text-red-200">Dietary:</span> 🦐 Seafood allergy
                    </p>
                  )}
                  {b.emergencyContact.trim() && (
                    <p className="text-sm text-white/80 mt-2">
                      <span className="font-semibold text-red-200">Emergency:</span> {b.emergencyContact}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
              {lang === 'TH' ? 'Intake Manifest' : 'Intake Manifest'}
            </h2>
            <button
              type="button"
              onClick={() => void loadManifest()}
              className="text-xs font-mono text-white/70 hover:text-white"
            >
              {lang === 'TH' ? 'รีเฟรช' : 'Refresh'}
            </button>
          </div>
          {manifestError && (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
              {manifestError}
            </div>
          )}
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
            <table className="min-w-[820px] w-full text-left">
              <thead className="text-[11px] uppercase tracking-wider text-white/60">
                <tr className="border-b border-white/10">
                  <th className="p-3">Booking ID</th>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Trip</th>
                  <th className="p-3">Departure Date</th>
                  <th className="p-3">Intake Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {manifestBookings.length === 0 ? (
                  <tr>
                    <td className="p-4 text-white/60" colSpan={5}>
                      {lang === 'TH' ? 'ไม่มีการจองที่ยืนยันแล้ว' : 'No confirmed bookings in Supabase'}
                    </td>
                  </tr>
                ) : (
                  manifestBookings.map((b) => {
                    const bookingRef = b.external_id || b.id;
                    const intakeComplete = b.intake_status === 'complete';
                    return (
                      <tr key={b.id} className="border-b border-white/5">
                        <td className="p-3 font-mono text-xs" style={{ color: TEAL }}>
                          {bookingRef}
                        </td>
                        <td className="p-3">{b.client_name}</td>
                        <td className="p-3">{b.trip_name || b.trip_id || '—'}</td>
                        <td className="p-3 font-mono text-xs text-white/70">{b.departure_date || '—'}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setIntakeTarget(b)}
                            className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold ${
                              intakeComplete
                                ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25'
                                : 'bg-amber-500/15 text-amber-200 border-amber-400/25'
                            }`}
                          >
                            {intakeComplete ? 'complete' : 'pending'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
            {lang === 'TH' ? 'Warnings Summary' : 'Warnings Summary'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">Dietary counts</p>
              {dietaryCounts.length === 0 ? (
                <p className="text-sm mt-2 text-white/70">—</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {dietaryCounts.map(([k, n]) => (
                    <li key={k} className="text-white/80">
                      {n} × {k.replaceAll('_', ' ')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">Motion sickness</p>
              <p className="text-sm mt-2 text-white/80">
                {motionCount > 0 ? `${motionCount} person — assign front seat` : lang === 'TH' ? 'ไม่มี' : 'None'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/60">Manifest size</p>
              <p className="text-sm mt-2 text-white/80">{scoped.length} bookings</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide" style={{ color: GOLD }}>
              {lang === 'TH' ? 'Tour Manifest' : 'Tour Manifest'}
            </h2>
            <button
              type="button"
              onClick={downloadManifest}
              className="px-4 py-2 rounded-full text-xs font-semibold border"
              style={{ borderColor: TEAL, color: NAVY, background: TEAL }}
            >
              📄 DOWNLOAD MANIFEST
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead className="text-[11px] uppercase tracking-wider text-white/60">
                <tr className="border-b border-white/10">
                  <th className="p-3">Name</th>
                  <th className="p-3">Icons</th>
                  <th className="p-3">Photo Style</th>
                  <th className="p-3">Motion</th>
                  <th className="p-3">Birthday</th>
                  <th className="p-3">Emergency</th>
                  <th className="p-3">Check-in</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {scoped.length === 0 ? (
                  <tr>
                    <td className="p-4 text-white/60" colSpan={7}>
                      {lang === 'TH' ? 'ไม่มีข้อมูลสำหรับทริปนี้' : 'No bookings for this trip'}
                    </td>
                  </tr>
                ) : (
                  scoped.map((b) => {
                    const dietary = parseDietaryFlags(b.dietaryReq);
                    const hasMed = Boolean(b.medicalCondition.trim());
                    const icons = [...dietary.map(dietaryBadge), ...(hasMed ? ['💊'] : [])].join(' ');
                    const showCake = isBirthdayOnTrip(b.dob, b.tourDate);
                    return (
                      <tr key={b.bookingId} className="border-b border-white/5">
                        <td className="p-3">
                          <p className="font-semibold text-white/90">{b.fullNamePassport || b.customerName}</p>
                          <p className="text-xs font-mono text-white/50">{b.bookingId}</p>
                        </td>
                        <td className="p-3 text-white/80">{icons || '—'}</td>
                        <td className="p-3 text-white/80">
                          {photoEmoji(b.photoStyle)} <span className="text-xs">{b.photoStyle || '—'}</span>
                        </td>
                        <td className="p-3 text-white/80">
                          {String(b.motionSickness || '').toLowerCase() === 'yes' ? 'YES' : '—'}
                        </td>
                        <td className="p-3 text-white/80">{showCake ? '🎂' : '—'}</td>
                        <td className="p-3 text-white/80">
                          {b.emergencyContact ? (
                            <details>
                              <summary className="cursor-pointer select-none">📞</summary>
                              <p className="text-xs mt-1 text-white/80">{b.emergencyContact}</p>
                            </details>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-3">
                          {checkedIn.has(b.bookingId) ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold bg-emerald-500/15 text-emerald-200 border-emerald-400/25">
                              ✅ {lang === 'TH' ? 'เช็คอินแล้ว' : 'Checked in'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={checkingId === b.bookingId}
                              onClick={() => void handleCheckIn(b)}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-50"
                            >
                              {checkingId === b.bookingId ? '…' : lang === 'TH' ? 'เช็คอิน' : 'Check in'}
                            </button>
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

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/70">
            {lang === 'TH'
              ? 'PSO Brief + Trip Status Pipeline จะเปิดใช้หลัง sync Supabase'
              : 'PSO Brief + Trip Status Pipeline will be enabled after Supabase sync.'}
          </p>
        </section>
      </main>

      {intakeTarget && (
        <IntakeFormModal
          bookingId={intakeTarget.external_id || intakeTarget.id}
          tourCode={intakeTarget.trip_id || ''}
          language={lang}
          defaultFullName={intakeTarget.client_name}
          onComplete={() => {
            setIntakeTarget(null);
            void loadManifest();
          }}
        />
      )}
    </div>
  );
}
