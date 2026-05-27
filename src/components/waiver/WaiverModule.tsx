import { useState, useRef, FormEvent } from 'react';
import { CRMClient, Tour } from '../../types/tour';
import { WaiverData } from '../../types/compliance';
import { WAIVER_TEXT, WaiverLanguage } from '../../lib/compliance';
import { computeWaiverContentHash, saveClientWaiver, toStoredWaiver } from '../../lib/waiverApi';
import { saveWaiverLocally } from '../../lib/waiverDb';
import SignaturePad, { SignaturePadHandle } from './SignaturePad';
import WaiverPrintView from './WaiverPrintView';
import BookingPolicyPanel from '../policy/BookingPolicyPanel';

/*
Required Supabase table — run in SQL Editor:

CREATE TABLE IF NOT EXISTS client_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  agreed_terms BOOLEAN NOT NULL DEFAULT FALSE,
  agreed_risk BOOLEAN NOT NULL DEFAULT FALSE,
  agreed_medical BOOLEAN NOT NULL DEFAULT FALSE,
  agreed_media BOOLEAN NOT NULL DEFAULT FALSE,
  agreed_privacy BOOLEAN NOT NULL DEFAULT FALSE,
  digital_signature TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'EN',
  signed_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
*/

type CheckboxKey = 'terms' | 'risk' | 'medical' | 'media' | 'privacy';

const CHECKBOX_KEYS: CheckboxKey[] = ['terms', 'risk', 'medical', 'media', 'privacy'];

const UI = {
  EN: {
    proceed: 'PROCEED TO SIGNATURE',
    signatureTitle: 'DIGITAL SIGNATURE',
    signatureHint: 'Please sign your full legal name in the box below',
    clear: 'CLEAR',
    signedAt: 'Signed at:',
    confirm: 'CONFIRM & SUBMIT WAIVER',
    complete: 'WAIVER COMPLETE',
    print: 'PRINT / SAVE PDF',
    done: 'DONE',
    cancel: 'CANCEL',
    oshcExpired: 'OSHC has expired',
    visaPending: 'NZ visa status is pending',
    submitError: 'Failed to save waiver. Try again.',
  },
  TH: {
    proceed: 'ดำเนินการลงนาม',
    signatureTitle: 'ลายมือชื่อดิจิทัล',
    signatureHint: 'กรุณาเซ็นชื่อตามกฎหมายในช่องด้านล่าง',
    clear: 'ล้าง',
    signedAt: 'ลงนามเมื่อ:',
    confirm: 'ยืนยันและส่งหนังสือยินยอม',
    complete: 'ลงนามเรียบร้อยแล้ว',
    print: 'พิมพ์ / บันทึก PDF',
    done: 'เสร็จสิ้น',
    cancel: 'ยกเลิก',
    oshcExpired: 'ประกัน OSHC หมดอายุแล้ว',
    visaPending: 'สถานะวีซ่า NZ ยังรอดำเนินการ',
    submitError: 'บันทึกหนังสือยินยอมไม่สำเร็จ กรุณาลองอีกครั้ง',
  },
} as const;

interface WaiverModuleProps {
  client: CRMClient;
  tour: Tour;
  onComplete: (waiver: WaiverData) => void;
  onCancel: () => void;
}

function clientFullNameEn(c: CRMClient): string {
  return `${c.first_name_en} ${c.last_name_en}`.trim();
}

function clientFullNameTh(c: CRMClient): string {
  return `${c.first_name_th} ${c.last_name_th}`.trim();
}

function isOshcExpired(expiry: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(expiry) < today;
}

export default function WaiverModule({ client, tour, onComplete, onCancel }: WaiverModuleProps) {
  const [language, setLanguage] = useState<WaiverLanguage>('EN');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [checkedTerms, setCheckedTerms] = useState<Record<CheckboxKey, boolean>>({
    terms: false,
    risk: false,
    medical: false,
    media: false,
    privacy: false,
  });
  const [signature, setSignature] = useState<string | null>(null);
  const [signedAtDisplay, setSignedAtDisplay] = useState<string | null>(null);
  const [completedWaiver, setCompletedWaiver] = useState<WaiverData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const padRef = useRef<SignaturePadHandle>(null);
  const text = WAIVER_TEXT[language];
  const labels = UI[language];

  const allChecked = CHECKBOX_KEYS.every((k) => checkedTerms[k]);
  const hasSignature = Boolean(signature);

  const oshcExpired = isOshcExpired(client.oshc_expiry);
  const visaPending = client.visa_status === 'PENDING_NZ_VISA';

  const toggleCheck = (key: CheckboxKey) => {
    setCheckedTerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSignatureChange = (base64: string | null) => {
    setSignature(base64);
    if (base64) {
      setSignedAtDisplay(
        new Date().toLocaleString(language === 'TH' ? 'th-TH' : 'en-AU', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      );
    } else {
      setSignedAtDisplay(null);
    }
  };

  const handleClearPad = () => {
    padRef.current?.clear();
    setSignature(null);
    setSignedAtDisplay(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!signature) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const signedAt = new Date().toISOString();
    const waiverBase = {
      client_id: client.id,
      agreed_terms: checkedTerms.terms,
      agreed_risk: checkedTerms.risk,
      agreed_medical: checkedTerms.medical,
      agreed_media: checkedTerms.media,
      agreed_privacy: checkedTerms.privacy,
      digital_signature: signature,
      signed_at: signedAt,
    };

    const contentHash = await computeWaiverContentHash({
      waiver: waiverBase,
      tour_id: tour.id,
      language,
      waiver_text: WAIVER_TEXT[language],
    });

    const waiverData: WaiverData = {
      ...waiverBase,
      content_hash: contentHash,
    };

    const stored = toStoredWaiver(waiverData, tour.id, language);

    try {
      try {
        await saveClientWaiver(waiverData, tour.id, language);
      } catch (err) {
        console.warn('[Trip2Talk] Supabase waiver save failed, using offline backup:', err);
      }
      await saveWaiverLocally(stored);
      setCompletedWaiver(waiverData);
      setStep(3);
      onComplete(waiverData);
    } catch (err) {
      setSubmitError(labels.submitError);
      console.error('[Trip2Talk] Waiver submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!completedWaiver) return;
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      {step === 3 && completedWaiver && (
        <div className="hidden print:block fixed inset-0 z-[100] bg-white overflow-auto">
          <WaiverPrintView waiver={completedWaiver} client={client} tour={tour} />
        </div>
      )}

      <div className="w-full max-w-[680px] cyber-card p-6 relative print:hidden">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 font-mono text-xs text-neutral-500 hover:text-neutral-300"
        >
          ✕
        </button>

        {step === 1 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
              <div>
                <p className="font-sans text-lg font-semibold text-amber-400">Trip2Talk</p>
                <p className="font-sans text-sm text-neutral-400 mt-1">
                  {tour.trip_code} — {tour.destination}
                </p>
              </div>
              <div className="flex gap-1">
                {(['EN', 'TH'] as WaiverLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs border transition-colors ${
                      language === lang
                        ? 'bg-amber-500 text-neutral-950 border-amber-500 font-semibold'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    [{lang}]
                  </button>
                ))}
              </div>
            </div>

            <h2 className="font-sans text-[18px] font-semibold text-amber-300 leading-snug">
              {text.title}
            </h2>

            <BookingPolicyPanel tour={tour} compact />

            <div className="space-y-2">
              {CHECKBOX_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-amber-500/5 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checkedTerms[key]}
                    onChange={() => toggleCheck(key)}
                    className="sr-only"
                  />
                  <span
                    className={`mt-0.5 w-5 h-5 shrink-0 rounded border flex items-center justify-center ${
                      checkedTerms[key]
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-amber-500/40 bg-transparent'
                    }`}
                    aria-hidden
                  >
                    {checkedTerms[key] && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none">
                        <path
                          d="M2 6l3 3 5-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="font-sans text-sm text-neutral-200 leading-[1.7]">
                    {text[key]}
                  </span>
                </label>
              ))}
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 space-y-2 font-sans text-sm text-neutral-300">
              <p>
                <span className="text-neutral-500">TH:</span> {clientFullNameTh(client)}
              </p>
              <p>
                <span className="text-neutral-500">EN:</span> {clientFullNameEn(client)}
              </p>
              <p>
                <span className="text-neutral-500">Passport:</span>{' '}
                <span className="font-mono">{client.passport_number}</span>
              </p>
              <p>
                <span className="text-neutral-500">OSHC expiry:</span>{' '}
                <span className="font-mono">{client.oshc_expiry}</span>
              </p>
              {oshcExpired && (
                <div className="rounded-lg px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {labels.oshcExpired}
                </div>
              )}
              {visaPending && (
                <div className="rounded-lg px-3 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs">
                  {labels.visaPending}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!allChecked}
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl font-sans font-semibold text-sm tracking-wide transition-colors bg-amber-500 text-neutral-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500"
            >
              {labels.proceed}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 font-mono text-xs text-neutral-500 hover:text-neutral-300"
            >
              {labels.cancel}
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-sans text-lg font-semibold text-amber-400">{labels.signatureTitle}</h2>
              <div className="flex gap-1">
                {(['EN', 'TH'] as WaiverLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs border ${
                      language === lang
                        ? 'bg-amber-500 text-neutral-950 border-amber-500'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    [{lang}]
                  </button>
                ))}
              </div>
            </div>

            <p className="font-sans text-sm text-neutral-400">{labels.signatureHint}</p>

            <SignaturePad ref={padRef} onChange={handleSignatureChange} height={200} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClearPad}
                className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 font-mono text-xs text-neutral-300 hover:border-neutral-600"
              >
                {labels.clear}
              </button>
              {signedAtDisplay && (
                <p className="font-mono text-xs text-neutral-500">
                  {labels.signedAt} {signedAtDisplay}
                </p>
              )}
            </div>

            {submitError && (
              <p className="font-sans text-sm text-red-400 text-center">{submitError}</p>
            )}

            <button
              type="submit"
              disabled={!hasSignature || isSubmitting}
              className="w-full py-3 rounded-xl font-sans font-semibold text-sm bg-amber-500 text-neutral-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '…' : labels.confirm}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-2 font-mono text-xs text-neutral-500 hover:text-neutral-300"
            >
              ← {labels.cancel}
            </button>
          </form>
        )}

        {step === 3 && completedWaiver && (
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto w-16 h-16 rounded-full border-2 border-amber-500/50 flex items-center justify-center text-amber-400">
              <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M8 12.5l2.5 2.5 5.5-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="font-sans text-xl font-semibold text-amber-400 tracking-wide">
              {labels.complete}
            </h2>

            <div className="font-sans text-sm text-neutral-300 space-y-1">
              <p className="font-medium text-neutral-100">{clientFullNameEn(client)}</p>
              <p className="font-mono text-xs text-neutral-500">
                {new Date(completedWaiver.signed_at).toLocaleString(
                  language === 'TH' ? 'th-TH' : 'en-AU',
                  { dateStyle: 'medium', timeStyle: 'short' }
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-3 rounded-xl font-sans font-semibold text-sm bg-neutral-800 text-amber-400 border border-amber-500/30 hover:bg-neutral-700"
              >
                {labels.print}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-3 rounded-xl font-sans font-semibold text-sm bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                {labels.done}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
