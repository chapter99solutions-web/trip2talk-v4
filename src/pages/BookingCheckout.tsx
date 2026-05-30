import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { formatAUD } from '../lib/payidCalc';
import { findTripById } from '../lib/publicTours';
import { findTourFallbackByCode } from '../data/tours';
import { quoteTripTotal, resolveTripSizeTier } from '../lib/bookingPolicy';
import TripSizeTierBadge from '../components/cyber/TripSizeTierBadge';
import BookingPolicyPanel from '../components/policy/BookingPolicyPanel';
import { generateBookingRef } from '../lib/bookingRef';
import { runPhase2Book } from '../lib/customerJourney';
import { PORTFOLIO_TOURS } from '../lib/portfolioTours';
import {
  shouldBlockSharedLowPaxNearDate,
  PRICING,
} from '../lib/bookingRules';
import { ONE_DAY_PICKUP_OPTIONS } from '../lib/pickup-options';

type Step = 1 | 2 | 3 | 4;
type VisaType = 'student' | 'other';
type PackageId = 'STANDARD' | 'SESSION' | 'VIP';

const PAYID = 'trip2talk...';

const PACKAGES: Array<{
  id: PackageId;
  title: string;
  subtitle: string;
  multiplier: number;
  badge?: string;
}> = [
  { id: 'STANDARD', title: 'Standard', subtitle: 'Best value for most groups', multiplier: 1 },
  { id: 'SESSION', title: 'Photography Session', subtitle: 'More shooting time, tighter edit', multiplier: 1.15 },
  { id: 'VIP', title: 'VIP', subtitle: 'Priority delivery + premium pacing', multiplier: 1.35, badge: 'VIP' },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toISODateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function BookingCheckout() {
  const { tourId } = useParams<{ tourId: string }>();
  const [search] = useSearchParams();
  const trip = tourId ? findTripById(tourId) : undefined;
  const initialPax = Math.min(6, Math.max(1, Number(search.get('pax')) || 4));
  const [step, setStep] = useState<Step>(1);
  const [selectedDate, setSelectedDate] = useState<string>(() => toISODateInputValue(new Date()));
  const [partyPax, setPartyPax] = useState(initialPax);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);

  const [pkg, setPkg] = useState<PackageId>('STANDARD');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // PICKUP RULE:
  // The option set + label adapt to the tour type derived from the tour code
  // (see pickupConfig below): 1DAY → day-trip pickups, NZ → New Zealand airports,
  // otherwise → domestic multi-day airport terminals.
  const [pickupLocation, setPickupLocation] = useState<string>('thaitown_main');
  const [hotelName, setHotelName] = useState('');
  const [visaType, setVisaType] = useState<VisaType>('student');
  const [oshc, setOshc] = useState('');

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState<string | null>(null);

  const quote = useMemo(
    () => (trip ? quoteTripTotal(trip.price_aud, partyPax) : null),
    [trip, partyPax]
  );

  // Smart pickup: derive the option set + label from the tour code (route param /
  // trip_code). Recomputes if the code changes so the dropdown always matches the
  // tour type.
  const pickupConfig = useMemo(() => {
    const code = (tourId ?? trip?.trip_code ?? '').toUpperCase();
    if (code.includes('1DAY') || code.includes('1-DAY')) {
      return {
        kind: 'day' as const,
        label: 'Pickup location',
        options: ONE_DAY_PICKUP_OPTIONS.map((p) => ({
          value: p.id as string,
          label: p.labelEn,
        })),
      };
    }
    if (code.includes('NZ')) {
      return {
        kind: 'nz' as const,
        label: 'Meeting point (Airport Terminal)',
        options: [
          { value: 'nz_christchurch', label: 'Christchurch International Airport' },
          { value: 'nz_queenstown', label: 'Queenstown Airport' },
          { value: 'nz_auckland', label: 'Auckland Airport (transit)' },
          { value: 'self_arrange', label: "Self-arrange (I'll meet at destination)" },
        ],
      };
    }
    return {
      kind: 'domestic' as const,
      label: 'Meeting point (Airport Terminal)',
      options: [
        { value: 'syd_t2t3', label: 'Sydney Domestic Airport T2/T3 (Qantas/Virgin)' },
        { value: 'syd_t1', label: 'Sydney Domestic Airport T1 (Jetstar)' },
        { value: 'self_arrange', label: "Self-arrange (I'll meet at destination)" },
      ],
    };
  }, [tourId, trip?.trip_code]);

  if (!trip) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-red-600">
        Trip not found.{' '}
        <Link to="/" className="text-teal hover:underline">
          Home
        </Link>
      </div>
    );
  }

  const portfolio = PORTFOLIO_TOURS.find((t) => t.id === trip.id);
  const isSharedGroup = pkg === 'STANDARD';
  const blockedByBuffer = shouldBlockSharedLowPaxNearDate(isSharedGroup, partyPax, selectedDate);

  // If the currently-selected pickup is not valid for the active tour type
  // (e.g. tour code changed, or stale state), reset to the first option so the
  // form never submits a stale/invalid value.
  useEffect(() => {
    const values = pickupConfig.options.map((o) => o.value);
    if (!values.includes(pickupLocation)) {
      setPickupLocation(pickupConfig.options[0]?.value ?? '');
    }
  }, [pickupConfig, pickupLocation]);

  const tourPhoto =
    portfolio?.image ??
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80';
  const tourName = portfolio?.title ?? trip.destination;

  const packageDef = PACKAGES.find((p) => p.id === pkg) ?? PACKAGES[0];
  const baseTotal = quote?.valid ? quote.totalAud : 0;
  const totalAud = Math.round(baseTotal * packageDef.multiplier * 100) / 100;
  const depositAud = Math.min(500, Math.round(totalAud * 0.3 * 100) / 100);
  const payOnDayAud = Math.max(0, Math.round((totalAud - depositAud) * 100) / 100);

  // Multi-day tours (anything not a 1-day trip) use a 3-installment, interest-free plan.
  // Reuses the same tour-type detection as the pickup field: kind 'day' === 1-day trip.
  const isMultiDay = pickupConfig.kind !== 'day';
  const installmentDeposit = 100;
  const installmentRemaining = Math.max(0, Math.round((totalAud - installmentDeposit) * 100) / 100);
  const installment1 = Math.round((installmentRemaining / 2) * 100) / 100;
  // งวด2 takes the remainder so the two halves sum exactly to `installmentRemaining`.
  const installment2 = Math.round((installmentRemaining - installment1) * 100) / 100;

  const bookingDate = new Date();
  const installment1Due = new Date(bookingDate);
  installment1Due.setDate(installment1Due.getDate() + 30);

  const tripStartIso =
    findTourFallbackByCode(trip.trip_code)?.nextDate ??
    (tourId ? findTourFallbackByCode(tourId)?.nextDate : undefined);
  const tripStartDate = tripStartIso ? new Date(tripStartIso) : null;
  const installment2Due = tripStartDate ? new Date(tripStartDate) : null;
  if (installment2Due) installment2Due.setDate(installment2Due.getDate() - 20);

  const fmtThaiDate = (d: Date) =>
    d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  const canProceedStep1 = Boolean(selectedDate) && quote?.valid;
  const pickupRequiresSuburb =
    pickupConfig.kind === 'day' && pickupLocation === 'route_waypoint';

  const canProceedStep3 =
    fullName.trim() &&
    phone.trim() &&
    email.trim() &&
    (!pickupRequiresSuburb || hotelName.trim()) &&
    (visaType !== 'student' || oshc.trim());

  const handleConfirm = async () => {
    if (submitting) return;
    if (!termsAccepted) return;
    if (!quote?.valid) return;
    if (!canProceedStep3) return;
    if (blockedByBuffer) return;

    const validPickupValues = pickupConfig.options.map((o) => o.value);
    if (!validPickupValues.includes(pickupLocation)) {
      setSubmitError('Please select a valid pickup / meeting point.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const reference_number = generateBookingRef();

    try {
      const { warnings } = await runPhase2Book({
        tourId: trip.id,
        tripCode: trip.trip_code,
        fullName,
        phone,
        email,
        depositAud,
        referenceNumber: reference_number,
        partyPax,
        tripSizeTier: resolveTripSizeTier(partyPax) ?? undefined,
        pickup: pickupLocation,
      });

      if (warnings.length > 0) {
        console.warn('[Trip2Talk] Phase 2 (book) warnings:', warnings);
      }

      setBookingRef(reference_number);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Booking failed';
      setSubmitError(msg);
      console.error('[Trip2Talk] Phase 2 (book) failed:', err);
      setBookingRef(reference_number);
    } finally {
      setSubmitting(false);
    }
  };

  if (bookingRef) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-4xl text-teal">✓</div>
        <h1 className="font-serif text-xl text-slate-900">Booking request received</h1>
        <p className="text-sm text-slate-600">
          We will confirm your Private Photo Journey and send PayID details to {email || 'your email'}.
        </p>
        <p className="text-xs text-slate-500">
          Reference: <span className="font-mono font-semibold text-navy">{bookingRef}</span>
        </p>
        <Link
          to={`/trip/${trip.trip_code}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors"
        >
          Open trip hub <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <Link to={`/tours/${tourId}`} className="text-xs text-slate-500 hover:text-teal">
        ← Trip details
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-slate-900">Checkout</h1>
          <p className="font-mono text-sm text-slate-500 mt-1">
            {trip.trip_code} · {trip.destination}
          </p>
        </div>
        <Link
          to="/package-terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-teal font-semibold hover:underline whitespace-nowrap"
        >
          อ่านเงื่อนไขฉบับเต็ม →
        </Link>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <p>
          Step <span className="font-semibold text-slate-900">{step}</span> / 4
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
            className="px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700"
            disabled={step === 1}
          >
            Back
          </button>
        </div>
      </div>

      {submitError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
          <h2 className="font-serif text-xl font-semibold text-slate-900">Select date & guests</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setAvailabilityChecked(false);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-1">Guests</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPartyPax((p) => clamp(p - 1, 1, 6));
                    setAvailabilityChecked(false);
                  }}
                  className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  −
                </button>
                <div className="flex-1 text-center rounded-xl border border-slate-200 bg-white py-2 font-semibold text-slate-900">
                  {partyPax}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPartyPax((p) => clamp(p + 1, 1, 6));
                    setAvailabilityChecked(false);
                  }}
                  className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                >
                  +
                </button>
              </div>
              {quote?.tier && <div className="mt-2">{<TripSizeTierBadge tier={quote.tier} />}</div>}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAvailabilityChecked(true)}
            disabled={!canProceedStep1}
            className="w-full inline-flex justify-center items-center gap-2 py-3 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors disabled:opacity-40"
          >
            Check Availability <span aria-hidden>→</span>
          </button>

          {availabilityChecked && (
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-700">
              ✅ Available — continue to choose a package.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!availabilityChecked}
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-full bg-teal text-navy font-semibold text-sm disabled:opacity-40"
            >
              Continue <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-slate-900">Choose package</h2>
          <div className="grid gap-3">
            {PACKAGES.map((p) => {
              const active = p.id === pkg;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPkg(p.id)}
                  className={`text-left rounded-2xl border p-5 transition-colors ${
                    active ? 'border-teal bg-slate-50' : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">PACKAGE</p>
                      <p className="text-lg font-semibold text-slate-900 mt-1">{p.title}</p>
                      <p className="text-sm text-slate-500 mt-1">{p.subtitle}</p>
                    </div>
                    {p.badge && (
                      <span className="px-3 py-1 rounded-full bg-teal/15 text-teal text-xs font-semibold">
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Multiplier</span>
                    <span className="font-mono font-semibold text-slate-900">×{p.multiplier}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-full bg-teal text-navy font-semibold text-sm"
            >
              Continue <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
          <h2 className="font-serif text-xl font-semibold text-slate-900">Your details</h2>
          <div className="grid gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">{pickupConfig.label}</label>
              <select
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
              >
                {pickupConfig.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {pickupConfig.kind === 'day' && pickupLocation === 'route_waypoint' && (
                <>
                  <p className="mt-2 text-xs bg-orange-100 border border-orange-400 text-orange-900 rounded-lg p-2">
                    ต้องเป็นย่านที่เป็นทางผ่านหลักเท่านั้น — รอทีมงานคอนเฟิร์มหลังไมค์
                  </p>
                  <input
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                    placeholder="Suburb on main route"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
                    required
                  />
                </>
              )}
            </div>

            {blockedByBuffer && (
              <div className="rounded-xl border border-orange-400 bg-orange-50 p-4 text-sm text-orange-950 space-y-2">
                <p>
                  ทริปนี้ยังไม่ถึงจำนวนขั้นต่ำ และใกล้วันเดินทางเกินไป — แนะนำอัปเกรดเป็น Private Luxury
                  Trip
                </p>
                <button
                  type="button"
                  onClick={() => setPkg('VIP')}
                  className="px-4 py-2 rounded-full bg-gold text-navy font-semibold text-sm"
                >
                  Upgrade to Private ${PRICING.privatePerPerson}/person
                </button>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Visa</label>
                <select
                  value={visaType}
                  onChange={(e) => setVisaType(e.target.value as VisaType)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
                >
                  <option value="student">Student</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">OSHC (สำหรับวีซ่านักเรียน)</label>
                <input
                  value={oshc}
                  onChange={(e) => setOshc(e.target.value)}
                  disabled={visaType !== 'student'}
                  placeholder={visaType === 'student' ? 'Your OSHC membership' : '—'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal/30 disabled:opacity-40"
                  required={visaType === 'student'}
                />
                <p className="text-xs text-gray-400 mt-1">
                  ประกันสุขภาพนักเรียนต่างชาติ (OSHC) — กรอกเลขสมาชิกเพื่อใช้เคลมค่ารักษาพยาบาลหากเกิดอุบัติเหตุระหว่างทริป
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canProceedStep3}
              onClick={() => setStep(4)}
              className="px-5 py-2.5 rounded-full bg-teal text-navy font-semibold text-sm disabled:opacity-40"
            >
              Continue <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-slate-900">Checkout summary</h2>

          <div className="rounded-2xl bg-navy text-white border border-white/10 overflow-hidden">
            <div className="flex gap-4 p-5">
              <img src={tourPhoto} alt={tourName} className="w-24 h-20 rounded-2xl object-cover border border-white/10" />
              <div className="flex-1">
                <p className="text-white/60 text-xs">TRIP</p>
                <p className="font-semibold text-white">{tourName}</p>
                <p className="text-white/60 text-xs mt-1 font-mono">{trip.trip_code}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs">Total</p>
                <p className="text-2xl font-bold text-white">{formatAUD(totalAud)}</p>
              </div>
            </div>

            <div className="px-5 pb-5 space-y-2 text-sm text-white/80">
              <div className="flex justify-between">
                <span>Date</span>
                <span className="font-mono text-white/90">{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Guests</span>
                <span className="font-mono text-white/90">{partyPax}</span>
              </div>
              <div className="flex justify-between">
                <span>Package</span>
                <span className="font-mono text-white/90">{packageDef.title}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Pickup</span>
                <span className="font-mono text-white/90 text-right">
                  {pickupRequiresSuburb && hotelName.trim()
                    ? `📍 ${hotelName.trim()}`
                    : pickupConfig.options.find((o) => o.value === pickupLocation)?.label ?? '—'}
                </span>
              </div>

              <div className="my-3 border-t border-white/10" />

              {isMultiDay ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-green-400">มัดจำ (จ่ายวันนี้)</span>
                    <span className="font-mono font-semibold text-green-400">
                      {formatAUD(installmentDeposit)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/60">
                      งวดที่ 1 — ครบกำหนด {fmtThaiDate(installment1Due)} (30 วันหลังจอง)
                    </span>
                    <span className="font-mono text-white/90 whitespace-nowrap">
                      {formatAUD(installment1)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/60">
                      งวดที่ 2 — ครบกำหนด{' '}
                      {installment2Due ? `${fmtThaiDate(installment2Due)} ` : ''}(ก่อนออกทริป 20 วัน)
                    </span>
                    <span className="font-mono text-white/90 whitespace-nowrap">
                      {formatAUD(installment2)}
                    </span>
                  </div>
                  <p className="text-xs text-white/70">📅 ผ่อนชำระได้ 3 งวด ไม่มีดอกเบี้ย</p>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Deposit now</span>
                    <span className="font-mono font-semibold text-teal">{formatAUD(depositAud)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pay on day</span>
                    <span className="font-mono text-white/90">{formatAUD(payOnDayAud)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-white">
                <span className="font-semibold">Total</span>
                <span className="font-mono font-semibold">{formatAUD(totalAud)}</span>
              </div>

              <div className="my-3 border-t border-white/10" />

              <div className="flex justify-between items-center">
                <span className="text-white/60">PayID</span>
                <span className="font-mono text-white/90">{PAYID}</span>
              </div>
            </div>
          </div>

          {/* 14A — Terms summary (before Confirm) */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 space-y-2">
            <p>
              <span className="font-semibold">⚠️ ไม่รวม:</span> ตั๋วเครื่องบิน / อาหาร / Travel Insurance
            </p>
            <p>
              <span className="font-semibold">📋 ยกเลิก:</span> &gt;60วัน-10% / 31-60วัน-50% / ≤30วัน-ไม่คืน
            </p>
          </div>

          <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 accent-teal shrink-0"
            />
            <span>
              ยอมรับเงื่อนไขการใช้บริการ{' '}
              <Link
                to="/package-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal font-semibold hover:underline"
              >
                (อ่านฉบับเต็ม)
              </Link>
              <span className="text-red-600"> *</span>
            </span>
          </label>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!termsAccepted || submitting}
            className="w-full inline-flex justify-center items-center py-3 rounded-xl bg-teal text-navy font-semibold text-sm disabled:opacity-40"
          >
            {submitting ? 'Confirming…' : 'Confirm Booking'}
          </button>

          <div className="rounded-2xl bg-white border border-slate-100 p-4">
            <BookingPolicyPanel tour={trip} partyPax={partyPax} onPartyPaxChange={setPartyPax} paidAud={depositAud} compact />
          </div>
        </div>
      )}
    </div>
  );
}
