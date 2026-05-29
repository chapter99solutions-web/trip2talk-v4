import { FormEvent, useState } from 'react';
import { sha256ComplianceHash } from '../../lib/bookingRules';
import { syncWaiverToSheetsAndDrive } from '../../lib/gasSync';
import { supabase } from '../../lib/supabase';

type Lang = 'TH' | 'EN';

const POINTS: Array<{ key: string; th: string; en: string }> = [
  {
    key: 'terms',
    th: 'ข้าพเจ้ายอมรับข้อกำหนดการให้บริการทริปถ่ายภาพ (Australian Consumer Law)',
    en: 'I accept the photography trip terms (Australian Consumer Law).',
  },
  {
    key: 'risk',
    th: 'ข้าพเจ้ารับทราบความเสี่ยงจากกิจกรรมกลางแจ้ง/ธรรมชาติ',
    en: 'I acknowledge outdoor and nature activity risks.',
  },
  {
    key: 'medical',
    th: 'ข้าพเจ้าเปิดเผยข้อมูลสุขภาพ/แพ้ยาที่เกี่ยวข้องอย่างตรงไปตรงมา',
    en: 'I disclose relevant health and allergy information.',
  },
  {
    key: 'media',
    th: 'ข้าพเจ้ายินยอมให้ใช้ภาพเพื่อพอร์ตโฟลิโอ/การตลาดตามนโยบาย',
    en: 'I consent to portfolio/marketing use per policy.',
  },
  {
    key: 'privacy',
    th: 'ข้าพเจ้ายอมรับนโยบายความเป็นส่วนตัวและการเก็บข้อมูล',
    en: 'I accept privacy and data handling policy.',
  },
  {
    key: 'delivery',
    th: 'ข้าพเจ้ารับทราบว่าได้รับเฉพาะไฟล์ .JPG ที่ตัดต่อแล้ว ไม่รวมไฟล์ Raw',
    en: 'I understand delivery is finished .JPG only — never Raw files.',
  },
];

type Props = {
  bookingId: string;
  lang?: Lang;
  onComplete?: () => void;
};

export default function WaiverForm({ bookingId, lang = 'TH', onComplete }: Props) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = POINTS.every((p) => checks[p.key]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allChecked || busy) return;
    setBusy(true);
    setError(null);

    try {
      const signed_at = new Date().toISOString();
      let signed_ip = 'unknown';
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipJson = (await ipRes.json()) as { ip?: string };
        if (ipJson.ip) signed_ip = ipJson.ip;
      } catch {
        /* offline fallback */
      }

      const content_hash = await sha256ComplianceHash(bookingId, signed_ip, signed_at);

      const { data: row, error: insertErr } = await supabase
        .from('waiver_signatures')
        .insert({
          booking_id: bookingId,
          signed_at,
          signed_ip,
          content_hash,
        })
        .select('id')
        .single();

      if (insertErr) throw new Error(insertErr.message);

      const sync = await syncWaiverToSheetsAndDrive({
        booking_id: bookingId,
        waiver_signature_id: row?.id,
        signed_at,
        signed_ip,
        content_hash,
      });

      if (!sync.success) {
        console.warn('[WaiverForm] GAS sync:', sync.error);
      }

      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="cyber-card p-5 space-y-4">
      <h3 className="font-serif text-gold text-lg">
        {lang === 'TH' ? 'ยินยอมดิจิทัล 6 ข้อ' : '6-point digital consent'}
      </h3>
      <ul className="space-y-3">
        {POINTS.map((p) => (
          <li key={p.key} className="flex gap-3 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={Boolean(checks[p.key])}
              onChange={(e) => setChecks((c) => ({ ...c, [p.key]: e.target.checked }))}
              className="mt-1 accent-teal"
            />
            <span>{lang === 'TH' ? p.th : p.en}</span>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={!allChecked || busy} className="cyber-btn-gold w-full disabled:opacity-40">
        {busy ? (lang === 'TH' ? 'กำลังบันทึก…' : 'Saving…') : lang === 'TH' ? 'ยืนยันการลงนาม' : 'Sign & submit'}
      </button>
    </form>
  );
}
