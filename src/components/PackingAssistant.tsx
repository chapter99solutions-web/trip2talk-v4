import { useEffect, useMemo, useState } from 'react';
import { useModelGallery } from '../hooks/useModelGallery';

export interface PackingAssistantProps {
  tourCode: string;
  language: 'TH' | 'EN';
  storageKey?: string;
}

type Lang = 'TH' | 'EN';
type ProfileId = 'AUS' | 'NZ';

interface Bi {
  th: string;
  en: string;
}

interface PackGroup {
  id: string;
  icon: string;
  title: Bi;
  items: Bi[];
}

interface TripProfile {
  id: ProfileId;
  flag: string;
  accent: string; // tailwind gradient classes for hero
  shortLabel: Bi;
  duration: Bi;
  name: Bi;
  heroWhy: Bi;
  clothesSummary: Bi;
  packGroups: PackGroup[];
  avoid: Bi[];
}

const SLOGAN = 'แพ็คน้อย เที่ยวสบาย';
const SLOGAN_EN = 'Pack light, travel easy';

/** Shared minivan context — 8-seat van: 6 guests + guide Saen + driver. */
const WHY_LIGHT: { icon: string; title: Bi; body: Bi }[] = [
  {
    icon: '🚐',
    title: { th: 'พื้นที่ในรถตู้แชร์กัน', en: 'Shared van space' },
    body: {
      th: 'รถตู้ 8 ที่นั่ง (ลูกทัวร์ 6 + พี่แสน + คนขับ) พื้นที่เก็บกระเป๋าจำกัด ทุกคนต้องแพ็คเบาเพื่อให้ของลงครบ',
      en: '8-seat van (6 guests + Saen + driver). Storage is limited — everyone packs light so all bags fit.',
    },
  },
  {
    icon: '📸',
    title: { th: 'คล่องตัวเวลาเก็บภาพ', en: 'Mobility at photo spots' },
    body: {
      th: 'หลายจุดถ่ายต้องเดินเลาะ ขึ้น-ลงรถบ่อย กระเป๋าเบาทำให้ขยับไว ไม่พลาดช่วงแสงสวย',
      en: 'Many spots need short walks and frequent van stops. Light bags = quick moves, no missed golden light.',
    },
  },
  {
    icon: '🧳',
    title: { th: 'ยกขนสบาย ไม่เมื่อย', en: 'Easy luggage handling' },
    body: {
      th: 'เช็คอินโรงแรมหลายคืน ยกกระเป๋าขึ้น-ลงเอง กระเป๋าใบเดียวจัดการง่ายกว่าเยอะ',
      en: 'Multiple hotel check-ins, lifting your own bags — one bag is far easier to manage.',
    },
  },
];

const CAMERA_BASE: Bi[] = [
  { th: 'กล้อง + เลนส์ที่ถนัด (พกเท่าที่จำเป็น)', en: 'Camera + your go-to lens (only what you need)' },
  { th: 'แบตเตอรี่สำรอง + การ์ดความจำสำรอง', en: 'Spare batteries + extra memory cards' },
  { th: 'ที่ชาร์จ + หัวแปลงปลั๊ก (ออส/นิวซีแลนด์ ใช้ Type I)', en: 'Chargers + plug adapter (AU/NZ Type I)' },
  { th: 'พาวเวอร์แบงก์ (พกขึ้นเครื่องเท่านั้น ห้ามโหลด)', en: 'Power bank (carry-on only — never checked)' },
];

const TOILETRIES_BASE: Bi[] = [
  { th: 'ของใช้ขนาดพกพา (ของเหลวไม่เกิน 100ml ต่อชิ้น)', en: 'Travel-size items (liquids ≤100ml each)' },
  { th: 'ครีมกันแดด SPF50+ + ลิปมัน + แว่นกันแดด', en: 'SPF50+ sunscreen + lip balm + sunglasses' },
  { th: 'ยาประจำตัว + ยาสามัญ (พารา, ยาแก้เมารถ)', en: 'Personal meds + basics (paracetamol, motion-sickness)' },
];

const PROFILES: Record<ProfileId, TripProfile> = {
  AUS: {
    id: 'AUS',
    flag: '🇦🇺',
    accent: 'from-teal-500 to-emerald-600',
    shortLabel: { th: 'ออสเตรเลีย', en: 'Australia' },
    duration: { th: '3 คืน 4 วัน', en: '3N4D' },
    name: { th: 'ทริปออสเตรเลีย · 3 คืน 4 วัน', en: 'Australia Trip · 3N4D' },
    heroWhy: {
      th: 'ทริปสั้นกระชับ ขนของน้อย เดินทางคล่อง เก็บภาพได้เต็มที่ทุกพิกัด',
      en: 'A short, snappy trip — pack minimal, move freely, and capture every spot.',
    },
    clothesSummary: { th: 'เสื้อผ้า 3-4 ชุด', en: '3-4 outfits' },
    packGroups: [
      {
        id: 'clothes',
        icon: '👕',
        title: { th: 'เสื้อผ้า', en: 'Clothes' },
        items: [
          { th: 'เสื้อผ้า 3-4 ชุด เน้นมิกซ์แอนด์แมตช์ได้หลายลุค', en: '3-4 outfits, mix-and-match friendly' },
          { th: 'แจ็คเก็ตกันลม 1 ตัว (เช้า-เย็นอากาศเย็น)', en: '1 windproof jacket (cool mornings/evenings)' },
          { th: 'ชุดนอน + ชุดชั้นในพอดีจำนวนวัน', en: 'Sleepwear + underwear for the trip length' },
          { th: 'รองเท้าผ้าใบ 1 คู่ + รองเท้าแตะ 1 คู่', en: '1 pair sneakers + 1 pair sandals' },
        ],
      },
      { id: 'camera', icon: '📷', title: { th: 'อุปกรณ์กล้อง', en: 'Camera gear' }, items: CAMERA_BASE },
      { id: 'toiletries', icon: '🧴', title: { th: 'ของใช้ส่วนตัว', en: 'Toiletries' }, items: TOILETRIES_BASE },
      {
        id: 'docs',
        icon: '📄',
        title: { th: 'เอกสารสำคัญ', en: 'Documents' },
        items: [
          { th: 'พาสปอร์ต (เหลืออายุ 6 เดือนขึ้นไป)', en: 'Passport (6+ months validity)' },
          { th: 'วีซ่า/ETA + เอกสารประกันเดินทาง', en: 'Visa/ETA + travel insurance' },
          { th: 'สำเนาใบจองทริป + ตั๋วเครื่องบิน', en: 'Booking confirmation + flight tickets' },
        ],
      },
    ],
    avoid: [
      { th: 'กระเป๋าเดินทางใบใหญ่เกินไป — ใต้ท้องรถตู้พื้นที่จำกัด', en: 'Oversized luggage — van storage is limited' },
      { th: 'รองเท้าหลายคู่ (2 คู่พอ)', en: 'Too many shoes (2 pairs is plenty)' },
      { th: 'เสื้อผ้าเผื่อเยอะเกินจำนวนวัน', en: 'More clothes than days' },
      { th: 'ไดร์เป่าผม/อุปกรณ์ไฟฟ้าหนัก — ที่พักมีให้', en: 'Hair dryer/heavy appliances — provided at stays' },
      { th: 'ของมีค่าชิ้นใหญ่/เครื่องประดับไม่จำเป็น', en: 'Bulky valuables/unnecessary jewelry' },
    ],
  },
  NZ: {
    id: 'NZ',
    flag: '🇳🇿',
    accent: 'from-sky-600 to-indigo-700',
    shortLabel: { th: 'นิวซีแลนด์', en: 'New Zealand' },
    duration: { th: '5 คืน 6 วัน', en: '5N6D' },
    name: { th: 'ทริปนิวซีแลนด์ · 5 คืน 6 วัน', en: 'New Zealand Trip · 5N6D' },
    heroWhy: {
      th: 'ทริปยาวขึ้น เน้นเลเยอร์เสื้อผ้าตามอากาศที่เปลี่ยนไว และต้องผ่านกฎ Biosecurity ที่เข้มงวด',
      en: 'A longer trip — layer for fast-changing weather and prepare for strict biosecurity checks.',
    },
    clothesSummary: { th: 'เสื้อผ้า 5-6 ชุด + เลเยอร์', en: '5-6 outfits + layers' },
    packGroups: [
      {
        id: 'clothes',
        icon: '👕',
        title: { th: 'เสื้อผ้า (เน้นเลเยอร์)', en: 'Clothes (layer up)' },
        items: [
          { th: 'เสื้อผ้า 5-6 ชุด ใส่ซ้อนเลเยอร์ปรับตามอากาศได้', en: '5-6 outfits, layer-friendly' },
          { th: 'เสื้อกันหนาว + เสื้อฮีทเทค (กลางคืนหนาวจัด)', en: 'Warm jacket + thermal base layer (cold nights)' },
          { th: 'เสื้อกันฝน/แจ็คเก็ตกันน้ำ (อากาศ NZ เปลี่ยนไว)', en: 'Rain jacket (NZ weather changes fast)' },
          { th: 'หมวกไหมพรม + ถุงมือ + ผ้าพันคอ', en: 'Beanie + gloves + scarf' },
          { th: 'รองเท้าเดินสบายกันลื่น 1 คู่ + รองเท้าแตะ', en: '1 pair comfy non-slip shoes + sandals' },
        ],
      },
      {
        id: 'camera',
        icon: '📷',
        title: { th: 'อุปกรณ์กล้อง', en: 'Camera gear' },
        items: [
          ...CAMERA_BASE,
          { th: 'ถุงทำความร้อน (Hand Warmer) ห่อแบตสำรอง — อากาศหนาวแบตหมดไว', en: 'Hand warmers for spare batteries (cold drains them fast)' },
        ],
      },
      { id: 'toiletries', icon: '🧴', title: { th: 'ของใช้ส่วนตัว', en: 'Toiletries' }, items: TOILETRIES_BASE },
      {
        id: 'docs',
        icon: '📄',
        title: { th: 'เอกสารสำคัญ', en: 'Documents' },
        items: [
          { th: 'พาสปอร์ต (เหลืออายุ 6 เดือนขึ้นไป)', en: 'Passport (6+ months validity)' },
          { th: 'NZeTA + IVL (ลงทะเบียนออนไลน์ก่อนเดินทาง)', en: 'NZeTA + IVL (register online before travel)' },
          { th: 'เอกสารประกันเดินทาง', en: 'Travel insurance documents' },
          { th: 'สำเนาใบจองทริป + ตั๋วเครื่องบิน', en: 'Booking confirmation + flight tickets' },
        ],
      },
    ],
    avoid: [
      { th: 'อาหารสด/ของกินติดมือ — ผิดกฎ Biosecurity (ดูด้านล่าง)', en: 'Fresh food/snacks — breaks biosecurity rules (see below)' },
      { th: 'กระเป๋าเดินทางใบใหญ่เกินไป — ใต้ท้องรถตู้พื้นที่จำกัด', en: 'Oversized luggage — van storage is limited' },
      { th: 'รองเท้าหลายคู่ (2 คู่พอ)', en: 'Too many shoes (2 pairs is plenty)' },
      { th: 'เสื้อผ้าฤดูร้อนล้วน — NZ หนาวและเปลี่ยนอากาศไว', en: 'Summer-only clothes — NZ is cold and unpredictable' },
      { th: 'ไดร์เป่าผม/อุปกรณ์ไฟฟ้าหนัก — ที่พักมีให้', en: 'Hair dryer/heavy appliances — provided at stays' },
    ],
  },
};

const NZ_BIOSECURITY_PROHIBITED: Bi[] = [
  { th: '🍎 ผลไม้สด & ผักสดทุกชนิด', en: '🍎 All fresh fruit & vegetables' },
  { th: '🥩 เนื้อสัตว์ทุกชนิด (สด / แห้ง / แปรรูป)', en: '🥩 Any meat (fresh / dried / processed)' },
  { th: '🍯 น้ำผึ้ง & ผลิตภัณฑ์จากผึ้ง', en: '🍯 Honey & bee products' },
  { th: '🌱 เมล็ดพันธุ์ พืช ดอกไม้สด', en: '🌱 Seeds, plants, fresh flowers' },
  { th: '🥾 ดินติดรองเท้า/อุปกรณ์ — ล้างให้สะอาดก่อนบิน!', en: '🥾 Soil on shoes/gear — clean before flying!' },
  { th: '🪵 ไม้ ของแกะสลักไม้ งานจักสาน', en: '🪵 Wood, wooden carvings, woven items' },
];

interface LookbookCard {
  id: string;
  location: Bi;
  outfit: Bi;
  pose: Bi;
  season: string;
}

/** Editorial outfit & pose ideas — paired with model photos from Supabase. */
const LOOKBOOK: LookbookCard[] = [
  {
    id: 'helensburgh',
    location: { th: 'สถานีรถไฟร้าง Helensburgh', en: 'Helensburgh Old Station' },
    outfit: { th: 'เสื้อ Vintage ลายตาราง + กางเกงผ้าทีโทน', en: 'Vintage plaid shirt + neutral wide-leg trousers' },
    pose: { th: 'หันหลังมองในอุโมงค์ แสงลอดผ่าน', en: 'Back-to-camera gazing into the tunnel light' },
    season: '🍂 Autumn/Winter',
  },
  {
    id: 'bombo',
    location: { th: 'เสาหินบะซอลต์ Bombo Headland', en: 'Bombo Headland Quarry' },
    outfit: { th: 'Windbreaker สีสด + กางเกงยีนส์ทรงกระบอก', en: 'Bright windbreaker + straight-leg jeans' },
    pose: { th: 'เดินตัดเฟรมหินพร้อมลมพัด ไดนามิก', en: 'Dynamic walk pose between basalt columns' },
    season: '❄️ Winter',
  },
  {
    id: 'seacliff',
    location: { th: 'สะพาน Seacliff Bridge', en: 'Seacliff Bridge' },
    outfit: { th: 'เดรสลายดอกเล็ก + รองเท้า Sneaker ขาว', en: 'Small floral dress + white sneakers' },
    pose: { th: 'เอนพิงราวสะพาน มองทะเลด้านล่าง', en: 'Leaning on railing gazing at ocean below' },
    season: '🌸 Spring',
  },
];

function resolveProfile(tourCode: string): ProfileId {
  return tourCode.toUpperCase().includes('NZ') ? 'NZ' : 'AUS';
}

export default function PackingAssistant({ tourCode, language: initialLang, storageKey }: PackingAssistantProps) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [profileId, setProfileId] = useState<ProfileId>(() => resolveProfile(tourCode));
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const { urls: modelUrls, loading: modelLoading } = useModelGallery();

  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  useEffect(() => {
    setProfileId(resolveProfile(tourCode));
  }, [tourCode]);

  const checkKey = storageKey ? `t2t_packing_guide_${storageKey}_${profileId}` : null;

  useEffect(() => {
    if (!checkKey) {
      setChecked({});
      return;
    }
    try {
      const raw = localStorage.getItem(checkKey);
      setChecked(raw ? (JSON.parse(raw) as Record<string, boolean>) : {});
    } catch {
      setChecked({});
    }
  }, [checkKey]);

  useEffect(() => {
    if (!checkKey) return;
    localStorage.setItem(checkKey, JSON.stringify(checked));
  }, [checked, checkKey]);

  const profile = PROFILES[profileId];
  const t = (bi: Bi) => (lang === 'TH' ? bi.th : bi.en);

  const allItems = useMemo(
    () => profile.packGroups.flatMap((g) => g.items.map((_, i) => `${g.id}-${i}`)),
    [profile]
  );
  const packedCount = allItems.filter((id) => checked[id]).length;
  const totalCount = allItems.length;
  const pct = totalCount ? Math.round((packedCount / totalCount) * 100) : 0;

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-3 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-bold text-gray-900 text-xl">
              {lang === 'TH' ? '🧳 คู่มือแพ็คกระเป๋า' : '🧳 Packing Guide'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{tourCode}</p>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')}
            className="text-xs border border-gray-200 rounded-full px-3 py-2 font-semibold text-gray-600 bg-white active:bg-gray-50 transition-colors"
          >
            {lang === 'TH' ? 'EN' : 'ไทย'}
          </button>
        </div>

        {/* Trip profile selector */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(Object.keys(PROFILES) as ProfileId[]).map((id) => {
            const p = PROFILES[id];
            const active = id === profileId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setProfileId(id)}
                className={`rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                  active
                    ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-200'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.flag}</span>
                  <div>
                    <p className={`text-sm font-bold leading-tight ${active ? 'text-teal-700' : 'text-gray-800'}`}>
                      {t(p.shortLabel)}
                    </p>
                    <p className="text-xs text-gray-500">{t(p.duration)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* 1. Hero */}
        <div className={`rounded-3xl bg-gradient-to-br ${profile.accent} text-white p-5 shadow-sm`}>
          <div className="flex items-center gap-2 text-white/90 text-sm font-semibold">
            <span className="text-2xl">{profile.flag}</span>
            <span>{t(profile.name)}</span>
          </div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight leading-snug">{SLOGAN}</p>
          <p className="text-white/80 text-xs font-medium">{SLOGAN_EN}</p>
          <p className="mt-3 text-sm text-white/90 leading-relaxed">{t(profile.heroWhy)}</p>
        </div>

        {/* 2. Recommended bag */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="font-bold text-gray-900 text-sm mb-3">
            🎒 {lang === 'TH' ? 'กระเป๋าที่แนะนำ' : 'Recommended bags'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-3">
              <p className="text-2xl">🧳</p>
              <p className="text-sm font-bold text-teal-800 mt-1">
                {lang === 'TH' ? 'กระเป๋าถือขึ้นเครื่อง' : 'Carry-on'}
              </p>
              <p className="text-xs text-teal-700 mt-0.5">
                {lang === 'TH' ? 'ใบเดียว · ไม่เกิน 7 กก.' : '1 bag · max 7 kg'}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
              <p className="text-2xl">🎒</p>
              <p className="text-sm font-bold text-amber-800 mt-1">{lang === 'TH' ? 'กระเป๋าเป้เล็ก' : 'Daypack'}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {lang === 'TH' ? 'ใส่กล้อง + ของใช้ระหว่างวัน' : 'Camera + day essentials'}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            {lang === 'TH'
              ? 'แค่ 2 ใบนี้ก็พอสำหรับทั้งทริป — ไม่ต้องโหลดกระเป๋าใบใหญ่ใต้เครื่อง'
              : 'These two are enough for the whole trip — no need for a large checked bag.'}
          </p>
        </div>

        {/* 3. Why pack light */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="font-bold text-gray-900 text-sm mb-3">
            💡 {lang === 'TH' ? 'ทำไมต้องแพ็คเบา' : 'Why pack light'}
          </p>
          <div className="space-y-3">
            {WHY_LIGHT.map((r) => (
              <div key={r.title.en} className="flex gap-3">
                <span className="text-xl flex-shrink-0">{r.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t(r.title)}</p>
                  <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{t(r.body)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Smart packing list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-gray-900 text-sm">
              📋 {lang === 'TH' ? 'รายการแพ็คของอัจฉริยะ' : 'Smart packing list'}
            </p>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              {t(profile.clothesSummary)}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full bg-teal-500 transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">
              {packedCount}/{totalCount}
            </span>
          </div>

          <div className="space-y-4">
            {profile.packGroups.map((group) => (
              <div key={group.id}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  {group.icon} {t(group.title)}
                </p>
                <div className="space-y-1.5">
                  {group.items.map((item, i) => {
                    const id = `${group.id}-${i}`;
                    const isChecked = !!checked[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggle(id)}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-xl border text-left active:scale-[0.98] transition-all ${
                          isChecked ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                            isChecked ? 'border-teal-500 bg-teal-500' : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isChecked && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span className={`text-xs leading-relaxed ${isChecked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {t(item)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editorial outfit & pose slideshow */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-gray-900 text-sm">
              📸 {lang === 'TH' ? 'ไอเดียแต่งตัว & ท่าโพส' : 'Outfit & Pose Ideas'}
            </p>
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold">Lookbook</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            {lang === 'TH' ? 'ปัดเพื่อดูเพิ่ม →' : 'Swipe to explore →'}
          </p>

          <div className="-mx-4 overflow-x-auto snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-4 px-4 pb-2">
              {LOOKBOOK.map((card, idx) => {
                const photo = modelUrls.length ? modelUrls[idx % modelUrls.length] : null;
                return (
                  <article
                    key={card.id}
                    className="snap-start shrink-0 w-[80%] sm:w-[58%] lg:w-[calc((100%-2rem)/3)] h-[440px] rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col"
                  >
                    {/* Photo — 60% height, cover fit */}
                    <div className="relative h-[60%] overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
                      {photo ? (
                        <img
                          src={photo}
                          alt={lang === 'TH' ? card.location.th : card.location.en}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                        />
                      ) : (
                        <div className={`absolute inset-0 ${modelLoading ? 'animate-pulse' : ''}`} />
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <span className="absolute top-3 left-3 text-[11px] font-semibold text-white bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
                        {card.season}
                      </span>
                      <span className="absolute top-3 right-3 text-[10px] font-bold text-white/90 tracking-widest">
                        {String(idx + 1).padStart(2, '0')}/{String(LOOKBOOK.length).padStart(2, '0')}
                      </span>
                      <div className="absolute bottom-3 left-4 right-4">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/70 font-semibold mb-0.5">
                          {lang === 'TH' ? 'พิกัด' : 'Location'}
                        </p>
                        <p className="text-white font-bold text-sm leading-snug drop-shadow">
                          {lang === 'TH' ? card.location.th : card.location.en}
                        </p>
                      </div>
                    </div>

                    {/* Text — outfit then pose */}
                    <div className="flex-1 p-4 flex flex-col gap-3">
                      <div>
                        <p className="text-[11px] font-bold text-gray-800 mb-0.5">
                          👗 {lang === 'TH' ? 'คอสตูม' : 'Outfit'}
                        </p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {lang === 'TH' ? card.outfit.th : card.outfit.en}
                        </p>
                      </div>
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-[11px] font-bold text-gray-800 mb-0.5">
                          🤳 {lang === 'TH' ? 'ท่าโพส' : 'Pose'}
                        </p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {lang === 'TH' ? card.pose.th : card.pose.en}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. What NOT to bring */}
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-4">
          <p className="font-bold text-rose-700 text-sm mb-1">
            🚫 {lang === 'TH' ? 'สิ่งที่ไม่ควรเอามา' : "What NOT to bring"}
          </p>
          <p className="text-xs text-gray-500 mb-3">
            {lang === 'TH' ? 'ข้อผิดพลาดที่ทำให้แพ็คของเยอะเกินไป' : 'Common overpacking mistakes'}
          </p>
          <div className="space-y-2">
            {profile.avoid.map((item) => (
              <div key={item.en} className="flex items-start gap-2 border-l-4 border-rose-300 bg-rose-50 rounded-r-xl px-3 py-2">
                <span className="text-rose-400 text-sm leading-none mt-0.5">✕</span>
                <p className="text-xs text-rose-800 leading-relaxed">{t(item)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 6. NZ ONLY — Biosecurity */}
        {profileId === 'NZ' && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-red-300 overflow-hidden">
            <div className="bg-red-600 px-4 py-3">
              <p className="text-white font-bold text-sm flex items-center gap-2">
                🇳🇿 {lang === 'TH' ? 'กฎ Biosecurity นิวซีแลนด์' : 'NZ Biosecurity Rules'}
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                <p className="text-sm font-extrabold text-red-700">
                  ⚠️ {lang === 'TH' ? 'ค่าปรับทันที NZD $400' : 'Instant fine: NZD $400'}
                </p>
                <p className="text-xs text-red-600 mt-1 leading-relaxed">
                  {lang === 'TH'
                    ? 'หากไม่สำแดงสิ่งของต้องห้าม จะถูกปรับทันที $400 NZD ณ ด่านตรวจ — ไม่มีข้อยกเว้น'
                    : 'Failing to declare prohibited items = an instant NZD $400 fine at the border. No exceptions.'}
                </p>
              </div>

              <p className="text-xs font-bold text-red-700 uppercase tracking-wider">
                {lang === 'TH' ? '🚫 ห้ามนำเข้าเด็ดขาด' : '🚫 Strictly prohibited'}
              </p>
              <div className="space-y-2">
                {NZ_BIOSECURITY_PROHIBITED.map((item) => (
                  <div key={item.en} className="border-l-4 border-red-400 bg-red-50 rounded-r-xl px-3 py-2.5">
                    <p className="text-xs text-red-800 leading-relaxed">{t(item)}</p>
                  </div>
                ))}
              </div>

              <div className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-3 py-3">
                <p className="text-xs font-bold text-amber-800 mb-1">
                  ✅ {lang === 'TH' ? 'สำแดงทุกอย่างที่ไม่แน่ใจ' : 'Declare everything you are unsure of'}
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {lang === 'TH'
                    ? 'ถ้าไม่แน่ใจ ให้ติ๊ก "Yes / Declare" เสมอ เจ้าหน้าที่จะเป็นคนตัดสินว่าผ่านได้ไหม การสำแดงไม่มีโทษ แต่การซ่อนมีโทษหนัก'
                    : 'When in doubt, always tick "Yes / Declare". Officers decide what may enter. Declaring is free — hiding is heavily penalised.'}
                </p>
              </div>

              <div className="border-l-4 border-sky-400 bg-sky-50 rounded-r-xl px-3 py-3">
                <p className="text-xs font-bold text-sky-800 mb-1">
                  📝 {lang === 'TH' ? 'อย่าลืมบัตร MPI (Arrival Card)' : "Don't forget your MPI Arrival Card"}
                </p>
                <p className="text-xs text-sky-700 leading-relaxed">
                  {lang === 'TH'
                    ? 'กรอกบัตรขาเข้า MPI (Passenger Arrival Card) ให้ครบทุกช่อง ตอบตามจริง — รับบนเครื่องบินหรือที่ด่านตรวจ'
                    : 'Fill in the MPI Passenger Arrival Card completely and honestly — handed out on the plane or at arrivals.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-4 text-center">
          <p className="text-sm font-bold text-teal-800">
            {lang === 'TH' ? `${SLOGAN} 🌿` : `${SLOGAN_EN} 🌿`}
          </p>
          <p className="text-xs text-teal-600 mt-1 leading-relaxed">
            {lang === 'TH'
              ? 'มีคำถามเรื่องการแพ็คของ? ทักหาพี่แสนได้เลยครับ'
              : 'Questions about packing? Just message Saen anytime.'}
          </p>
        </div>
      </div>
    </div>
  );
}
