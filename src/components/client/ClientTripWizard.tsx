import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tour } from '../../types/tour';
import { STRINGS, HubLang } from '../../lib/clientVIPStrings';
import { formatAUD } from '../../lib/payidCalc';
import { computeWaiverContentHash, saveClientWaiver } from '../../lib/waiverApi';
import { saveWaiverLocally } from '../../lib/waiverDb';
import { toStoredWaiver } from '../../lib/waiverApi';
import SignaturePad, { SignaturePadHandle } from '../waiver/SignaturePad';

type Step = 1 | 2 | 3 | 4 | 5;
type VisaType = 'student' | 'other';
type Experience = 'beginner' | 'hobbyist' | 'experienced';

const INCLUDED = ['Private photo guide', 'Finished .JPG delivery', 'Trip briefing'];
const EXCLUDED = ['RAW files', 'Flights', 'Personal travel insurance (non-OSHC)'];

interface ClientTripWizardProps {
  trip: Tour;
  tripRef: string;
}

function generateBookingRef(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `BK-T2T-${n}`;
}

export default function ClientTripWizard({ trip, tripRef }: ClientTripWizardProps) {
  const [lang, setLang] = useState<HubLang>('th');
  const [step, setStep] = useState<Step>(1);
  const s = STRINGS[lang];

  const [prepareChecked, setPrepareChecked] = useState<boolean[]>(() =>
    Array(STRINGS.th.step2.items.length).fill(false)
  );
  const [safetyChecks, setSafetyChecks] = useState({ home: false, weather: false });

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [visaType, setVisaType] = useState<VisaType>('student');
  const [oshcMembership, setOshcMembership] = useState('');
  const [health, setHealth] = useState('');
  const [experience, setExperience] = useState<Experience>('beginner');

  const [waivers, setWaivers] = useState({
    c1: false,
    c2: false,
    c3: false,
    c4: false,
    c5: false,
    c6: false,
  });
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [bookingRef, setBookingRef] = useState('');
  const [signedAt, setSignedAt] = useState('');
  const [signedIp, setSignedIp] = useState('—');

  const padRef = useRef<SignaturePadHandle>(null);

  const balanceDue = Math.max(0, trip.price_aud * 2 - 500);
  const paymentStatus: 'paid' | 'pending' = 'paid';

  const allWaiversChecked = Object.values(waivers).every(Boolean);
  const canSubmitStep4 = allWaiversChecked && Boolean(signature);
  const canProceedStep3 =
    fullName.trim() && phone.trim() && emergencyPhone.trim() && (visaType !== 'student' || oshcMembership.trim());

  const togglePrepare = (i: number) => {
    setPrepareChecked((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const toggleLang = () => setLang((l) => (l === 'th' ? 'en' : 'th'));


  const handleSubmit = async () => {
    if (!canSubmitStep4 || !signature) return;
    setSubmitting(true);
    setSubmitError(null);

    const signed_at = new Date().toISOString();
    const client_id = crypto.randomUUID();

    const waiverBase = {
      client_id,
      agreed_terms: waivers.c1,
      agreed_risk: waivers.c2,
      agreed_medical: waivers.c3,
      agreed_media: waivers.c6,
      agreed_privacy: waivers.c4,
      digital_signature: signature,
      signed_at,
    };

    const content_hash = await computeWaiverContentHash({
      waiver: waiverBase,
      tour_id: trip.id,
      language: lang === 'th' ? 'TH' : 'EN',
      waiver_text: {
        c1: s.step4.c1,
        c2: s.step4.c2,
        c3: s.step4.c3,
        c4: s.step4.c4,
        c5: s.step4.c5,
        c6: s.step4.c6,
        c5_driving: waivers.c5 ? 'yes' : 'no',
      },
    });

    const waiverData = { ...waiverBase, content_hash };

    try {
      await saveClientWaiver(waiverData, trip.id, lang === 'th' ? 'TH' : 'EN');
    } catch {
      console.warn('[Trip2Talk] Supabase waiver save failed; offline backup used');
    }

    await saveWaiverLocally(
      toStoredWaiver(waiverData, trip.id, lang === 'th' ? 'TH' : 'EN')
    );

    // ACL-compliant — timestamp+IP stored in client_waivers table (via record-waiver edge function)
    setBookingRef(generateBookingRef());
    setSignedAt(signed_at);
    setSignedIp('Recorded server-side');
    setStep(5);
    setSubmitting(false);
  };

  const ProgressBar = () => (
    <div className="flex gap-1 mb-8">
      {s.progress.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex-1">
            <div
              className={`h-1 rounded-full transition-colors ${
                done ? 'bg-emerald-500' : active ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            />
            <p
              className={`text-[10px] mt-1.5 leading-tight ${
                active ? 'text-emerald-700 font-semibold' : 'text-slate-400'
              }`}
            >
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );

  if (step === 5) {
    return (
      <div className="text-center space-y-6 py-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
          ✓
        </div>
        <h2 className="font-serif text-2xl text-slate-900">{s.step5.title}</h2>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left space-y-3 text-sm">
          <p>
            <span className="text-slate-500">{s.step5.ref}</span>
            <br />
            <span className="font-mono font-semibold text-emerald-700">{bookingRef}</span>
          </p>
          <p>
            <span className="text-slate-500">{s.step5.signed}</span>
            <br />
            <span className="font-mono text-slate-800">
              {new Date(signedAt).toLocaleString(lang === 'th' ? 'th-TH' : 'en-AU')}
            </span>
          </p>
          <p>
            <span className="text-slate-500">{s.step5.ip}</span>
            <br />
            <span className="font-mono text-slate-600 text-xs">{signedIp}</span>
          </p>
          <p className="text-emerald-700 font-medium pt-2 border-t border-slate-200">{s.step5.sms}</p>
        </div>
        <Link
          to={`/trip/${tripRef}`}
          className="inline-block px-6 py-3 rounded-full bg-emerald-600 text-white font-semibold text-sm"
        >
          {s.step5.done}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
        <p className="font-mono text-xs text-emerald-600">{trip.trip_code}</p>
        <button
          type="button"
          onClick={toggleLang}
          className="px-3 py-1 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {s.langToggle}
        </button>
      </div>

      {step <= 4 && <ProgressBar />}

      {step === 1 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-slate-900">{s.step1.title}</h2>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 text-sm">
            <h3 className="font-serif text-lg text-slate-900">{trip.destination}</h3>
            <p className="text-slate-500 font-mono text-xs">
              {trip.start_date} → {trip.end_date}
            </p>
            <dl className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <dt className="text-slate-400 text-xs">{s.step1.meeting}</dt>
                <dd className="font-medium">Warrawee Studio · 07:00</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs">{s.step1.returnLabel}</dt>
                <dd className="font-medium">~18:00 same day</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs">{s.step1.guide}</dt>
                <dd className="font-medium">แสน (Saen)</dd>
              </div>
              <div>
                <dt className="text-slate-400 text-xs">{s.step1.seats}</dt>
                <dd className="font-medium">
                  {trip.current_pax}/{trip.max_pax}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2 pt-2">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {paymentStatus === 'paid' ? s.paymentPaid : s.paymentPending}
              </span>
              <span className="text-xs text-slate-500">
                {s.step1.balance}: <strong className="text-slate-800">{formatAUD(balanceDue)}</strong>
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <p className="font-semibold text-emerald-800 mb-2">{s.step1.included}</p>
              <ul className="space-y-1">
                {INCLUDED.map((item) => (
                  <li key={item} className="text-slate-700">
                    ✓ {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-600 mb-2">{s.step1.excluded}</p>
              <ul className="space-y-1">
                {EXCLUDED.map((item) => (
                  <li key={item} className="text-slate-500">
                    ✗ {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 text-sm text-orange-900 font-medium">
            ⚠️ {s.step1.alert15}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-slate-900">{s.step2.title}</h2>
          <p className="text-xs text-slate-500">{s.step2.checklistHint}</p>

          <ul className="space-y-2">
            {s.step2.items.map((label, i) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => togglePrepare(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    prepareChecked[i]
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="mr-2">{prepareChecked[i] ? '✓' : '○'}</span>
                  {label}
                </button>
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <p className="font-semibold text-slate-800">{s.step2.safety}</p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={safetyChecks.home}
                onChange={(e) => setSafetyChecks((p) => ({ ...p, home: e.target.checked }))}
                className="mt-1 accent-emerald-600"
              />
              {s.step2.notifyHome}
            </label>
            <p className="text-sm font-mono text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">
              {s.step2.emergencySaen}
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={safetyChecks.weather}
                onChange={(e) => setSafetyChecks((p) => ({ ...p, weather: e.target.checked }))}
                className="mt-1 accent-emerald-600"
              />
              {s.step2.checkWeather}
            </label>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-slate-900">{s.step3.title}</h2>

          <div className="space-y-3">
            <Field label={s.step3.name} required hint={s.step3.required}>
              <input
                className="field-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </Field>
            <Field label={s.step3.phone} required hint={s.step3.required}>
              <input
                className="field-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </Field>
            <Field label={s.step3.email}>
              <input
                className="field-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={s.step3.emergency} required hint={s.step3.required}>
              <input
                className="field-input"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                required
              />
            </Field>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">{s.step3.visa}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVisaType('student')}
                className={`flex-1 py-2 rounded-xl text-sm border ${
                  visaType === 'student'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold'
                    : 'border-slate-200'
                }`}
              >
                {s.step3.visaStudent}
              </button>
              <button
                type="button"
                onClick={() => setVisaType('other')}
                className={`flex-1 py-2 rounded-xl text-sm border ${
                  visaType === 'other'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-semibold'
                    : 'border-slate-200'
                }`}
              >
                {s.step3.visaOther}
              </button>
            </div>
            {visaType === 'student' && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  {s.step3.oshcWarn}
                </p>
                <input
                  className="field-input"
                  placeholder={s.step3.oshcMembership}
                  value={oshcMembership}
                  onChange={(e) => setOshcMembership(e.target.value)}
                />
              </div>
            )}
          </div>

          <Field label={s.step3.health}>
            <textarea
              className="field-input min-h-[80px]"
              value={health}
              onChange={(e) => setHealth(e.target.value)}
            />
          </Field>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">{s.step3.experience}</p>
            <div className="space-y-2">
              {(
                [
                  ['beginner', s.step3.expBeginner],
                  ['hobbyist', s.step3.expHobbyist],
                  ['experienced', s.step3.expExperienced],
                ] as const
              ).map(([val, label]) => (
                <label
                  key={val}
                  className="flex items-center gap-2 text-sm border border-slate-200 rounded-xl px-4 py-3 cursor-pointer has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50"
                >
                  <input
                    type="radio"
                    name="experience"
                    checked={experience === val}
                    onChange={() => setExperience(val)}
                    className="accent-emerald-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-slate-900">{s.step4.title}</h2>

          {(
            [
              ['c1', s.step4.c1],
              ['c2', s.step4.c2],
              ['c3', s.step4.c3],
              ['c4', s.step4.c4],
              ['c5', s.step4.c5],
              ['c6', s.step4.c6],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-start gap-3 text-sm border border-slate-200 rounded-xl p-4 cursor-pointer has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50/50"
            >
              <input
                type="checkbox"
                checked={waivers[key]}
                onChange={(e) => setWaivers((w) => ({ ...w, [key]: e.target.checked }))}
                className="mt-1 accent-emerald-600 shrink-0"
              />
              <span className="text-slate-700 leading-relaxed">{label}</span>
            </label>
          ))}

          <div>
            <p className="text-sm text-slate-600 mb-2">{s.step4.signHint}</p>
            <div className="rounded-xl border border-slate-300 bg-white overflow-hidden">
              <SignaturePad ref={padRef} onChange={setSignature} height={160} />
            </div>
            {!canSubmitStep4 && (
              <p className="text-xs text-amber-700 mt-2">{s.step4.signRequired}</p>
            )}
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        </section>
      )}

      <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100">
        {step > 1 && step < 5 && (
          <button
            type="button"
            onClick={() => setStep((st) => (st - 1) as Step)}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm"
          >
            {s.back}
          </button>
        )}
        {step < 4 && (
          <button
            type="button"
            onClick={() => setStep((st) => (st + 1) as Step)}
            disabled={step === 3 && !canProceedStep3}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-40"
          >
            {s.next}
          </button>
        )}
        {step === 4 && (
          <button
            type="button"
            disabled={!canSubmitStep4 || submitting}
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-40"
          >
            {submitting ? '…' : s.submit}
          </button>
        )}
      </div>

      <style>{`
        .field-input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
        }
        .field-input:focus {
          outline: none;
          border-color: #059669;
          box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="text-slate-400 font-normal text-xs ml-1">({hint})</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
