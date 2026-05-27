import { useState } from 'react';
import { Link } from 'react-router-dom';

type TimelineTab = 'one-day' | 'overnight' | 'pre-wedding';

const TIMELINES: Record<
  TimelineTab,
  { label: string; steps: { title: string; description: string }[] }
> = {
  'one-day': {
    label: 'One Day Trip',
    steps: [
      { title: 'Day 0–1 · Backup', description: 'Secure dual backup on return from the field.' },
      { title: 'Day 2–3 · Culling', description: 'Select the best frames; remove duplicates and misses.' },
      { title: 'Day 4–7 · Color Grading', description: 'Consistent look across the set — light, skin, mood.' },
      { title: 'Day 7–14 · Delivery', description: 'Private album link (.JPG only) sent to your inbox.' },
    ],
  },
  overnight: {
    label: 'Overnight',
    steps: [
      { title: 'Day 0–1 · Backup', description: 'Cards archived and verified before we leave site.' },
      { title: 'Day 2–4 · Correction', description: 'Cull, grade, and light retouch for overnight sets.' },
      { title: 'Day 5 · Delivery', description: 'Gallery link ready — download within 60 days.' },
    ],
  },
  'pre-wedding': {
    label: 'Pre-Wedding & Event',
    steps: [
      { title: 'Day 1–2 · Sneak Peek', description: 'A handful of hero frames for social while we edit.' },
      { title: 'Weeks 1–3 · Retouching', description: 'Detailed skin, colour, and composition polish.' },
      { title: 'Week 4 · Gallery Launch', description: 'Full private gallery — .JPG delivery, no RAW.' },
    ],
  },
};

const TERMS_TILES = [
  {
    icon: '🟠',
    title: 'No RAW Files',
    tone: 'border-orange-200 bg-orange-50 text-orange-900',
    body: 'ส่งแค่ .JPG — ไม่มีไฟล์ RAW, DNG, CR2 หรือไฟล์จากกล้องดิบ',
  },
  {
    icon: '🔵',
    title: 'Link Expiry',
    tone: 'border-blue-200 bg-blue-50 text-blue-900',
    body: '60 วัน — ดาวน์โหลดเก็บไว้เองก่อนลิงก์หมดอายุ',
  },
  {
    icon: '🟣',
    title: 'Copyright',
    tone: 'border-purple-200 bg-purple-50 text-purple-900',
    body: 'Personal Use only — ใช้ส่วนตัว/โซเชียลได้ ไม่ใช่เชิงพาณิชย์โดยไม่ซื้อลิขสิทธิ์',
  },
  {
    icon: '🔴',
    title: 'No Re-filter',
    tone: 'border-rose-200 bg-rose-50 text-rose-900',
    body: 'ห้ามใส่ฟิลเตอร์ทับ — อย่าแก้สี/สไตล์ทับงานที่ส่งมาแล้ว',
  },
] as const;

const CHAT_TEMPLATE = `สวัสดีครับ/ค่ะ 🙏
ขอบคุณที่ร่วมทริปถ่ายภาพกับ Trip2Talk / Chapter 99 Photography

📸 การส่งมอบรูป:
• ไฟล์ .JPG เท่านั้น (ไม่มี RAW)
• ลิงก์อัลบั้มใช้ได้ 60 วัน — กรุณาดาวน์โหลดเก็บไว้เอง
• ใช้ส่วนตัวได้ (Personal Use) ห้ามใส่ฟิลเตอร์ทับงานที่ส่งแล้ว

มีคำถามเพิ่มเติมแจ้งได้เลยครับ/ค่ะ`;

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1452587925148-ce544e77a70e?w=1920&q=80';

export default function PhotoDeliveryTerms() {
  const [tab, setTab] = useState<TimelineTab>('one-day');
  const [copied, setCopied] = useState(false);

  const timeline = TIMELINES[tab];

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(CHAT_TEMPLATE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Hero */}
      <header className="relative bg-navy text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/90 to-navy" aria-hidden />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 md:py-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-sm font-semibold tracking-wide">
            Trip2Talk Photography
          </span>
          <h1 className="mt-6 font-serif text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
            Photo Delivery &amp; Terms
          </h1>
          <p className="mt-4 text-white/70 text-sm max-w-2xl leading-relaxed">
            Private Photo Journeys by Chapter 99 Photography — delivery timelines, usage rules, and express options.
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* LEFT — col-span-2 */}
          <div className="lg:col-span-2 space-y-8">
            {/* Timeline */}
            <section className="rounded-2xl bg-[#f8f8f8] border border-slate-200/80 p-5 md:p-6">
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">Delivery timeline</h2>

              <div className="flex flex-wrap gap-2 mb-6">
                {(Object.keys(TIMELINES) as TimelineTab[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      tab === key
                        ? 'bg-navy text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {TIMELINES[key].label}
                  </button>
                ))}
              </div>

              <ol className="space-y-5">
                {timeline.steps.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span
                      className="shrink-0 w-9 h-9 rounded-full bg-navy text-white flex items-center justify-center text-sm font-bold"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{step.title}</p>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Terms 2×2 */}
            <section>
              <h2 className="font-serif text-xl font-semibold text-slate-900 mb-4">Key terms</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TERMS_TILES.map((tile) => (
                  <div
                    key={tile.title}
                    className={`rounded-2xl border p-5 ${tile.tone}`}
                  >
                    <p className="text-lg" aria-hidden>
                      {tile.icon}
                    </p>
                    <h3 className="font-semibold mt-2">{tile.title}</h3>
                    <p className="text-sm mt-2 leading-relaxed opacity-90">{tile.body}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT — col-span-1 */}
          <aside className="space-y-6">
            <section className="relative rounded-2xl bg-navy text-white border border-white/10 p-6 overflow-hidden">
              <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-teal text-navy text-xs font-bold">
                ⚡ Express
              </span>
              <h2 className="font-serif text-lg font-semibold pr-24">อยากได้รูปด่วนพิเศษ?</h2>
              <ul className="mt-5 space-y-3 text-sm">
                <li className="flex justify-between items-baseline gap-2 border-b border-white/10 pb-3">
                  <span className="text-white/80">Rush delivery</span>
                  <span className="font-semibold text-teal">+A$150 (24ชม.)</span>
                </li>
                <li className="flex justify-between items-baseline gap-2">
                  <span className="text-white/80">Fast track</span>
                  <span className="font-semibold text-teal">+A$80 (3วัน)</span>
                </li>
              </ul>
              <p className="mt-4 text-xs text-white/50">
                Subject to shoot volume and editor availability. Confirm in writing before the trip.
              </p>
            </section>

            <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900 text-sm">Note · ตอบลูกค้าในแชต</h2>
              <p className="text-xs text-slate-500 mt-1 mb-3">Copy-paste template</p>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100 max-h-64 overflow-y-auto font-sans">
                {CHAT_TEMPLATE}
              </pre>
              <button
                type="button"
                onClick={copyTemplate}
                className="mt-4 w-full py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors"
              >
                {copied ? 'Copied ✓' : 'Copy to clipboard'}
              </button>
            </section>

            <p className="text-xs text-slate-500">
              <Link to="/" className="text-teal hover:underline">
                ← Home
              </Link>
              {' · '}
              <Link to="/package-terms" className="text-teal hover:underline">
                Package terms
              </Link>
            </p>
          </aside>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-[#f8f8f8] py-10 text-center text-xs text-slate-500">
        <p>© 2026 Chapter 99 Photography &amp; Trip2Talk</p>
        <p className="mt-2 text-slate-400">Terms adapted under Australian Consumer Law</p>
      </footer>
    </div>
  );
}
