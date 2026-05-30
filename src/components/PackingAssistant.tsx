import { useEffect, useMemo, useState } from 'react';

export interface PackingAssistantProps {
  tourCode: string;
  language: 'TH' | 'EN';
  storageKey?: string;
}

interface PackingItem {
  id: string;
  th: string;
  en: string;
  category: 'prohibited' | 'declare' | 'recommended' | 'info';
}

interface WeightItem {
  id: string;
  name: string;
  weight: number;
}

interface LookbookCard {
  id: string;
  locationTH: string;
  locationEN: string;
  outfitTH: string;
  outfitEN: string;
  poseTH: string;
  poseEN: string;
  image: string;
  season: string;
}

const CARRY_ON_PROHIBITED: PackingItem[] = [
  {
    id: 'powerbank',
    th: 'Power Bank — ต้องพกขึ้นเครื่องเท่านั้น ห้ามโหลดใต้เครื่องเด็ดขาด (ไม่เกิน 32,000 mAh)',
    en: 'Power Bank — Carry-on ONLY. Never check in. (Max 32,000 mAh)',
    category: 'prohibited',
  },
  {
    id: 'liquids',
    th: 'ของเหลวเกิน 100ml — รวมไม่เกิน 1,000ml ใส่ถุง Zip Lock ใส 1 ลิตร',
    en: 'Liquids over 100ml — Max 1,000ml total in 1L clear zip lock bag',
    category: 'prohibited',
  },
  {
    id: 'sharp',
    th: 'วัตถุมีคม — กรรไกร มีดพก มีดตัดเล็บ และอาวุธทุกชนิด',
    en: 'Sharp objects — Scissors, pocket knives, nail clippers with blades, all weapons',
    category: 'prohibited',
  },
  {
    id: 'lighter',
    th: 'ไฟแช็ก/ไม้ขีดไฟ — ห้ามโหลดใต้เครื่อง บางสายการบินห้ามพกขึ้นด้วย ตรวจสอบก่อนบิน',
    en: "Lighters/Matches — Prohibited in checked baggage. Check your airline's carry-on rules",
    category: 'prohibited',
  },
  {
    id: 'battery',
    th: 'แบตเตอรี่ลิเธียม 100-160Wh — ต้องขออนุญาตสายการบินก่อนบินทุกครั้ง',
    en: 'Lithium Batteries 100-160Wh — Require airline approval before every flight',
    category: 'prohibited',
  },
];

const NZ_PROHIBITED: PackingItem[] = [
  {
    id: 'nz-food',
    th: '🍎 อาหารสด & ผลไม้ — ผลไม้สด ผักสด เนื้อสัตว์ดิบ ไส้กรอก กุนเชียง หมูแดดเดียว ไข่สด',
    en: '🍎 Fresh Food & Fruits — Fresh fruits, vegetables, raw meat, sausages, pork jerky, fresh eggs',
    category: 'prohibited',
  },
  {
    id: 'nz-plants',
    th: '🌾 พืช เมล็ดพันธุ์ & ดิน — เมล็ดพันธุ์ ต้นไม้ ดินติดรองเท้า (ล้างรองเท้าก่อนบิน!) ขนนก ขนสัตว์ดิบ',
    en: '🌾 Plants, Seeds & Soil — Seeds, live plants, soil on shoes (Clean boots before flying!), feathers, raw wool',
    category: 'prohibited',
  },
  {
    id: 'nz-meds',
    th: '💊 ยา & อาหารเสริม — ยาบางชนิดต้องมีใบสั่งแพทย์ภาษาอังกฤษ, CBD Oil/กัญชา ผิดกฎหมายเด็ดขาด',
    en: '💊 Medicine & Supplements — Some meds need English prescription. CBD Oil/Cannabis strictly illegal',
    category: 'prohibited',
  },
  {
    id: 'nz-animals',
    th: '🐾 ผลิตภัณฑ์จากสัตว์ — อาหารสัตว์เลี้ยง หนังสัตว์ดิบ กระดูกดิบ ผลิตภัณฑ์ยังไม่ผ่านแปรรูป',
    en: '🐾 Animal Products — Pet food, raw skins, bones, unprocessed animal products',
    category: 'prohibited',
  },
];

const NZ_DECLARE: PackingItem[] = [
  {
    id: 'nz-processed',
    th: 'อาหารแปรรูปในบรรจุภัณฑ์ปิดสนิท เช่น บะหมี่กึ่งสำเร็จรูป ขนมถุง',
    en: 'Packaged processed foods e.g. instant noodles, sealed snack bags',
    category: 'declare',
  },
  {
    id: 'nz-rx',
    th: 'ยาประจำตัวพร้อมเอกสารแพทย์ภาษาอังกฤษ',
    en: "Prescription medicines with English doctor's documents",
    category: 'declare',
  },
  {
    id: 'nz-gear',
    th: 'อุปกรณ์เดินป่า/แคมป์ที่เคยใช้งานแล้ว และรองเท้าเดินป่า',
    en: 'Used camping/hiking gear and previously worn hiking boots',
    category: 'declare',
  },
];

const LOOKBOOK_DATA: Record<string, LookbookCard[]> = {
  KIA: [
    {
      id: 'kia-1',
      locationTH: 'สถานีรถไฟร้าง Helensburgh',
      locationEN: 'Helensburgh Old Station',
      outfitTH: 'เสื้อ Vintage ลายตาราง + กางเกงผ้าทีโทน',
      outfitEN: 'Vintage plaid shirt + neutral wide-leg trousers',
      poseTH: 'หันหลังมองในอุโมงค์ แสงลอดผ่าน',
      poseEN: 'Back-to-camera gazing into the tunnel light',
      image: '/images/placeholder-lookbook1.jpg',
      season: '🍂 Autumn/Winter',
    },
    {
      id: 'kia-2',
      locationTH: 'เสาหินบะซอลต์ Bombo Headland',
      locationEN: 'Bombo Headland Quarry',
      outfitTH: 'Windbreaker สีสด + กางเกงยีนส์ทรงกระบอก',
      outfitEN: 'Bright windbreaker + straight-leg jeans',
      poseTH: 'เดินตัดเฟรมหินพร้อมลมพัด ไดนามิก',
      poseEN: 'Dynamic walk pose between basalt columns',
      image: '/images/placeholder-lookbook2.jpg',
      season: '❄️ Winter',
    },
    {
      id: 'kia-3',
      locationTH: 'สะพาน Seacliff Bridge',
      locationEN: 'Seacliff Bridge',
      outfitTH: 'เดรสลายดอกเล็ก + รองเท้า Sneaker ขาว',
      outfitEN: 'Small floral dress + white sneakers',
      poseTH: 'เอนพิงราวสะพาน มองทะเลด้านล่าง',
      poseEN: 'Leaning on railing gazing at ocean below',
      image: '/images/placeholder-lookbook3.jpg',
      season: '🌸 Spring',
    },
  ],
  MEL: [
    {
      id: 'mel-1',
      locationTH: '12 Apostles ยามพระอาทิตย์ตก',
      locationEN: '12 Apostles Sunset',
      outfitTH: 'แจ็กเก็ตสีมัสตาร์ด + กางเกงสีดำ',
      outfitEN: 'Mustard jacket + black trousers',
      poseTH: 'จับขอบหมวก มองออกทะเล แสงทอง',
      poseEN: 'Hold hat brim, gaze to sea in golden light',
      image: '/images/placeholder-lookbook1.jpg',
      season: '🍂 Autumn',
    },
    {
      id: 'mel-2',
      locationTH: 'Pink Lake ทุ่งสีชมพู',
      locationEN: 'Pink Lake',
      outfitTH: 'เดรสสีขาวหรือพาสเทล ล้อสีทะเลสาบ',
      outfitEN: "White or pastel dress echoing the lake's hue",
      poseTH: 'หมุนตัว กระโปรงบาน กลางทะเลสาบสีชมพู',
      poseEN: 'Twirling dress spin with pink lake as backdrop',
      image: '/images/placeholder-lookbook2.jpg',
      season: '🌸 Spring',
    },
    {
      id: 'mel-3',
      locationTH: 'Melbourne Street Art Lanes',
      locationEN: 'Melbourne Street Art',
      outfitTH: 'เสื้อโค้ทสีสด + รองเท้าบูทหนัง',
      outfitEN: 'Bold color coat + leather ankle boots',
      poseTH: 'เดินหันหน้าเข้าตรอก อาร์ตดิบ',
      poseEN: 'Walking toward lane with graffiti walls',
      image: '/images/placeholder-lookbook3.jpg',
      season: '🍂 Autumn',
    },
  ],
  ULU: [
    {
      id: 'ulu-1',
      locationTH: 'Uluru พระอาทิตย์ตก',
      locationEN: 'Uluru Sunset',
      outfitTH: 'เสื้อโบโฮมิเอน สีน้ำตาลดิน + หมวกปีกกว้าง',
      outfitEN: 'Bohemian earth-tone top + wide-brim hat',
      poseTH: 'โปรไฟล์ข้าง มองทะเลทราย แสงส้มแดง',
      poseEN: 'Side profile gazing at desert in warm red light',
      image: '/images/placeholder-lookbook1.jpg',
      season: '☀️ All year',
    },
    {
      id: 'ulu-2',
      locationTH: 'Field of Light 50,000 ดวง',
      locationEN: 'Field of Light',
      outfitTH: 'เดรสสีเข้ม Navy/Burgundy ตัดกับแสงไฟ',
      outfitEN: 'Dark navy or burgundy dress against glowing lights',
      poseTH: 'นั่งกลางแสงไฟ มองขึ้นฟ้าดาว',
      poseEN: 'Sitting among lights gazing up at star-filled sky',
      image: '/images/placeholder-lookbook2.jpg',
      season: '🌙 Night',
    },
    {
      id: 'ulu-3',
      locationTH: 'Kata Tjuta The Olgas',
      locationEN: 'Kata Tjuta Domes',
      outfitTH: 'เสื้อลินิน สีครีม + กางเกงขาบาน',
      outfitEN: 'Cream linen shirt + wide-leg pants',
      poseTH: 'เดินระหว่างโดมหิน แสงย้อน Silhouette',
      poseEN: 'Walking between giant domes — dramatic silhouette',
      image: '/images/placeholder-lookbook3.jpg',
      season: '🌅 Golden hour',
    },
  ],
  NZ: [
    {
      id: 'nz-1',
      locationTH: 'Lake Tekapo ดอกลูพิน',
      locationEN: 'Lake Tekapo Lupins',
      outfitTH: 'เดรสสีม่วงลาเวนเดอร์ ล้อสีดอกลูพิน',
      outfitEN: 'Lavender dress echoing the lupin flowers',
      poseTH: 'นั่งกลางทุ่งลูพิน มองทะเลสาบ',
      poseEN: 'Sitting in lupin field gazing toward the lake',
      image: '/images/placeholder-lookbook1.jpg',
      season: '🌸 Spring',
    },
    {
      id: 'nz-2',
      locationTH: 'Wanaka ต้นไม้กลางน้ำ',
      locationEN: 'Wanaka Lone Tree',
      outfitTH: 'เสื้อโค้ทสีแคมแมล + บูทหนัง',
      outfitEN: 'Camel coat + leather boots',
      poseTH: 'ยืนในน้ำมองต้นไม้โดดเดี่ยว แสงอาทิตย์ขึ้น',
      poseEN: 'Standing in shallow water facing the lone tree at sunrise',
      image: '/images/placeholder-lookbook2.jpg',
      season: '🍂 Autumn',
    },
    {
      id: 'nz-3',
      locationTH: 'Milford Sound หน้าผาน้ำตก',
      locationEN: 'Milford Sound Waterfall',
      outfitTH: 'ชุดกันลม Rain jacket สีสด + หมวก Beanie',
      outfitEN: 'Bright rain jacket + cozy beanie',
      poseTH: 'กางแขนออก รับสายน้ำตกเบื้องหลัง',
      poseEN: 'Arms wide open with waterfall cascading behind',
      image: '/images/placeholder-lookbook3.jpg',
      season: '❄️ Winter',
    },
  ],
  TAS: [
    {
      id: 'tas-1',
      locationTH: 'Mt. Wellington ล่าแสงใต้',
      locationEN: 'Mt. Wellington Aurora Hunt',
      outfitTH: 'โค้ทหนาสีเข้ม + ถุงมือและหมวกไหมพรม',
      outfitEN: 'Dark heavy coat + warm beanie and gloves',
      poseTH: 'ยืนหันหลัง มองแสงออโรร่าบนท้องฟ้า',
      poseEN: 'Back-to-camera silhouette under aurora lights',
      image: '/images/placeholder-lookbook1.jpg',
      season: '❄️ Winter',
    },
    {
      id: 'tas-2',
      locationTH: 'Bruny Island The Neck',
      locationEN: 'Bruny Island The Neck',
      outfitTH: 'เสื้อสีฟ้าครามหรือเขียว ตัดกับทะเล',
      outfitEN: 'Teal or ocean blue top against seascape',
      poseTH: 'เดินบนสันดอนทราย มองสองฝั่งทะเล',
      poseEN: 'Walking the narrow sandbar between two seas',
      image: '/images/placeholder-lookbook2.jpg',
      season: '🌸 All seasons',
    },
    {
      id: 'tas-3',
      locationTH: 'Bridestowe Lavender',
      locationEN: 'Bridestowe Lavender Farm',
      outfitTH: 'เดรสสีขาวหรือลาเวนเดอร์ ล้อทุ่งม่วง',
      outfitEN: 'White or lavender dress among purple fields',
      poseTH: 'นอนตะแคงกลางแถวลาเวนเดอร์',
      poseEN: 'Lying sideways between rows of lavender',
      image: '/images/placeholder-lookbook3.jpg',
      season: '🌸 Summer',
    },
  ],
  CAN: [
    {
      id: 'can-1',
      locationTH: 'ทุ่งดอกคาโนล่า Cowra',
      locationEN: 'Cowra Canola Fields',
      outfitTH: 'เดรสสีขาวหรือ Sage Green ตัดกับเหลืองทอง',
      outfitEN: 'White or sage green dress against golden canola',
      poseTH: 'กางแขน หมุนตัว กลางทุ่งเหลืองทอง',
      poseEN: 'Spinning in canola field arms wide open',
      image: '/images/placeholder-lookbook1.jpg',
      season: '🌸 Spring',
    },
    {
      id: 'can-2',
      locationTH: 'สวนญี่ปุ่น Cowra',
      locationEN: 'Cowra Japanese Garden',
      outfitTH: 'เสื้อสีพาสเทล + กางเกงสีครีม สไตล์ญี่ปุ่น',
      outfitEN: 'Pastel top + cream pants — minimal Japanese style',
      poseTH: 'นั่งริมสะพานสีแดง มองลำธาร',
      poseEN: 'Sitting on red bridge gazing at stream below',
      image: '/images/placeholder-lookbook2.jpg',
      season: '🌸 Spring',
    },
  ],
  SYD: [
    {
      id: 'syd-1',
      locationTH: 'Anna Bay เนินทรายขาว',
      locationEN: 'Anna Bay Sand Dunes',
      outfitTH: 'เดรสหรือเสื้อสีขาว ล้อทรายสีครีม',
      outfitEN: 'White or cream dress echoing the pale dunes',
      poseTH: 'วิ่งลงเนินทราย กระโปรงบาน',
      poseEN: 'Running down dune with flowing skirt',
      image: '/images/placeholder-lookbook1.jpg',
      season: '☀️ Summer',
    },
    {
      id: 'syd-2',
      locationTH: 'Long Jetty ท่าเรือไม้ยาว',
      locationEN: 'Long Jetty Pier',
      outfitTH: 'เสื้อแถบแนวนอนสีน้ำเงิน/ขาว ธีม Nautical',
      outfitEN: 'Navy/white nautical stripes top',
      poseTH: 'เดินบนท่าเรือ มองออกทะเล ไม่หันหน้า',
      poseEN: 'Walking jetty toward sea — back to camera',
      image: '/images/placeholder-lookbook2.jpg',
      season: '🌸 All seasons',
    },
  ],
};

function getLookbookCards(tourCode: string): LookbookCard[] {
  const code = tourCode.toUpperCase();
  for (const key of Object.keys(LOOKBOOK_DATA)) {
    if (code.includes(key)) return LOOKBOOK_DATA[key]!;
  }
  return LOOKBOOK_DATA.SYD!;
}

function getPackingItems(tourCode: string): PackingItem[] {
  const code = tourCode.toUpperCase();
  const items: PackingItem[] = [
    {
      id: 'camera',
      th: 'กล้อง + เลนส์ + ฟิลเตอร์ ND/CPL + การ์ดความจำสำรองเผื่อเยอะ ๆ',
      en: 'Camera + lenses + ND/CPL filters + extra memory cards',
      category: 'recommended',
    },
    {
      id: 'chargers',
      th: 'สายชาร์จกล้อง + มือถือ + รางปลั๊กพกพา (แชร์ชาร์จใน Dorm ได้สะดวก)',
      en: 'Camera + phone charger + portable power strip (great for dorm sharing)',
      category: 'recommended',
    },
    {
      id: 'toiletries',
      th: 'ผ้าขนหนูเล็ก + แปรงสีฟัน + แชมพู/สบู่พกพา',
      en: 'Small towel + toothbrush + travel-size shampoo/soap',
      category: 'recommended',
    },
    {
      id: 'passport',
      th: 'หนังสือเดินทาง — ตรวจสอบอายุเหลือ 6 เดือน+',
      en: 'Passport — verify at least 6 months remaining validity',
      category: 'info',
    },
    {
      id: 'insurance',
      th: 'เอกสารประกันเดินทาง',
      en: 'Travel insurance documents',
      category: 'info',
    },
    {
      id: 'booking',
      th: 'สำเนาใบจองทริป + เอกสารสำคัญ',
      en: 'Booking confirmation printout + important documents',
      category: 'info',
    },
  ];

  if (code.includes('TAS') || code.includes('NZ') || code === 'KIA-1DAY') {
    items.push(
      {
        id: 'heattech',
        th: 'เสื้อฮีทเทค Ultra Warm + โค้ทกันลม/ขนเป็ด (Mt.Wellington & Cradle Mountain หนาวจัดช่วงค่ำ!)',
        en: 'Ultra Warm Heattech + windproof/down jacket (Mt.Wellington & Cradle are freezing at night!)',
        category: 'recommended',
      },
      {
        id: 'beanie',
        th: 'หมวกไหมพรม + ถุงมือเปิดปลายนิ้ว (กดกล้อง/มือถือสะดวกหน้างาน)',
        en: 'Beanie + fingerless gloves (essential for camera & phone operation)',
        category: 'recommended',
      },
      {
        id: 'hotpacks',
        th: 'ถุงทรายร้อน (Hot Packs) ห่อแบตกล้องสำรอง — ความหนาวทำแบตหมดเร็วเท่าตัว!',
        en: 'Hand warmers to wrap spare camera batteries — cold drains them 2x faster!',
        category: 'recommended',
      },
      {
        id: 'boots',
        th: 'รองเท้าหุ้มส้นดอกยางลึกกันลื่น สำหรับเดินเลาะเสาหินและเทรลธรรมชาติ',
        en: 'Ankle-support non-slip boots for rocky terrain and nature trails',
        category: 'recommended',
      }
    );
  }

  if (code.includes('ULU')) {
    items.push(
      {
        id: 'flynet',
        th: '🪲 หมวกตาข่ายกันแมลง (Fly Net) — ไอเทมลับที่ต้องมี! แมลงวัน Outback เยอะมากช่วงกลางวัน',
        en: '🪲 Fly net hat — SECRET WEAPON! Outback flies are relentless during the day',
        category: 'recommended',
      },
      {
        id: 'layers',
        th: 'เสื้อโปร่งระบายอากาศกลางวัน + เสื้อหนาวสำหรับกลางคืน (ทะเลทรายหนาวจัดตอนดึก)',
        en: 'Breathable clothing for daytime + heavy jacket for nights (desert gets freezing after dark)',
        category: 'recommended',
      },
      {
        id: 'uvfilter',
        th: 'UV Filter ป้องกันฝุ่นแดง Outback ขูดหน้าเลนส์ + ผ้าคลุมกล้อง',
        en: 'UV filter to protect lens from red Outback dust + camera cover cloth',
        category: 'recommended',
      },
      {
        id: 'sun',
        th: 'ครีมกันแดด SPF50+, หมวกปีกกว้าง, แว่นกันแดด, ลิปบาล์ม',
        en: 'SPF50+ sunscreen, wide-brim hat, sunglasses, lip balm',
        category: 'recommended',
      }
    );
  }

  if (code.includes('MEL') || code.includes('CAN') || code.includes('SYD')) {
    items.push(
      {
        id: 'outfits',
        th: 'เสื้อผ้าสีตัดกับฉากหลัง — ขาว เดรสลายดอก พาสเทล สำหรับทุ่งคาโนล่าและ Great Ocean Road',
        en: 'Color-contrast outfits — white, floral, pastels for canola fields & Great Ocean Road',
        category: 'recommended',
      },
      {
        id: 'slipon',
        th: 'รองเท้า Slip-on น้ำหนักเบา (บางพิกัดต้องถอดรองเท้า เช่น Pink Lake และ Anna Bay)',
        en: 'Lightweight slip-on shoes (some spots need barefoot walking e.g. Pink Lake, Anna Bay)',
        category: 'recommended',
      },
      {
        id: 'daypack',
        th: 'กระเป๋าเป้เล็ก — พกเครื่องสำอางเติมหน้า ทิชชู่เปียก และพร็อพถ่ายรูป (แว่น หมวกเบเร่ต์)',
        en: 'Small daypack — touch-up makeup, wet wipes, and photo props (sunglasses, beret)',
        category: 'recommended',
      }
    );
  }

  return items;
}

function WeightTracker({
  labelTH,
  labelEN,
  limit,
  lang,
  warnThreshold,
}: {
  labelTH: string;
  labelEN: string;
  limit: number;
  lang: 'TH' | 'EN';
  warnThreshold: number;
}) {
  const [items, setItems] = useState<WeightItem[]>([]);
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');

  const total = items.reduce((s, i) => s + i.weight, 0);
  const pct = Math.min((total / limit) * 100, 100);
  const over = total > limit;
  const warn = total > warnThreshold && !over;

  const addItem = () => {
    const w = parseFloat(weight);
    if (!name.trim() || Number.isNaN(w) || w <= 0) return;
    setItems([...items, { id: Date.now().toString(), name: name.trim(), weight: w }]);
    setName('');
    setWeight('');
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-4 mb-3">
      <div className="flex justify-between items-center mb-3">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{lang === 'TH' ? labelTH : labelEN}</p>
          <p className="text-xs text-gray-500">Limit: {limit} kg</p>
        </div>
        <span
          className={`text-sm font-bold px-3 py-1 rounded-full ${
            over ? 'bg-red-100 text-red-600' : warn ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {total.toFixed(1)} / {limit} kg
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            over ? 'bg-red-500' : warn ? 'bg-yellow-400' : 'bg-green-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {over && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
          <p className="text-xs text-red-700 font-semibold">
            {lang === 'TH'
              ? '🚨 น้ำหนักเกิน! กรุณาแบ่งของออกหรือเฉลี่ยกับเพื่อนร่วมทริป'
              : '🚨 Overweight! Please remove items or share weight with your group.'}
          </p>
          <p className="text-xs text-red-600 mt-1">
            {lang === 'TH' ? 'ℹ️ ค่าปรับโดยทั่วไป $15-30 AUD / kg' : 'ℹ️ Standard airline fee is $15-30 AUD / kg'}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200"
          placeholder={lang === 'TH' ? 'ชื่อสิ่งของ' : 'Item name'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <input
          className="w-20 text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white outline-none focus:border-teal-400 text-center"
          placeholder="kg"
          type="number"
          step="0.1"
          min="0"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <button
          type="button"
          onClick={addItem}
          className="bg-teal-500 hover:bg-teal-600 text-white text-lg px-4 py-2.5 rounded-xl font-bold active:scale-95 transition-all"
        >
          +
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center text-xs bg-white rounded-xl px-3 py-2 border border-gray-100"
            >
              <span className="text-gray-700">{item.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-800">{item.weight} kg</span>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((i) => i.id !== item.id))}
                  className="text-red-400 hover:text-red-600 text-base leading-none w-5 h-5 flex items-center justify-center"
                  aria-label={lang === 'TH' ? 'ลบ' : 'Remove'}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PackingAssistant({
  tourCode,
  language: initialLang,
  storageKey,
}: PackingAssistantProps) {
  const [lang, setLang] = useState<'TH' | 'EN'>(initialLang);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState({
    weight: true,
    carryon: false,
    nz: true,
    packing: true,
    lookbook: true,
  });

  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(`t2t_packing_checked_${storageKey}`);
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(`t2t_packing_checked_${storageKey}`, JSON.stringify(checked));
  }, [checked, storageKey]);

  const isNZ = tourCode.toUpperCase().includes('NZ');
  const packingList = useMemo(() => getPackingItems(tourCode), [tourCode]);
  const lookbookCards = useMemo(() => getLookbookCards(tourCode), [tourCode]);

  const totalItems = packingList.length;
  const packedItems = packingList.filter((i) => checked[i.id]).length;
  const allPacked = packedItems === totalItems && totalItems > 0;

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  };

  const borderLeft: Record<string, string> = {
    prohibited: 'border-l-4 border-red-400',
    declare: 'border-l-4 border-yellow-400',
    recommended: 'border-l-4 border-green-500',
    info: 'border-l-4 border-blue-400',
  };

  const bgColor: Record<string, string> = {
    prohibited: 'bg-red-50',
    declare: 'bg-yellow-50',
    recommended: 'bg-green-50',
    info: 'bg-blue-50',
  };

  const textColor: Record<string, string> = {
    prohibited: 'text-red-800',
    declare: 'text-yellow-800',
    recommended: 'text-green-800',
    info: 'text-blue-800',
  };

  const SectionHeader = ({
    sectionKey,
    icon,
    titleTH,
    titleEN,
    badge,
  }: {
    sectionKey: keyof typeof openSections;
    icon: string;
    titleTH: string;
    titleEN: string;
    badge?: string;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex justify-between items-center py-3.5 text-left"
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="font-semibold text-gray-800 text-sm">{lang === 'TH' ? titleTH : titleEN}</span>
        {badge && (
          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">{badge}</span>
        )}
      </div>
      <span
        className={`text-gray-400 transition-transform duration-200 ${openSections[sectionKey] ? 'rotate-180' : ''}`}
      >
        ▾
      </span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="bg-white px-4 pt-5 pb-3 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-bold text-gray-900 text-xl">
              {lang === 'TH' ? '🧳 แพ็กกระเป๋า' : '🧳 Packing Assistant'}
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

        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-teal-500 transition-all duration-700"
              style={{ width: `${totalItems > 0 ? (packedItems / totalItems) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
            {packedItems}/{totalItems} {lang === 'TH' ? 'รายการ' : 'items'}
          </span>
        </div>

        {allPacked && (
          <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-center">
            <p className="text-green-700 text-sm font-bold">
              {lang === 'TH' ? '✅ พร้อมเดินทางแล้ว!' : "✅ You're all packed and ready!"}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 divide-y divide-gray-50">
            <SectionHeader sectionKey="weight" icon="⚖️" titleTH="คำนวณน้ำหนักกระเป๋า" titleEN="Baggage Weight Tracker" />
          </div>
          {openSections.weight && (
            <div className="px-4 pb-4">
              <WeightTracker labelTH="กระเป๋าโหลดใต้เครื่อง" labelEN="Checked Baggage" limit={20} lang={lang} warnThreshold={15} />
              <WeightTracker labelTH="กระเป๋าถือขึ้นเครื่อง" labelEN="Carry-on Baggage" limit={7} lang={lang} warnThreshold={5.5} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4">
            <SectionHeader
              sectionKey="carryon"
              icon="✈️"
              titleTH="สิ่งต้องห้ามนำขึ้นเครื่อง"
              titleEN="Carry-on Prohibited Items"
              badge={lang === 'TH' ? 'ทุกเที่ยวบิน' : 'All flights'}
            />
          </div>
          {openSections.carryon && (
            <div className="px-4 pb-4 space-y-2">
              {CARRY_ON_PROHIBITED.map((item) => (
                <div
                  key={item.id}
                  className={`${borderLeft[item.category]} ${bgColor[item.category]} rounded-r-xl px-3 py-2.5`}
                >
                  <p className={`text-xs leading-relaxed ${textColor[item.category]}`}>
                    ❌ {lang === 'TH' ? item.th : item.en}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {isNZ && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
            <div className="px-4 bg-red-50">
              <SectionHeader
                sectionKey="nz"
                icon="🇳🇿"
                titleTH="กฎด่านตรวจนิวซีแลนด์"
                titleEN="NZ Biosecurity Rules"
                badge="NZ Only"
              />
            </div>
            {openSections.nz && (
              <div className="px-4 pb-4 pt-3 space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                  <p className="text-xs font-bold text-red-700">
                    ⚠️{' '}
                    {lang === 'TH'
                      ? 'ค่าปรับสูงสุด NZD $400 ทันที ณ ด่านตรวจ หากไม่ได้สำแดงสิ่งของต้องห้าม'
                      : 'Instant fine up to NZD $400 for failing to declare prohibited items.'}
                  </p>
                </div>

                <p className="text-xs font-bold text-red-700 uppercase tracking-wider">
                  {lang === 'TH' ? '🚫 ห้ามนำเข้าเด็ดขาด' : '🚫 Strictly Prohibited'}
                </p>
                <div className="space-y-2">
                  {NZ_PROHIBITED.map((item) => (
                    <div key={item.id} className="border-l-4 border-red-400 bg-red-50 rounded-r-xl px-3 py-2.5">
                      <p className="text-xs text-red-800 leading-relaxed">{lang === 'TH' ? item.th : item.en}</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider pt-1">
                  {lang === 'TH' ? '⚠️ ต้องแจ้งเจ้าหน้าที่' : '⚠️ Must Declare'}
                </p>
                <div className="space-y-2">
                  {NZ_DECLARE.map((item) => (
                    <div key={item.id} className="border-l-4 border-yellow-400 bg-yellow-50 rounded-r-xl px-3 py-2.5">
                      <p className="text-xs text-yellow-800 leading-relaxed">{lang === 'TH' ? item.th : item.en}</p>
                    </div>
                  ))}
                </div>

                <div className="border-l-4 border-green-500 bg-green-50 rounded-r-xl px-4 py-3">
                  <p className="text-xs font-bold text-green-800 mb-1">
                    💡 {lang === 'TH' ? 'แนะนำจากพี่แสน' : "P'Saen's Tip"}
                  </p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    {lang === 'TH'
                      ? 'ให้ติ๊กช่อง แจ้ง (Declare) ในใบ ตม. ทุกสิ่งที่ไม่แน่ใจ ดีกว่าโดนปรับครับ เจ้าหน้าที่จะตัดสินใจเองว่าให้ผ่านหรือไม่ การซ่อนของมีโทษหนักและเสียเวลามาก'
                      : 'When in doubt, Declare it on your arrival card! Officers decide if items can enter. Hiding prohibited items results in heavy fines and long delays.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4">
            <SectionHeader
              sectionKey="packing"
              icon="📋"
              titleTH="รายการแพ็กของ"
              titleEN="Packing List"
              badge={`${packedItems}/${totalItems}`}
            />
          </div>
          {openSections.packing && (
            <div className="px-4 pb-4 space-y-2">
              {packingList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left active:scale-[0.98] transition-all duration-150 ${
                    checked[item.id]
                      ? 'bg-gray-50 border-gray-100'
                      : `${borderLeft[item.category]} bg-white border-gray-100`
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all duration-200 ${
                      checked[item.id] ? 'border-teal-500 bg-teal-500' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {checked[item.id] && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <p
                    className={`text-xs leading-relaxed transition-all ${
                      checked[item.id] ? 'line-through text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {lang === 'TH' ? item.th : item.en}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4">
            <SectionHeader sectionKey="lookbook" icon="📸" titleTH="ไอเดียแต่งตัว & ท่าโพส" titleEN="Outfit & Pose Ideas" />
          </div>
          {openSections.lookbook && (
            <div className="pb-4">
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
                {lookbookCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex-shrink-0 w-56 rounded-2xl overflow-hidden border border-gray-100 shadow-sm snap-start"
                  >
                    <div
                      className="h-36 bg-gradient-to-br from-gray-200 to-gray-300 relative bg-cover bg-center"
                      style={{ backgroundImage: `url(${card.image})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3">
                        <span className="text-white text-xs font-bold leading-tight block">
                          {lang === 'TH' ? card.locationTH : card.locationEN}
                        </span>
                        <span className="text-white/80 text-xs">{card.season}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white">
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-gray-700 mb-0.5">
                          👗 {lang === 'TH' ? 'คอสตูม' : 'Outfit'}
                        </p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {lang === 'TH' ? card.outfitTH : card.outfitEN}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-0.5">
                          🤳 {lang === 'TH' ? 'ท่าโพส' : 'Pose'}
                        </p>
                        <p className="text-xs text-gray-600 leading-relaxed">{lang === 'TH' ? card.poseTH : card.poseEN}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-800 mb-1">
            👗 {lang === 'TH' ? 'คอสตูมยังไม่พร้อม?' : 'Not sure what to wear?'}
          </p>
          <p className="text-xs text-amber-700 mb-3 leading-relaxed">
            {lang === 'TH'
              ? 'ดูคู่มือโทนสีแต่งตัวและแต่งหน้าตามฤดูกาลของออสเตรเลีย'
              : 'Check our Australia season style & makeup colour guide'}
          </p>
          <a
            href="/trips"
            className="inline-block text-xs bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-full font-semibold active:scale-95 transition-all"
          >
            {lang === 'TH' ? 'ดูคู่มือตามฤดูกาล →' : 'View Season Style Guide →'}
          </a>
        </div>
      </div>
    </div>
  );
}
