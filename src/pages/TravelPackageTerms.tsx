import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TRIP_SIZE_TIERS } from '../lib/bookingPolicy';

type TabId = 'service' | 'pricing' | 'cancel' | 'vehicle';

const TABS: { id: TabId; label: string }[] = [
  { id: 'service', label: '📸 1.ลักษณะบริการ' },
  { id: 'pricing', label: '💲 2.ราคาและค่าใช้จ่าย' },
  { id: 'cancel', label: '🚫 3.การยกเลิก' },
  { id: 'vehicle', label: '🛡 4.ยานพาหนะ&ลิขสิทธิ์' },
];

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1469854523086-cc02afe5c88?w=1920&q=80';

const SERVICE_CHECKS = [
  'ช่างภาพมืออาชีพนำทริปและถ่ายภาพตลอดเส้นทาง',
  'วางแผนเส้นทาง จุดแสง และช่วงเวลาถ่าย',
  'ผู้จัดทริป (ช่างภาพ) เป็นผู้ขับรถ นำทาง และประสานงาน',
  'จัดที่พักมาตรฐานตามแพ็กเกจ (อัปเกรด Premium = Top-Up เอง)',
];

const INCLUDED = [
  'ช่างภาพ / ค่าบริการถ่ายภาพและตัดต่อ .JPG',
  'ที่พักมาตรฐานตามแพ็กเกจ',
  'รถ + น้ำมัน + ประกันภัยรถเช่า (ตามเงื่อนไขผู้ให้บริการ)',
];

const EXCLUDED = [
  'ตั๋วเครื่องบิน / ค่าเดินทางระหว่างประเทศ',
  'อาหารและเครื่องดื่มส่วนตัว',
  'Travel Insurance (ประกันการเดินทาง) — ลูกค้าจัดหาเอง',
];

const CANCEL_ROWS = [
  { range: 'มากกว่า 60 วัน', fee: 'หัก 10%', refund: 'คืน 90%', highlight: false },
  { range: '31–60 วัน', fee: 'หัก 50%', refund: 'คืน 50%', highlight: false },
  { range: '≤30 วัน', fee: 'ไม่คืน', refund: '—', highlight: true },
];

function CheckIcon({ className = 'text-teal' }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 w-5 h-5 items-center justify-center ${className}`} aria-hidden>
      ✓
    </span>
  );
}

function XIcon() {
  return (
    <span className="inline-flex shrink-0 w-5 h-5 items-center justify-center text-rose-600" aria-hidden>
      ✗
    </span>
  );
}

export default function TravelPackageTerms() {
  const [activeTab, setActiveTab] = useState<TabId>('service');
  const sectionRefs = useRef<Record<TabId, HTMLElement | null>>({
    service: null,
    pricing: null,
    cancel: null,
    vehicle: null,
  });

  const scrollToTab = (id: TabId) => {
    setActiveTab(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const ids: TabId[] = ['service', 'pricing', 'cancel', 'vehicle'];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));
        const top = visible[0]?.target.getAttribute('data-tab') as TabId | null;
        if (top) setActiveTab(top);
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: [0.1, 0.25] }
    );

    ids.forEach((id) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Hero */}
      <header className="relative bg-navy text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy via-navy to-navy/95" aria-hidden />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-14 md:py-18">
          <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-semibold leading-snug">
            เงื่อนไขและข้อตกลงการใช้บริการถ่ายภาพเดินทางส่วนตัว
          </h1>
          <p className="mt-4 font-mono text-sm md:text-base text-teal tracking-wide">
            Travel Photos Package Terms &amp; Conditions
          </p>
          <p className="mt-2 text-sm text-gray-400">
            ผู้ให้บริการ: Chapter99 Photography &amp; Trip2talk
          </p>
        </div>
      </header>

      {/* Sticky tabs */}
      <div className="sticky top-14 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-thin">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => scrollToTab(t.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? 'bg-navy text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-16">
        {/* Tab 1 */}
        <section
          ref={(el) => {
            sectionRefs.current.service = el;
          }}
          data-tab="service"
          id="tab-service"
          className="scroll-mt-36"
        >
          <div className="border-l-4 border-teal pl-5 mb-6">
            <h2 className="font-serif text-2xl font-semibold text-slate-900">1. ลักษณะบริการ</h2>
            <p className="text-sm text-slate-500 mt-1">Private Photo Journey — ไม่ใช่บริการนำเที่ยวทั่วไป</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 md:p-6 text-amber-950 text-sm leading-relaxed space-y-3">
            <p>
              บริการนี้คือ &apos;ทริปถ่ายภาพเดินทางส่วนตัว (Private Photo Journey)&apos; โดย Chapter 99
              Photography / Trip2Talk
            </p>
            <p>
              ผู้จัดทริป (ช่างภาพ) เป็นผู้ขับรถ นำทาง และวางแผนการเดินทาง รวมถึงประสานงานที่พักและจุดถ่ายภาพตามแพ็กเกจที่ตกลงกัน
            </p>
            <p className="font-semibold">
              สำคัญที่สุด: บริการนี้ไม่ใช่บริการนำเที่ยวเชิงพาณิชย์ (Commercial Tour Operator)
              ที่ครอบคลุมทุกด้านแบบบริษัทนำเที่ยวทั่วไป
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SERVICE_CHECKS.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700"
              >
                <CheckIcon className="text-teal font-bold" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tab 2 */}
        <section
          ref={(el) => {
            sectionRefs.current.pricing = el;
          }}
          data-tab="pricing"
          id="tab-pricing"
          className="scroll-mt-36"
        >
          <div className="border-l-4 border-teal pl-5 mb-6">
            <h2 className="font-serif text-2xl font-semibold text-slate-900">2. ราคาและค่าใช้จ่าย</h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="text-left px-4 py-3 font-semibold">Tier</th>
                  <th className="text-left px-4 py-3 font-semibold">ขนาดกลุ่ม</th>
                  <th className="text-left px-4 py-3 font-semibold">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-emerald-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {TRIP_SIZE_TIERS.STANDARD.tierLabel}
                  </td>
                  <td className="px-4 py-3">
                    {TRIP_SIZE_TIERS.STANDARD.paxMin}–{TRIP_SIZE_TIERS.STANDARD.paxMax} คน
                  </td>
                  <td className="px-4 py-3 text-slate-600">{TRIP_SIZE_TIERS.STANDARD.pricingNoteTh}</td>
                </tr>
                <tr className="bg-amber-50 border-t border-slate-200">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {TRIP_SIZE_TIERS.PRIVATE.tierLabel}
                  </td>
                  <td className="px-4 py-3">
                    {TRIP_SIZE_TIERS.PRIVATE.paxMin}–{TRIP_SIZE_TIERS.PRIVATE.paxMax} คน
                  </td>
                  <td className="px-4 py-3 text-slate-600">{TRIP_SIZE_TIERS.PRIVATE.pricingNoteTh}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 leading-relaxed">
            <strong>2.1 หมายเหตุราคา:</strong> ราคาทริปถูกกำหนดตามจำนวนผู้ร่วมเดินทางที่ยืนยัน:
            <br />
            ทริปออกเดินทางได้ตั้งแต่ 1 ท่านขึ้นไป (Private Rate) หรือ 4 ท่านขึ้นไป (Standard Rate)
          </p>

          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-800" colSpan={2}>
                    รายการรวม / ไม่รวม
                  </th>
                </tr>
              </thead>
              <tbody>
                {INCLUDED.map((row) => (
                  <tr key={row} className="border-t border-slate-100">
                    <td className="px-4 py-3 w-10">
                      <CheckIcon />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row}</td>
                  </tr>
                ))}
                {EXCLUDED.map((row) => (
                  <tr key={row} className="border-t border-slate-100 bg-rose-50/40">
                    <td className="px-4 py-3 w-10">
                      <XIcon />
                    </td>
                    <td className={`px-4 py-3 ${row.includes('Travel Insurance') ? 'font-bold text-rose-700' : 'text-slate-700'}`}>
                      {row}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            <strong>ที่พัก:</strong> อัปเกรด Premium = ลูกค้าจ่าย Top-Up เองตามราคาที่พักเรียกเก็บ
          </p>
        </section>

        {/* Tab 3 */}
        <section
          ref={(el) => {
            sectionRefs.current.cancel = el;
          }}
          data-tab="cancel"
          id="tab-cancel"
          className="scroll-mt-36"
        >
          <div className="border-l-4 border-teal pl-5 mb-6">
            <h2 className="font-serif text-2xl font-semibold text-slate-900">3. การยกเลิก</h2>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <p className="font-semibold">พี่แสนยกเลิก (คนไม่ครบ ภายใน 45 วันก่อนออกทริป)</p>
            <p className="mt-2 text-sm">→ คืนเงิน <strong>100%</strong> ของยอดที่ชำระแล้ว</p>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-rose-900 text-white">
                  <th className="text-left px-4 py-3 font-semibold">ระยะเวลาก่อนออกทริป</th>
                  <th className="text-left px-4 py-3 font-semibold">ค่าธรรมเนียมยกเลิก (ลูกค้า)</th>
                  <th className="text-left px-4 py-3 font-semibold">คืนเงินโดยประมาณ</th>
                </tr>
              </thead>
              <tbody>
                {CANCEL_ROWS.map((row) => (
                  <tr
                    key={row.range}
                    className={`border-t border-slate-100 ${row.highlight ? 'bg-rose-50' : 'bg-white'}`}
                  >
                    <td
                      className={`px-4 py-3 ${row.highlight ? 'text-rose-600 font-bold' : 'text-slate-800'}`}
                    >
                      {row.range}
                    </td>
                    <td
                      className={`px-4 py-3 ${row.highlight ? 'text-rose-600 font-bold' : 'text-slate-700'}`}
                    >
                      {row.fee}
                    </td>
                    <td
                      className={`px-4 py-3 ${row.highlight ? 'text-rose-600 font-bold' : 'text-slate-700'}`}
                    >
                      {row.refund}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tab 4 */}
        <section
          ref={(el) => {
            sectionRefs.current.vehicle = el;
          }}
          data-tab="vehicle"
          id="tab-vehicle"
          className="scroll-mt-36"
        >
          <div className="border-l-4 border-teal pl-5 mb-6">
            <h2 className="font-serif text-2xl font-semibold text-slate-900">4. ยานพาหนะ &amp; ลิขสิทธิ์</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase text-slate-500 tracking-wide">ยานพาหนะ</p>
              <p className="mt-2 font-semibold text-slate-900">ผู้จัดทริปเท่านั้นที่ขับรถเช่า</p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                ลูกค้าไม่มีสิทธิ์ขับรถเช่าเอง ต้องปฏิบัติตามกฎจราจรและคำแนะนำด้านความปลอดภัยตลอดทริป
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase text-slate-500 tracking-wide">รูปภาพ</p>
              <p className="mt-2 font-semibold text-slate-900">ส่งรูป 1–4 สัปดาห์</p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                ช่างภาพสงวนสิทธิ์ใช้ภาพใน Portfolio / โซเชียล (ไม่ระบุข้อมูลส่วนตัว) เว้นแต่ลูกค้าขอ opt-out เป็นลายลักษณ์อักษร
                ลิงก์อัลบั้ม .JPG ใช้ได้ 60 วัน — กรุณาดาวน์โหลดเก็บไว้เองก่อนหมดอายุ
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-navy text-white p-6 text-center">
            <p className="font-semibold text-lg">ชำระมัดจำ = ยอมรับเงื่อนไขทั้งหมด</p>
            <p className="mt-2 text-sm text-white/70">
              การชำระเงินมัดจำหรือยืนยันการจองถือว่าท่านได้อ่านและยอมรับข้อตกลงฉบับนี้แล้ว
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="font-semibold text-slate-900">ติดต่อ</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>
                <span aria-hidden>📞</span>{' '}
                <a href="tel:+61452044382" className="text-teal hover:underline font-mono">
                  +0452044382
                </a>
              </li>
              <li>
                <span aria-hidden>✉️</span>{' '}
                <a href="mailto:trip2talksyd@gmail.com" className="text-teal hover:underline">
                  trip2talksyd@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </section>

        <p className="text-xs text-slate-500 pt-4 border-t border-slate-100">
          <Link to="/" className="text-teal hover:underline">
            ← Home
          </Link>
          {' · '}
          <Link to="/terms" className="text-teal hover:underline">
            Photo delivery terms
          </Link>
        </p>
      </div>

      <footer className="border-t border-slate-200 bg-[#f8f8f8] py-10 text-center text-xs text-slate-500">
        <p>© 2026 Chapter 99 Photography &amp; Trip2Talk</p>
        <p className="mt-2 text-slate-400">Terms adapted under Australian Consumer Law</p>
      </footer>
    </div>
  );
}
