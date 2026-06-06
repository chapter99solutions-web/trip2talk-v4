import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { formatAUD } from '../lib/payidCalc';
import {
  fetchAvailableTourDates,
  formatTourDateRangeLabel,
  resolveTripById,
  type AvailableTourDate,
} from '../lib/publicTours';
import { quoteTripTotal, resolveTripSizeTier } from '../lib/bookingPolicy';
import TripSizeTierBadge from '../components/cyber/TripSizeTierBadge';
import BookingPolicyPanel from '../components/policy/BookingPolicyPanel';
import { generateBookingRef } from '../lib/bookingRef';
import { BookingDuplicateEmailError } from '../lib/bookingDuplicate';
import {
  runPhase2Book,
  DateFullyBookedError,
  TripFullError,
  TripNotOpenError,
} from '../lib/customerJourney';
import { PORTFOLIO_TOURS } from '../lib/portfolioTours';
import {
  shouldBlockSharedLowPaxNearDate,
  PRICING,
} from '../lib/bookingRules';
import { ONE_DAY_PICKUP_OPTIONS } from '../lib/pickup-options';
import { fetchEnquiryGalleryPhotos, type EnquiryGalleryPhoto } from '../lib/galleryStorage';
import WaiverForm from '../components/WaiverForm';
import {
  buildMedicalNotesFromWaiver,
  EMPTY_WAIVER_FORM,
  isWaiverFormValid,
  photoConsentFromWaiver,
  type WaiverFormData,
} from '../types/waiverForm';

type Step = 1 | 2 | 3 | 4 | 5;
type VisaType = 'student' | 'other';
type PackageId = 'STANDARD' | 'SESSION' | 'VIP';

const PAYID = 'trip2talk...';
const FACEBOOK_CONTACT_URL = 'https://m.me/TriptoTalk';
const ENQUIRY_EMAIL = 'trip2talksyd@gmail.com';
const CHECKOUT_BANNER_VIDEO_URL =
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/VDO/cover/make_this_come_alive_sec.mp4';

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

export default function BookingCheckout() {
  const { tourId } = useParams<{ tourId: string }>();
  const [search] = useSearchParams();
  const [trip, setTrip] = useState<Awaited<ReturnType<typeof resolveTripById>>>(undefined);
  const [tripLookupDone, setTripLookupDone] = useState(!tourId);
  const initialPax = Math.min(6, Math.max(1, Number(search.get('pax')) || 4));
  const [step, setStep] = useState<Step>(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDateLabel, setSelectedDateLabel] = useState('');
  const [availableDates, setAvailableDates] = useState<AvailableTourDate[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [enquiryGalleryPhotos, setEnquiryGalleryPhotos] = useState<EnquiryGalleryPhoto[]>([]);
  const [enquiryLightboxUrl, setEnquiryLightboxUrl] = useState<string | null>(null);
  const [partyPax, setPartyPax] = useState(initialPax);

  const [pkg, setPkg] = useState<PackageId>('STANDARD');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // PICKUP RULE:
  // The option set + label adapt to the tour type derived from the tour code
  // (see pickupConfig below): 1DAY → day-trip pickups, otherwise → all multi-day
  // tours share one Sydney Airport meeting-point set (we fly together from Sydney).
  const [pickupLocation, setPickupLocation] = useState<string>('thaitown_main');
  const [hotelName, setHotelName] = useState('');
  const [visaType, setVisaType] = useState<VisaType>('student');
  const [oshc, setOshc] = useState('');

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [waiverForm, setWaiverForm] = useState<WaiverFormData>(EMPTY_WAIVER_FORM);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  /** Snapshot at submit time — success screen must not rely on form state that can clear. */
  const [bookingConfirmation, setBookingConfirmation] = useState<{
    ref: string;
    customerName: string;
    customerEmail: string;
    tourName: string;
    tripCode: string;
  } | null>(null);

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
        helper: undefined as string | undefined,
        options: ONE_DAY_PICKUP_OPTIONS.map((p) => ({
          value: p.id as string,
          label: p.labelEn,
        })),
      };
    }
    // All multi-day tours (MEL-4D3N, ULU-4D3N, NZ-6D5N, …) fly together from
    // Sydney, so they share ONE Sydney Airport meeting-point set.
    return {
      kind: 'multiday' as const,
      label: 'Meeting point (Sydney Airport)',
      helper: 'เราบินพร้อมกันจากซิดนีย์ — นัดเจอกันที่สนามบิน Sydney' as string | undefined,
      options: [
        { value: 'syd_t1', label: 'Sydney International Airport T1 (Qantas/Jetstar)' },
        { value: 'syd_t2', label: 'Sydney International Airport T2 (Virgin/Rex)' },
        { value: 'self_arrange', label: "Self-arrange (I'll meet at destination)" },
      ],
    };
  }, [tourId, trip?.trip_code]);

  useEffect(() => {
    let cancelled = false;
    if (!tourId) {
      setTrip(undefined);
      setTripLookupDone(true);
      return;
    }
    setTripLookupDone(false);
    void resolveTripById(tourId).then((row) => {
      if (cancelled) return;
      setTrip(row);
      setTripLookupDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  const tripCodeForLookup = trip?.trip_code;
  const hasAvailableDates = availableDates.length > 0;

  useEffect(() => {
    let cancelled = false;
    if (!tripCodeForLookup) {
      setAvailableDates([]);
      return;
    }
    setDatesLoading(true);
    void fetchAvailableTourDates(tripCodeForLookup).then((rows) => {
      if (cancelled) return;
      setAvailableDates(rows);
      setDatesLoading(false);
      if (rows.length > 0) {
        const primary = rows[0];
        setSelectedDate(primary.start_date);
        setSelectedDateLabel(formatTourDateRangeLabel(primary.start_date, primary.end_date));
      } else {
        setSelectedDate('');
        setSelectedDateLabel('');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tripCodeForLookup]);

  useEffect(() => {
    let cancelled = false;
    void fetchEnquiryGalleryPhotos(4).then((photos) => {
      if (cancelled) return;
      setEnquiryGalleryPhotos(photos);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // If the currently-selected pickup is not valid for the active tour type
  // (e.g. tour code changed, or stale state), reset to the first option so the
  // form never submits a stale/invalid value.
  useEffect(() => {
    const values = pickupConfig.options.map((o) => o.value);
    if (!values.includes(pickupLocation)) {
      setPickupLocation(pickupConfig.options[0]?.value ?? '');
    }
  }, [pickupConfig, pickupLocation]);

  if (!tripLookupDone) {
    return null;
  }

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

  const tourPhoto =
    portfolio?.image ??
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80';
  const tourName = portfolio?.title ?? trip.destination;
  const enquirySubject = `สอบถามทริป ${tourName}`;
  const enquiryBody = `สวัสดีครับ/ค่ะ\n\nสนใจทริป: ${tourName}\nจำนวนคน: \nช่วงเวลาที่สะดวก: `;
  const enquiryMailtoHref = `mailto:${ENQUIRY_EMAIL}?subject=${encodeURIComponent(enquirySubject)}&body=${encodeURIComponent(enquiryBody)}`;

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

  const tripStartIso = selectedDate || undefined;
  const tripStartDate = tripStartIso ? new Date(tripStartIso) : null;
  const installment2Due = tripStartDate ? new Date(tripStartDate) : null;
  if (installment2Due) installment2Due.setDate(installment2Due.getDate() - 20);

  const fmtThaiDate = (d: Date) =>
    d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  const canProceedStep1 = hasAvailableDates && Boolean(selectedDate) && quote?.valid;

  const pickupRequiresSuburb =
    pickupConfig.kind === 'day' && pickupLocation === 'route_waypoint';

  const canProceedStep3 =
    fullName.trim() &&
    phone.trim() &&
    email.trim() &&
    (!pickupRequiresSuburb || hotelName.trim()) &&
    (visaType !== 'student' || oshc.trim());

  const canProceedStep4 = isWaiverFormValid(waiverForm);
  const photoConsent = photoConsentFromWaiver(waiverForm);

  const handleConfirm = async () => {
    console.log('SUBMIT FIRED');
    console.log('[Trip2Talk] handleConfirm fired', {
      termsAccepted,
      quoteValid: quote?.valid,
      canProceedStep3,
      blockedByBuffer,
    });

    if (submitting) return;
    if (!selectedDate) {
      setSubmitError('กรุณาเลือกรอบเดินทางที่เปิดรับจอง');
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!termsAccepted) {
      setSubmitError('กรุณายอมรับเงื่อนไขการใช้บริการก่อนยืนยันการจอง');
      return;
    }
    if (!canProceedStep4) {
      setSubmitError('กรุณากรอกหนังสือยินยอมให้ครบทุกข้อที่จำเป็น');
      setStep(4);
      return;
    }
    if (!emergencyName.trim() || !emergencyPhone.trim()) {
      setSubmitError('กรุณากรอกชื่อและเบอร์ผู้ติดต่อฉุกเฉิน');
      return;
    }
    if (!quote?.valid) {
      setSubmitError('จำนวนผู้เดินทางไม่ถูกต้อง — กรุณากลับไปเลือกจำนวนคนใหม่');
      return;
    }
    if (!canProceedStep3) {
      setSubmitError('กรุณากรอกข้อมูลให้ครบ (ชื่อ, เบอร์, อีเมล, OSHC สำหรับวีซ่านักเรียน)');
      return;
    }
    if (blockedByBuffer) {
      setSubmitError(
        'ทริปนี้ยังไม่ถึงจำนวนขั้นต่ำ และใกล้วันเดินทางเกินไป — กรุณาอัปเกรดเป็น Private Luxury Trip'
      );
      return;
    }

    const validPickupValues = pickupConfig.options.map((o) => o.value);
    if (!validPickupValues.includes(pickupLocation)) {
      setSubmitError('Please select a valid pickup / meeting point.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const reference_number = generateBookingRef();
    const termsAcceptedAt = new Date().toISOString();

    try {
      const { bookingId, warnings } = await runPhase2Book({
        tourId: trip.id,
        tripCode: trip.trip_code,
        tourName,
        fullName,
        phone,
        email,
        depositAud,
        referenceNumber: reference_number,
        partyPax,
        tripSizeTier: resolveTripSizeTier(partyPax) ?? undefined,
        pickup: pickupLocation,
        departureDate: selectedDate,
        photoConsent,
        emergencyName: emergencyName.trim(),
        emergencyPhone: emergencyPhone.trim(),
        medicalNotes: buildMedicalNotesFromWaiver(waiverForm),
        termsAcceptedAt,
        waiverData: {
          ...waiverForm,
          signedAt: termsAcceptedAt,
        },
      });

      if (warnings.length > 0) {
        console.warn('[Trip2Talk] Phase 2 (book) warnings:', warnings);
      }

      if (!bookingId) {
        const detail = warnings.length > 0 ? warnings.join('; ') : 'Booking was not saved to the database';
        setSubmitError(detail);
        console.error('[Trip2Talk] Phase 2 (book) completed without bookingId:', warnings);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Task 3: Resend confirmation email (best-effort; do not block booking UI)
      try {
        await fetch('/api/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            bookingRef: reference_number,
            customerName: fullName,
            customerEmail: email,
            tripCode: trip.trip_code,
            tripName: tourName,
            departureDate: selectedDate,
            pax: partyPax,
            totalAud,
            payId: PAYID,
          }),
        });
      } catch (e) {
        console.warn('[Trip2Talk] send-confirmation failed:', e);
      }

      setBookingConfirmation({
        ref: reference_number,
        customerName: fullName.trim(),
        customerEmail: email.trim(),
        tourName,
        tripCode: trip.trip_code,
      });
      setBookingRef(reference_number);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      // กรณีวันเต็ม (ชน UNIQUE constraint) — แสดงข้อความไทย, รีเฟรช availability,
      // และ "ไม่" แสดงหน้าจอจองสำเร็จ (ไม่ setBookingRef).
      if (err instanceof DateFullyBookedError) {
        setSubmitError(err.message);
        setStep(1);
        return;
      }
      if (err instanceof TripFullError) {
        setSubmitError('ที่นั่งเต็มแล้ว');
        setStep(1);
        return;
      }
      if (err instanceof TripNotOpenError) {
        setSubmitError('ยังไม่มีวันเดินทาง กรุณาติดต่อเจ้าหน้าที่');
        setStep(1);
        return;
      }
      if (err instanceof BookingDuplicateEmailError) {
        setSubmitError(err.message);
        return;
      }
      const msg = err instanceof Error ? err.message : 'Booking failed';
      setSubmitError(msg);
      console.error('[Trip2Talk] Phase 2 (book) failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (bookingRef && bookingConfirmation) {
    const { customerName, customerEmail, tourName: confirmedTourName, tripCode, ref } =
      bookingConfirmation;
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-4xl text-teal">✓</div>
        <h1 className="font-serif text-xl text-slate-900">Booking confirmed</h1>
        <p className="font-mono text-lg font-semibold text-navy tracking-wide">{ref}</p>
        <p className="text-sm text-slate-600">
          We will confirm your Private Photo Journey for{' '}
          <span className="font-semibold text-slate-900">{confirmedTourName}</span>
          <span className="font-mono text-slate-500"> ({tripCode})</span> and email PayID payment
          details to{' '}
          <span className="font-semibold text-slate-900">{customerName || 'you'}</span>
          {customerEmail ? (
            <>
              {' '}
              at <span className="font-semibold text-slate-900">{customerEmail}</span>
            </>
          ) : null}
          .
        </p>
        <Link
          to={`/trip/${ref}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors"
        >
          Open trip hub <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full aspect-video max-h-[200px] sm:max-h-[300px] overflow-hidden bg-black">
        <video
          src={CHECKOUT_BANNER_VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-white" />
        <p
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-base sm:text-lg font-bold text-white"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.85)' }}
        >
          🔥 ที่นั่งใกล้เต็มแล้ว — จองก่อนหมด
        </p>
      </div>

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
          Step <span className="font-semibold text-slate-900">{step}</span> / 5
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
        <div
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {submitError}
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-5">
          <h2 className="font-serif text-xl font-semibold text-slate-900">เลือกรอบ &amp; จำนวนผู้เดินทาง</h2>

          {datesLoading ? (
            <p className="text-sm text-slate-500">กำลังโหลดรอบ…</p>
          ) : hasAvailableDates ? (
            <div className="space-y-2">
              {availableDates.map((row) => {
                const label = formatTourDateRangeLabel(row.start_date, row.end_date);
                return (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-teal/30 bg-teal/5 px-4 py-3 text-slate-900"
                  >
                    <p className="font-semibold">📅 {label}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      วันเดินทางกำหนดโดยทีมงาน — ลูกค้าไม่สามารถเปลี่ยนวันได้
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-3">
              <p className="text-sm text-slate-800 font-medium">
                รอบถัดไปกำลังเปิด — ติดต่อเราทาง Facebook หรืออีเมล
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href={FACEBOOK_CONTACT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-[#0084FF] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  💬 Facebook Messenger
                </a>
                <a
                  href={enquiryMailtoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  ✉️ อีเมลหาเรา
                </a>
              </div>
              {enquiryGalleryPhotos.length > 0 && (
                <div className="pt-1 space-y-2">
                  <div
                    className={`grid gap-2 ${
                      enquiryGalleryPhotos.length === 1
                        ? 'grid-cols-1 max-w-[12rem] mx-auto'
                        : 'grid-cols-2'
                    }`}
                  >
                    {enquiryGalleryPhotos.map((photo) => (
                      <button
                        key={photo.fileName}
                        type="button"
                        onClick={() => setEnquiryLightboxUrl(photo.url)}
                        className="rounded-xl overflow-hidden border border-amber-100 focus:outline-none focus:ring-2 focus:ring-teal/40"
                      >
                        <img
                          src={photo.url}
                          alt={`ทริป Trip2Talk — ${photo.fileName}`}
                          className="aspect-square w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-xs text-slate-600">
                    ภาพจากทริปจริง — ถ่ายโดยช่างภาพ Trip2Talk
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs text-slate-500 block mb-1">Guests</label>
            <div className="flex items-center gap-2 max-w-xs">
              <button
                type="button"
                onClick={() => setPartyPax((p) => clamp(p - 1, 1, 6))}
                className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
              >
                −
              </button>
              <div className="flex-1 text-center rounded-xl border border-slate-200 bg-white py-2 font-semibold text-slate-900">
                {partyPax}
              </div>
              <button
                type="button"
                onClick={() => setPartyPax((p) => clamp(p + 1, 1, 6))}
                className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
              >
                +
              </button>
            </div>
            {quote?.tier && <div className="mt-2">{<TripSizeTierBadge tier={quote.tier} />}</div>}
          </div>

          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {submitError}
            </div>
          )}

          {hasAvailableDates && (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-full bg-teal text-navy font-semibold text-sm disabled:opacity-40"
              >
                Continue <span aria-hidden>→</span>
              </button>
            </div>
          )}
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
              {pickupConfig.helper && (
                <p className="mt-1 text-xs text-slate-500">{pickupConfig.helper}</p>
              )}
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

      {/* Step 4 — Waiver & Consent */}
      {step === 4 && (
        <div className="space-y-4">
          <WaiverForm value={waiverForm} onChange={setWaiverForm} />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canProceedStep4}
              onClick={() => setStep(5)}
              className="px-5 py-2.5 rounded-full bg-teal text-navy font-semibold text-sm disabled:opacity-40"
            >
              Continue <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 5 — Summary & confirm */}
      {step === 5 && (
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
                <span className="font-mono text-white/90 text-right">
                  {selectedDateLabel || selectedDate || '—'}
                </span>
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

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              ชื่อผู้ติดต่อฉุกเฉิน / Emergency Contact Name
              <span className="text-red-600"> *</span>
            </p>
            <input
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
              required
            />
            <div>
              <label className="text-sm font-semibold text-slate-900 block mb-1">
                เบอร์โทร / Phone <span className="text-red-600">*</span>
              </label>
              <input
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
                required
              />
            </div>
          </div>

          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {submitError}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={
              submitting ||
              !termsAccepted ||
              !canProceedStep4 ||
              !emergencyName.trim() ||
              !emergencyPhone.trim()
            }
            className="w-full inline-flex justify-center items-center py-3 rounded-xl bg-teal text-navy font-semibold text-sm disabled:opacity-40"
          >
            {submitting
              ? 'Confirming…'
              : !termsAccepted
                ? 'Accept terms to confirm'
                : !canProceedStep4
                  ? 'Complete waiver to confirm'
                  : !emergencyName.trim() || !emergencyPhone.trim()
                    ? 'Add emergency contact to confirm'
                    : 'Confirm Booking'}
          </button>

          <div className="rounded-2xl bg-white border border-slate-100 p-4">
            <BookingPolicyPanel tour={trip} partyPax={partyPax} onPartyPaxChange={setPartyPax} paidAud={depositAud} compact />
          </div>
        </div>
      )}
      </div>

      {enquiryLightboxUrl && (
        <button
          type="button"
          aria-label="ปิดภาพ"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setEnquiryLightboxUrl(null)}
        >
          <img
            src={enquiryLightboxUrl}
            alt="ภาพจากทริป Trip2Talk"
            className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      )}
    </>
  );
}
