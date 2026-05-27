import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { formatAUD } from '../lib/payidCalc';
import { findTripById } from '../lib/publicTours';
import { quoteTripTotal, resolveTripSizeTier } from '../lib/bookingPolicy';
import TripSizeTierBadge from '../components/cyber/TripSizeTierBadge';
import BookingPolicyPanel from '../components/policy/BookingPolicyPanel';
import { runPhase2Book } from '../lib/customerJourney';
import { PORTFOLIO_TOURS } from '../lib/portfolioTours';
import { sydneyPickupPoints } from '../lib/pickup-options';

type Step = 1 | 2 | 3 | 4;
type VisaType = 'student' | 'other';
type PackageId = 'STANDARD' | 'SESSION' | 'VIP';
type PickupLocationId = (typeof sydneyPickupPoints)[number]['id'];

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
  // 'thaitown_main'        → Standard + Private packages
  // 'custom_accommodation' → Private/Upgrade packages ONLY
  // If Standard package + custom_accommodation selected → show warning
  // (ช่างภาพวนรับ CBD มีค่าใช้จ่ายเพิ่มเติมสำหรับ Standard tier)
  const [pickupLocation, setPickupLocation] = useState<PickupLocationId>('thaitown_main');
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
  const tourPhoto =
    portfolio?.image ??
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80';
  const tourName = portfolio?.title ?? trip.destination;

  const packageDef = PACKAGES.find((p) => p.id === pkg) ?? PACKAGES[0];
  const baseTotal = quote?.valid ? quote.totalAud : 0;
  const totalAud = Math.round(baseTotal * packageDef.multiplier * 100) / 100;
  const depositAud = Math.min(500, Math.round(totalAud * 0.3 * 100) / 100);
  const payOnDayAud = Math.max(0, Math.round((totalAud - depositAud) * 100) / 100);

  const canProceedStep1 = Boolean(selectedDate) && quote?.valid;
  const pickupRequiresHotel = pickupLocation === 'custom_accommodation';
  const pickupWarningStandardCBD = pkg === 'STANDARD' && pickupLocation === 'custom_accommodation';

  const canProceedStep3 =
    fullName.trim() &&
    phone.trim() &&
    email.trim() &&
    (!pickupRequiresHotel || hotelName.trim()) &&
    (visaType !== 'student' || oshc.trim());

  const handleConfirm = async () => {
    if (submitting) return;
    if (!termsAccepted) return;
    if (!quote?.valid) return;
    if (!canProceedStep3) return;

    setSubmitting(true);
    setSubmitError(null);

    const reference_number = `BK-${Math.floor(100000 + Math.random() * 900000)}`;

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
              <label className="text-xs text-slate-500 block mb-1">Pickup location</label>
              <select
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value as PickupLocationId)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
              >
                {sydneyPickupPoints.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {sydneyPickupPoints.find((p) => p.id === pickupLocation)?.description}
              </p>
              {pickupRequiresHotel && (
                <div className="mt-2">
                  <label className="text-xs text-slate-500 block mb-1">Hotel name (CBD)</label>
                  <input
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                    placeholder="e.g. Four Seasons Sydney"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
                    required={pickupRequiresHotel}
                  />
                </div>
              )}
              {pickupWarningStandardCBD && (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  ⚠️ Standard package + รับที่พักในเขต CBD: มีค่าใช้จ่ายเพิ่มเติม (แนะนำเลือก Private/Upgrade)
                </div>
              )}
            </div>

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
                <label className="text-xs text-slate-500 block mb-1">OSHC (if student)</label>
                <input
                  value={oshc}
                  onChange={(e) => setOshc(e.target.value)}
                  disabled={visaType !== 'student'}
                  placeholder={visaType === 'student' ? 'Your OSHC membership' : '—'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal/30 disabled:opacity-40"
                  required={visaType === 'student'}
                />
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
              <div className="flex justify-between">
                <span>Pickup</span>
                <span className="font-mono text-white/90">
                  {pickupLocation === 'custom_accommodation'
                    ? `🏨 ${hotelName || 'CBD hotel'}`
                    : '📍 Thai Town, Sydney'}
                </span>
              </div>

              <div className="my-3 border-t border-white/10" />

              <div className="flex justify-between">
                <span>Deposit now</span>
                <span className="font-mono font-semibold text-teal">{formatAUD(depositAud)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pay on day</span>
                <span className="font-mono text-white/90">{formatAUD(payOnDayAud)}</span>
              </div>
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
              <span className="font-semibold">📋 ยกเลิก:</span> &gt;90วัน-10% / 31-60วัน-50% / ≤30วัน-ไม่คืน
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
