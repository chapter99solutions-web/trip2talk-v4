import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicBottomNav from '../components/public/PublicBottomNav';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
};

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80&auto=format';

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

async function postContact(payload: unknown): Promise<void> {
  const url = import.meta.env.VITE_GAS_WEBAPP_URL as string | undefined;
  if (!url) throw new Error('Missing VITE_GAS_WEBAPP_URL');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Apps Script error: HTTP ${res.status}${text ? ` — ${text}` : ''}`);
  }
}

export default function Contact() {
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    message: '',
  });
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const mailtoHref = useMemo(() => {
    const to = 'trip2talksyd@gmail.com';
    const subject = `Trip2Talk enquiry — ${form.firstName} ${form.lastName}`.trim();
    const body = `Name: ${form.firstName} ${form.lastName}\nEmail: ${form.email}\n\nMessage:\n${form.message}`.trim();
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [form.email, form.firstName, form.lastName, form.message]);

  const canSend =
    form.firstName.trim() && form.lastName.trim() && /^\S+@\S+\.\S+$/.test(form.email.trim()) && form.message.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend || busy) return;
    setBusy(true);
    setOk(null);
    setErr(null);

    try {
      await postContact({
        sheet: 'Consents',
        consent: {
          timestampIso: new Date().toISOString(),
          bookingId: 'CONTACT',
          customerName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          tourCode: 'CONTACT',
          consentStatus: 'CONTACT_FORM',
          email: form.email.trim(),
          message: form.message.trim(),
          source: 'web',
        } as unknown,
      });
      setOk('Sent. We’ll get back to you soon.');
      setForm({ firstName: '', lastName: '', email: '', message: '' });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased pb-20">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="font-serif text-xl font-semibold text-slate-900 tracking-tight">
            Trip2Talk
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/#tours" className="hover:text-emerald-600 transition-colors">
              Trips
            </Link>
            <Link to="/about" className="hover:text-emerald-600 transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-emerald-700">
              Contact
            </Link>
            <Link to="/package-terms" className="hover:text-emerald-600 transition-colors">
              Terms
            </Link>
          </nav>
          <Link to="/" className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            ← Home
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-100">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/95 to-white" />
        <div className="relative max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase">Contact</p>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl font-semibold text-slate-900 tracking-tight leading-tight">
            Let’s Start Your Journey!
            <br />
            <span className="text-slate-500 italic font-medium">ออกเดินทางสร้างความทรงจำไปกับเรา</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            ในโลกของการเดินทาง ภาพถ่ายไม่ใช่แค่การบันทึกสถานที่ แต่เป็นการเก็บรักษาความทรงจำ ประสบการณ์ และอารมณ์
            ที่เกิดขึ้นในแต่ละช่วงเวลา สำหรับ Trip2Talk เราเชื่อว่าภาพถ่ายคือภาษาที่ทรงพลังที่สุดในการสื่อสารและส่งต่อ
            เรื่องราวการเดินทางของคุณ
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-6 md:p-8">
            <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase">Why it’s special</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold text-slate-900">Why travel & shoot with us?</h2>
            <div className="mt-6 space-y-5 text-slate-600 leading-relaxed">
              <div>
                <p className="font-semibold text-slate-900">1) บันทึกความทรงจำล้ำค่า</p>
                <p className="mt-1 text-sm">
                  ภาพถ่ายช่วยให้เราย้อนกลับไปสัมผัสช่วงเวลาที่ผ่านมาได้อีกครั้ง — รอยยิ้ม เสียงหัวเราะ และแสงที่เกิดขึ้น
                  เพียงเสี้ยววินาที
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">2) แบ่งปันประสบการณ์และสร้างแรงบันดาลใจ</p>
                <p className="mt-1 text-sm">
                  ภาพที่สวยและมีระดับ ช่วยเล่าเรื่องการเดินทางของคุณให้คนรอบตัวและผู้ติดตามรู้สึก “อยากออกเดินทางตาม”
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">3) สร้างสรรค์ผลงานศิลปะเฉพาะตัว</p>
                <p className="mt-1 text-sm">
                  ทุกภาพพอร์ตเทรตและแลนด์สเคป คือผลงานที่สะท้อนมุมมองเฉพาะคุณ โดยมีช่างภาพมืออาชีพดูแลเคียงข้าง
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6 md:p-8">
            <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase">Brand credibility</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold text-slate-900">
              Chapter 99 Photography: ผู้สร้างสรรค์ “Trip2Talk”
            </h2>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              Trip2Talk ไม่ใช่แค่เพจท่องเที่ยวทั่วไป แต่เป็นโปรเจกต์จาก Chapter 99 Photography สตูดิโอช่างภาพมืออาชีพ
              เราเชื่อว่าทุกการเดินทางมีเรื่องราว และทุกเรื่องราวควรถูกบันทึกด้วยภาพถ่ายที่งดงามที่สุด
            </p>
            <p className="mt-4 text-sm font-medium text-slate-700 italic">
              “ขอให้สนุกกับการถ่ายภาพ และมีความสุขในทุกการเดินทาง”
            </p>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
            <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase">FAQ</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold text-slate-900">
              ค่าใช้จ่ายในแพ็กเกจรวมที่พักในรูปแบบใด?
            </h2>
            <div className="mt-4 text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                <span className="font-semibold text-slate-900">สไตล์ที่พัก:</span> Backpacker &amp; Budget Trip — Hostel,
                Backpackers, หรือ Motel ที่คัดสรรแล้วว่าสะอาด ปลอดภัย และมีสิ่งอำนวยความสะดวกพื้นฐานครบ
              </p>
              <p>
                <span className="font-semibold text-slate-900">การอัปเกรด:</span> หากต้องการโรงแรมหรูขึ้นหรือ Private Room
                สามารถแจ้งความประสงค์และชำระส่วนต่างเพิ่มเองได้ (ขอให้แจ้งล่วงหน้าเพื่อจัดการจองให้ทัน)
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase">Contact form</p>
                <h2 className="mt-3 font-serif text-2xl font-semibold text-slate-900">Send Message (ส่งข้อความ)</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Prefer Messenger? Use the official inbox link below — we reply fast.
                </p>
              </div>
              {busy && (
                <span className="inline-flex items-center gap-2 text-xs font-mono text-emerald-700">
                  <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  SENDING…
                </span>
              )}
            </div>

            {(ok || err) && (
              <div
                className={cn(
                  'mt-5 rounded-2xl border px-4 py-3 text-sm',
                  err ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                )}
              >
                {err ? (
                  <>
                    <p className="font-semibold">Couldn’t send via web form.</p>
                    <p className="mt-1">
                      Please use email instead:{' '}
                      <a href={mailtoHref} className="underline underline-offset-2 font-semibold">
                        open email draft
                      </a>
                    </p>
                    <p className="mt-1 text-xs text-red-600/90 font-mono">{err}</p>
                  </>
                ) : (
                  ok
                )}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={(e) => void submit(e)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold tracking-wide text-slate-600">First Name *</label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    value={form.firstName}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="Saen"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold tracking-wide text-slate-600">Last Name *</label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    value={form.lastName}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Chayakorn"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold tracking-wide text-slate-600">Email Address *</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="you@email.com"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              <div>
                <label className="text-xs font-semibold tracking-wide text-slate-600">Message *</label>
                <textarea
                  className="mt-2 w-full min-h-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Tell us which trip you’re interested in, your dates, group size, and any questions."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
                <button
                  type="submit"
                  disabled={!canSend || busy}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-navy text-white font-semibold text-sm hover:bg-navy-dark transition-colors disabled:opacity-40"
                >
                  Send Message (ส่งข้อความ)
                </button>
                <a
                  href={mailtoHref}
                  className="text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
                >
                  Or email us directly →
                </a>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-6 md:p-8">
            <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase">Official contact</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold text-slate-900">
              Come and VISIT our STUDIO (Chapter 99 Photography &amp; Trip2Talk)
            </h2>

            <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Address</dt>
                <dd className="mt-1 font-medium text-slate-800">33/14 Jubilee Ave, Warriewood NSW 2102</dd>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Opening Hours</dt>
                <dd className="mt-1 font-medium text-slate-800">Mon–Fri · 10:00 AM – 5:00 PM (by appointment)</dd>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ABN</dt>
                <dd className="mt-1 font-medium text-slate-800">81951461769</dd>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</dt>
                <dd className="mt-1 font-medium text-slate-800">+61 0452 044 382</dd>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</dt>
                <dd className="mt-1 font-medium text-slate-800">trip2talksyd@gmail.com</dd>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:col-span-2">
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Main channel</dt>
                <dd className="mt-1 font-medium text-slate-800">
                  INBOX Facebook Page (Messenger)
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href="https://m.me/trip2talk.chapter99"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 bg-messenger text-white rounded-[18px] px-4 py-3.5 font-semibold"
              >
                <span
                  className="w-8 h-8 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #00c6ff, #0a7cff, #a033ff)' }}
                  aria-hidden
                />
                INBOX Facebook Page
              </a>
              <Link
                to="/package-terms"
                className="inline-flex items-center justify-center rounded-[18px] border border-slate-200 px-4 py-3.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Read policies &amp; terms
              </Link>
            </div>

            <p className="mt-8 text-xs text-slate-400">© 2026 trip2talk. All rights reserved.</p>
          </div>
        </section>
      </main>

      <PublicBottomNav />
    </div>
  );
}

