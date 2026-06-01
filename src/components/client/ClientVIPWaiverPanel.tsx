import { FormEvent, useState } from 'react';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { syncWaiverToSheetsAndDrive } from '../../lib/gasSync';
import { computeWaiverContentHash, saveClientWaiver, toStoredWaiver } from '../../lib/waiverApi';
import { saveWaiverLocally } from '../../lib/waiverDb';
import { WAIVER_TEXT } from '../../lib/compliance';

type CheckboxKey = 'terms' | 'risk' | 'medical' | 'media' | 'privacy';

const CHECKBOX_KEYS: CheckboxKey[] = ['terms', 'risk', 'medical', 'media', 'privacy'];

type Props = {
  bookingId: string;
  customerName: string;
  tourCode: string;
  onComplete?: () => void;
};

async function resolveTourUuid(tourCode: string): Promise<string | null> {
  const code = tourCode.trim();
  if (!code) return null;
  const { data } = await supabase.from('tours').select('id').eq('trip_code', code).limit(1);
  if (data?.[0]?.id) return data[0].id;
  const { data: byId } = await supabase.from('tours').select('id').eq('id', code).limit(1);
  return byId?.[0]?.id ?? null;
}

export default function ClientVIPWaiverPanel({ bookingId, customerName, tourCode, onComplete }: Props) {
  const { lang } = useI18n();
  const isTh = lang === 'TH';
  const [checks, setChecks] = useState<Record<CheckboxKey, boolean>>({
    terms: false,
    risk: false,
    medical: false,
    media: false,
    privacy: false,
  });
  const [signature, setSignature] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = CHECKBOX_KEYS.every((k) => checks[k]) && signature.trim().length >= 2;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allChecked || busy) return;
    setBusy(true);
    setError(null);

    try {
      const tourId = (await resolveTourUuid(tourCode)) ?? tourCode;
      const client_id = crypto.randomUUID();
      const signed_at = new Date().toISOString();
      const language = isTh ? 'TH' : 'EN';
      const waiverText = WAIVER_TEXT[language];

      const waiverBase = {
        client_id,
        digital_signature: signature.trim(),
        signed_at,
        waiver_type: 'core' as const,
        agreed_terms: checks.terms,
        agreed_risk: checks.risk,
        agreed_medical: checks.medical,
        agreed_media: checks.media,
        agreed_privacy: checks.privacy,
        agreed_transport: false,
      };

      const content_hash = await computeWaiverContentHash({
        waiver: waiverBase,
        tour_id: tourId,
        language,
        waiver_text: waiverText as unknown as Record<string, string>,
      });

      const waiver = { ...waiverBase, content_hash };

      try {
        await saveClientWaiver(waiver, tourId, language);
      } catch (err) {
        console.warn('[ClientVIPWaiverPanel] Supabase insert failed; saving offline:', err);
      }

      await saveWaiverLocally(toStoredWaiver(waiver, tourId, language));

      const sync = await syncWaiverToSheetsAndDrive({
        booking_id: bookingId,
        client_name: customerName,
        tour_code: tourCode,
        signed_at,
        content_hash,
        language,
        digital_signature: signature.trim(),
      });
      if (!sync.success) {
        console.warn('[ClientVIPWaiverPanel] Sheets sync:', sync.error);
      }

      setDone(true);
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-[28px] border border-sage-100 shadow-sm p-4">
        <p className="text-sm font-semibold text-emerald-800">
          {isTh ? '✓ บันทึกหนังสือยินยอมแล้ว' : '✓ Waiver recorded'}
        </p>
        <p className="text-xs text-[#6B6B6B] mt-1">
          {isTh ? 'ซิงก์ไป Google Sheets แล้ว (ถ้าออนไลน์)' : 'Synced to Google Sheets when online.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="bg-white rounded-[28px] border border-sage-100 shadow-sm p-4 space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-[#9A9A9A] uppercase">
        {isTh ? 'หนังสือยินยอม / Waiver' : 'Consent & waiver'}
      </p>
      <ul className="space-y-2">
        {CHECKBOX_KEYS.map((key) => (
          <li key={key} className="flex gap-2 text-sm text-[#1C1C1E]">
            <input
              type="checkbox"
              checked={checks[key]}
              onChange={(ev) => setChecks((c) => ({ ...c, [key]: ev.target.checked }))}
              className="mt-1 accent-sage-700"
            />
            <span>{WAIVER_TEXT[lang === 'TH' ? 'TH' : 'EN'][key]}</span>
          </li>
        ))}
      </ul>
      <label className="block">
        <span className="text-xs text-[#6B6B6B]">
          {isTh ? 'ลายมือชื่อ (ชื่อตามพาสปอร์ต)' : 'Digital signature (passport name)'}
        </span>
        <input
          type="text"
          value={signature}
          onChange={(ev) => setSignature(ev.target.value)}
          placeholder={customerName || (isTh ? 'ชื่อ-นามสกุล' : 'Full legal name')}
          className="mt-1 w-full rounded-2xl border border-sage-100 px-3 py-2.5 text-sm"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!allChecked || busy}
        className="w-full rounded-[18px] bg-[#1C1C1E] text-white py-3 text-sm font-semibold disabled:opacity-40"
      >
        {busy ? (isTh ? 'กำลังบันทึก…' : 'Saving…') : isTh ? 'ยืนยันและส่งหนังสือยินยอม' : 'Sign & submit waiver'}
      </button>
    </form>
  );
}
