import { useMemo, useState } from 'react';
import { TOUR_FALLBACK_DATA } from '../../data/tours';

type Lang = 'th' | 'en';

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

/** Active tour/trip names sourced from the shared tours dataset. */
const TRIP_OPTIONS: string[] = TOUR_FALLBACK_DATA.map((t) => t.tourName ?? t.anonymizedTitle);

/** Expiry = today + 30 days, rendered with a FORCED Gregorian year (not Buddhist 2569). */
function computeExpiry(): { th: string; en: string } {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const th = `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const en = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return { th, en };
}

function buildMessage(
  lang: Lang,
  client: string,
  trip: string,
  link: string,
  expiry: { th: string; en: string },
): string {
  const name = client.trim() || (lang === 'th' ? '[ชื่อลูกทริป]' : '[Client name]');
  const tripName = trip.trim() || (lang === 'th' ? '[ชื่อทริป]' : '[Trip name]');
  const url = link.trim() || (lang === 'th' ? '[ลิงก์รับรูป]' : '[Album link]');

  if (lang === 'th') {
    return `🎉 สวัสดีค่ะ ${name}!

อัลบั้มรูปทริป ${tripName} ของคุณพร้อมแล้วค่ะ 📸

🔗 ลิงก์รับรูป:
${url}

📋 วิธีดาวน์โหลด:
1. คลิกลิงก์ด้านบน
2. กด "Download All" เพื่อโหลดรูปทั้งหมด
3. รูปจะส่งเป็นไฟล์ .zip มายังอีเมลของคุณ
4. สามารถเลือกโหลดทีละรูปได้เช่นกัน

⏰ ลิงก์มีอายุถึง: ${expiry.th}
หากลิงก์หมดอายุ ติดต่อ Chapter 99 ได้เลยค่ะ

❤️ ขอบคุณที่ร่วมเดินทางกับเรานะคะ
— Chapter 99 Photography`;
  }

  return `🎉 Hi ${name}!

Your ${tripName} album is ready 📸

🔗 Download link:
${url}

📋 How to download:
1. Click the link above
2. Tap "Download All" to grab every photo
3. The photos will arrive as a .zip file in your email
4. You can also download photos one by one

⏰ Link expires on: ${expiry.en}
If the link has expired, contact Chapter 99 anytime.

❤️ Thank you for traveling with us
— Chapter 99 Photography`;
}

export default function AlbumMessageGenerator({ theme = 'cyber' }: { theme?: 'cyber' | 'light' }) {
  const [lang, setLang] = useState<Lang>('th');
  const [client, setClient] = useState('');
  const [trip, setTrip] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Recompute once per mount/generation; today+30d does not change while the panel is open.
  const expiry = useMemo(() => computeExpiry(), []);
  const message = useMemo(
    () => buildMessage(lang, client, trip, link, expiry),
    [lang, client, trip, link, expiry],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const isCyber = theme === 'cyber';
  const labelClass = isCyber
    ? 'cyber-form-label tracking-wide text-neutral-500'
    : 'text-xs text-white/50 uppercase';
  const inputClass = isCyber
    ? 'cyber-input'
    : 'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30';
  const previewClass = isCyber
    ? 'whitespace-pre-wrap font-mono text-sm text-amber-100/90 bg-black/40 border border-amber-500/20 rounded-xl p-4'
    : 'whitespace-pre-wrap text-sm text-white/90 bg-black/30 border border-white/10 rounded-xl p-4';
  const toggleBase = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors';
  const toggleActive = isCyber ? 'bg-amber-500 text-neutral-950' : 'bg-[#4dd8a0] text-[#0d1b2a]';
  const toggleIdle = isCyber
    ? 'bg-white/5 text-neutral-400 hover:text-amber-300'
    : 'bg-white/5 text-white/50 hover:text-white';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={isCyber ? 'text-sm text-amber-300/80' : 'text-sm text-white/70'}>
          {lang === 'th'
            ? 'สร้างข้อความส่งอัลบั้มให้ลูกทริป (วันหมดอายุ +30 วันอัตโนมัติ)'
            : 'Compose an album delivery message (expiry auto-set to +30 days)'}
        </p>
        <div className="flex gap-1 rounded-xl bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setLang('th')}
            className={`${toggleBase} ${lang === 'th' ? toggleActive : toggleIdle}`}
          >
            ไทย
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`${toggleBase} ${lang === 'en' ? toggleActive : toggleIdle}`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className={labelClass}>{lang === 'th' ? 'ชื่อลูกทริป' : 'Client name'}</label>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder={lang === 'th' ? 'เช่น คุณมายด์' : 'e.g. Mind'}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{lang === 'th' ? 'ชื่อทริป' : 'Trip name'}</label>
            <select
              value={trip}
              onChange={(e) => setTrip(e.target.value)}
              className={inputClass}
            >
              <option value="">{lang === 'th' ? '— เลือกทริป —' : '— Select a trip —'}</option>
              {TRIP_OPTIONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>{lang === 'th' ? 'ลิงก์อัลบั้ม Pic-Time' : 'Pic-Time album link'}</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          <div className={isCyber ? 'text-xs text-amber-400/70' : 'text-xs text-white/40'}>
            ⏰ {lang === 'th' ? 'ลิงก์มีอายุถึง' : 'Link expires on'}: {lang === 'th' ? expiry.th : expiry.en}
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-3">
          <label className={labelClass}>{lang === 'th' ? 'ตัวอย่างข้อความ' : 'Live preview'}</label>
          <div className={previewClass}>{message}</div>

          <button
            type="button"
            onClick={() => void handleCopy()}
            className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              copied
                ? 'bg-green-500 text-white'
                : isCyber
                  ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400'
                  : 'bg-[#4dd8a0] text-[#0d1b2a] hover:opacity-90'
            }`}
          >
            {copied ? '✅ Copied!' : '📋 Copy Message'}
          </button>
        </div>
      </div>
    </div>
  );
}
