import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type SpotDraft = {
  name: string;
  proTip: string;
  mapsUrl: string;
  photoUrl: string;
  portraitGuide: string;
  landscapeGuide: string;
};

type TripDraft = {
  tourCode: string;
  tourName: string;
  countryTag: string;
  city: string;
  weather: string;
  messengerUrl: string;
  coverUrl: string;
  durationDays: number;
  departureStart: string;
  departureEnd: string;
  slotsBooked: string;
  slotsMax: string;
  priceStandardAud: string;
  pricePrivateAud: string;
  categoryCode: string;
  categoryName: string;
  basePriceAud: string;
  depositAud: string;
  dormitoryPolicy: string;
  dormUpgradeNote: string;
  itinerary: Array<{ morning: string; afternoon: string; evening: string; night: string }>;
  spots: SpotDraft[];
};

type BookingDraft = {
  bookingId: string;
  customerName: string;
  tourCode: string;
};

const MAX_SPOTS = 4;
const BUCKET = 'portfolio';

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function uploadImageAndGetUrl(file: File, pathPrefix: string): Promise<string> {
  const key = `cms/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw error;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(key);
  if (!urlData?.publicUrl) throw new Error('Could not generate image URL');
  return urlData.publicUrl;
}

function UploadCard({
  label,
  valueUrl,
  disabled,
  onUploaded,
  pathPrefix,
}: {
  label: string;
  valueUrl: string;
  disabled?: boolean;
  onUploaded: (url: string) => void;
  pathPrefix: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadImageAndGetUrl(file, pathPrefix);
      onUploaded(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cyber-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-200">{label}</p>
        {busy && <span className="text-xs text-amber-400 font-mono">UPLOADING…</span>}
      </div>

      <label
        className={cn(
          'block rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-5 cursor-pointer transition',
          'hover:border-[color:var(--gold-border)] hover:shadow-[0_0_16px_var(--gold-glow)]',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-neutral-100">Drop / tap to upload</p>
            <p className="text-xs text-neutral-500 mt-1">PNG / JPG / WEBP · mobile friendly</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300">
            ⬆
          </div>
        </div>
      </label>

      {valueUrl ? (
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20">
          <img src={valueUrl} alt="" className="w-full h-44 object-cover" />
          <div className="px-3 py-2 border-t border-white/10">
            <p className="text-[11px] font-mono text-neutral-500 truncate">{valueUrl}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-neutral-500 font-mono">No image uploaded yet.</p>
      )}

      {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
    </div>
  );
}

async function postToAppsScript(payload: unknown): Promise<void> {
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

export default function InternalCmsDashboard() {
  const [trip, setTrip] = useState<TripDraft>(() => ({
    tourCode: '',
    tourName: '',
    countryTag: '',
    city: '',
    weather: '',
    messengerUrl: '',
    coverUrl: '',
    durationDays: 1,
    departureStart: '',
    departureEnd: '',
    slotsBooked: '',
    slotsMax: '',
    priceStandardAud: '1550',
    pricePrivateAud: '2300',
    categoryCode: '',
    categoryName: '',
    basePriceAud: '',
    depositAud: '',
    dormitoryPolicy: '',
    dormUpgradeNote: 'Upgrade to a private room: +$350–$550 AUD (subject to availability).',
    itinerary: Array.from({ length: 4 }).map(() => ({ morning: '', afternoon: '', evening: '', night: '' })),
    spots: Array.from({ length: 2 }).map(() => ({
      name: '',
      proTip: '',
      mapsUrl: '',
      photoUrl: '',
      portraitGuide: '',
      landscapeGuide: '',
    })),
  }));

  const [booking, setBooking] = useState<BookingDraft>(() => ({
    bookingId: '',
    customerName: '',
    tourCode: '',
  }));

  const [tourCodes, setTourCodes] = useState<string[]>([]);
  const [syncing, setSyncing] = useState<'none' | 'trip' | 'booking'>('none');
  const [syncOk, setSyncOk] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const canAddSpot = trip.spots.length < MAX_SPOTS;
  const canRemoveSpot = trip.spots.length > 1;

  const loadTourCodes = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('tours').select('trip_code').order('trip_code');
      if (error) return;
      const fromDb = (data ?? [])
        .map((r) => (r as { trip_code?: string | null }).trip_code)
        .filter((x): x is string => Boolean(x));
      setTourCodes(fromDb);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadTourCodes();
  }, [loadTourCodes]);

  const computedTourCodes = useMemo(() => {
    const local = trip.tourCode.trim() ? [trip.tourCode.trim()] : [];
    return Array.from(new Set([...tourCodes, ...local])).sort();
  }, [tourCodes, trip.tourCode]);

  const tripPathPrefix = useMemo(() => {
    const code = trip.tourCode.trim() || 'untitled-trip';
    return `cms/trips/${slugify(code) || code}`;
  }, [trip.tourCode]);

  const prefillMel4d3n = () => {
    setTrip((p) => ({
      ...p,
      tourCode: 'MEL-4D3N',
      tourName: 'ทริปถ่ายภาพ 4 วัน 3 คืน: จากซิดนีย์สู่เมลเบิร์น (Victoria Photo Trip)',
      countryTag: 'AU · Melbourne (Victoria)',
      city: 'Melbourne',
      durationDays: 4,
      priceStandardAud: '1550',
      pricePrivateAud: '2300',
      dormitoryPolicy:
        'สไตล์ที่พัก: Hostel / Backpackers / Motel (เน้นสะอาด ปลอดภัย และมีสิ่งอำนวยความสะดวกพื้นฐาน)\nรูปแบบการพัก: Dormitory (ห้องรวม) เพื่อให้ทุกคนได้พูดคุยและแลกเปลี่ยนประสบการณ์กัน\nหมายเหตุ: แผนอาจปรับหน้างานตามสภาพอากาศ/ทัศนวิสัย เพื่อความปลอดภัยและภาพที่ดีที่สุด',
      dormUpgradeNote:
        'อัปเกรดเป็นห้องส่วนตัว: +$350–$550 AUD ต่อคืน (กรุณาแจ้งก่อนวันออกเดินทางเพื่อจัดการให้ทัน)',
      itinerary: [
        {
          morning: 'ออกเดินทางจากสนามบินซิดนีย์ (SYD) → เมลเบิร์น (MEL)',
          afternoon:
            'รับรถที่เมลเบิร์น แล้วเดินทางสู่ The Twelve Apostles ผ่าน Freeway (เตรียมกล้องเก็บวิวระหว่างทาง)',
          evening:
            'เช็กอิน/ถึงที่พักใกล้ The Twelve Apostles แล้วออกไปสำรวจมุมถ่าย Golden Hour',
          night:
            'หลังอาหารเย็น เตรียมถ่าย Milky Way (ทีมงานสำรวจหลายจุดไว้แล้ว) · พัก The Twelve Apostles (คืนที่ 1)',
        },
        {
          morning: 'ตื่นเช้าเก็บ Blue Hour ที่ The Twelve Apostles',
          afternoon:
            'เช็กเอาต์ แล้วเดินทางสู่ Pink Lake · เข้าที่พักใกล้ Pink Lake พักผ่อนตามอัธยาศัย',
          evening: 'ออกไปถ่ายแสงเย็นบริเวณ Pink Lake',
          night:
            'ถ้าท้องฟ้าเปิด ถ่าย Milky Way + เงาสะท้อนบนผิวน้ำสีชมพู · พัก Pink Lake (คืนที่ 2)',
        },
        {
          morning: 'เดินทางจาก Pink Lake → เข้าสู่ใจกลางเมืองเมลเบิร์น',
          afternoon:
            'เช็กอินที่พักในเมือง แล้วลุย Street Art / State Library Victoria / Princes Bridge / Flinders Street Station',
          evening: 'กลับที่พัก พักผ่อนตามอัธยาศัย',
          night: 'อิสระ/พัก · พัก Melbourne City (คืนที่ 3)',
        },
        {
          morning:
            'ตื่นเช้าเก็บภาพเมลเบิร์นช่วงเช้าตรู่ (แสงสวย เมืองเงียบ เหมาะกับสถาปัตยกรรม/ชีวิตเมือง)',
          afternoon: 'เดินทางไปสนามบินเมลเบิร์น (MEL) คืนรถ และบินกลับซิดนีย์ (SYD)',
          evening: '',
          night: '',
        },
      ],
      spots: [
        {
          name: 'Great Ocean Road & The Twelve Apostles',
          proTip:
            'คัดสรรเพื่อ Golden Hour, Blue Hour และเทคนิค Milky Way เหนือโขดหินกลางทะเล',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'แนะนำเสื้อผ้าโทนขาว/ครีม/แดง เพื่อคอนทราสต์กับหินปูนและท้องฟ้า · ใช้ 35–85mm เก็บอารมณ์ + ระยะห่างคนกับฉากหลัง',
          landscapeGuide:
            'Golden Hour: วางเส้นขอบฟ้า 1/3 · ใช้ ultra-wide 16–24mm · Blue Hour: long exposure + tripod · Night: Milky Way (wide fast lens) + foreground rocks',
        },
        {
          name: 'Pink Lake (ทะเลสาบสีชมพู)',
          proTip:
            'ถ้าท้องฟ้าเปิด ช่วงค่ำมีมุมถ่ายดาว/ทางช้างเผือก และเงาสะท้อนจากผิวน้ำสีชมพู',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'โทนเสื้อผ้าขาว/พาสเทลช่วยดึงสีชมพู · ถ่าย silhouette ตอนเย็น + rim light · เก็บ reflection ถ้า water level เหมาะ',
          landscapeGuide:
            'ใช้ polarizer ลด glare · มุมกว้างเก็บลวดลายพื้น/น้ำ · ถ้ามีทุ่งคาโนลา: จัด layering foreground yellow + mid pink + sky',
        },
        {
          name: 'Melbourne City (Street Art / Architecture)',
          proTip:
            'เจาะตรอกซอยสตรีทอาร์ต บาร์ลับ คาเฟ่ · เก็บคลาสสิก State Library / โบสถ์ / Flinders Street Station',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'แนะนำ 35–50mm สำหรับ street portraits · ใช้ผนังกราฟฟิตี้เป็นฉากหลัง · pose แบบเดิน/หัวเราะ/มองกลับ สร้าง mood editorial',
          landscapeGuide:
            'สถาปัตย์: ใช้เส้นนำสายตา + symmetry · ถ่าย early morning ลดคน · Flinders/Princes Bridge: blue hour + traffic trails (tripod)',
        },
      ],
    }));
  };

  const prefillUlu4d3n = () => {
    setTrip((p) => ({
      ...p,
      tourCode: 'ULU-4D3N',
      tourName: 'ทริปถ่ายภาพ 4 วัน 3 คืน: ดินแดน Outback อุลูรู (Uluru-Kata Tjuta Photo Trip)',
      countryTag: 'AU · Uluru (NT)',
      // Weather: Open-Meteo geocoding works better with the town name near the park.
      city: 'Yulara',
      durationDays: 4,
      priceStandardAud: '1690',
      pricePrivateAud: '',
      dormitoryPolicy:
        'สไตล์ที่พัก: Outback Lodge (ชิค คลีน เน้นสะอาด ปลอดภัย และสิ่งอำนวยความสะดวกพื้นฐานครบ)\nรูปแบบการพัก: Dormitory (ห้องรวม) เพื่อให้ทุกคนได้พูดคุยและแลกเปลี่ยนประสบการณ์กัน\nหมายเหตุ: โปรแกรมอาจปรับตามสภาพอากาศ/ทัศนวิสัย เพื่อภาพที่ดีที่สุดและความปลอดภัย',
      dormUpgradeNote:
        'อัปเกรดเป็นห้องส่วนตัว (Private Room): +$350–$550 AUD ต่อคืน (กรุณาแจ้งล่วงหน้าก่อนวันออกทริป)',
      itinerary: [
        {
          morning: 'นัดรวมตัวที่สนามบินในประเทศซิดนีย์ → บินตรงสู่ Ayers Rock (Connellan Airport)',
          afternoon:
            'ถึงอุลูรู รับกระเป๋า ขึ้นรถตู้ทีมงาน แวะซื้อของใช้/น้ำดื่ม แล้วเช็กอิน Outback Lodge',
          evening:
            'ไป Uluru Car Sunset Viewing Area ถ่ายภาพหินเปลี่ยนสีช่วงพระอาทิตย์ตก',
          night:
            'มื้อเย็น + พักผ่อน · (option) ออกไปถ่าย Milky Way ใกล้ที่พัก (ท้องฟ้ามืด เห็นดาวชัด) · พัก Outback Lodge (คืนที่ 1)',
        },
        {
          morning:
            '05:15 ออกเดินทางไป Field of Light Uluru (บัสพิเศษ) ชมทุ่งแสงไฟก่อนพระอาทิตย์ขึ้น + จิบกาแฟ',
          afternoon:
            'กลับที่พักอาบน้ำแต่งตัว แล้วเดินทางสู่ Kata Tjuta (Mount Olga) ซื้ออาหารกลางวันพกไป · เดินสำรวจ/ถ่ายภาพเส้นทางธรรมชาติ',
          evening:
            'ชมพระอาทิตย์ตกมุม Kata Tjuta (เตรียมเสื้อกันหนาว/กางเกงขายาว) แล้วกลับที่พักประมาณ 20:00',
          night: 'พัก Outback Lodge (คืนที่ 2)',
        },
        {
          morning:
            'ตื่นก่อนพระอาทิตย์ขึ้น ~40 นาที ไป Uluru Sunrise Viewing Area (หรือเลือกพัก/หาอาหารที่ shopping centre)',
          afternoon:
            'ทานเช้า แล้วเดินสำรวจ/ถ่ายภาพรอบฐานหิน Uluru แบบใกล้ชิดทั้งวัน (หามุมสร้างสรรค์ได้เต็มที่)',
          evening: 'กลับที่พัก เปลี่ยนเสื้อผ้า ทานมื้อเย็น',
          night:
            'ออกลุยถ่าย Milky Way คู่กับแลนด์สเคปทะเลทรายต่อยาว ๆ แล้วกลับเข้าที่พัก · พัก Outback Lodge (คืนที่ 3)',
        },
        {
          morning:
            'เก็บภาพครั้งสุดท้าย: Kata Tjuta dune sunrise + แวะ Camel Express Uluru (ปางอูฐทะเลทราย)',
          afternoon: 'กลับมาเก็บสัมภาระ เช็กเอาต์ แล้วไปสนามบิน Ayers Rock บินกลับซิดนีย์ (SYD)',
          evening: '',
          night: '',
        },
      ],
      spots: [
        {
          name: 'Uluru (หินอุลูรู)',
          proTip:
            'ห้ามพลาด Sunrise/ Sunset ที่ Uluru Viewing Areas และจุดถ่าย Milky Way (เห็นดาวด้วยตาเปล่าชัดมาก)',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'แนะนำโทนขาว/ครีม/เอิร์ธโทนให้เข้ากับ desert · ใช้ 35–85mm เก็บ mood + texture ของหิน · ถ่าย silhouette ตอนพระอาทิตย์ต่ำ',
          landscapeGuide:
            'Sunrise/Sunset: tele + wide สลับเพื่อเก็บ scale · ใช้ CPL ลด haze · Night: wide fast lens + tripod (foreground sand/rock ให้มีมิติ)',
        },
        {
          name: 'Field of Light (ทุ่งแสงไฟแห่งอุลูรู)',
          proTip:
            'สวยที่สุดก่อนพระอาทิตย์ขึ้น (twilight) มีเวลาเดินหามุมถ่ายคู่กับทุ่งแสงไฟแบบเต็มอิ่ม',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'ใช้ 24–35mm เก็บคน+แสงไฟเป็นฉากหลัง · ถ่าย motion blur เดินผ่านแสง (shutter 1/10–1/30) · ระวัง noise ใช้ ISO พอดี',
          landscapeGuide:
            'twilight: long exposure เก็บ gradient sky + light patterns · ลองมุมต่ำให้หลอดไฟเป็น leading lines · white balance ให้โทน editorial',
        },
        {
          name: 'Kata Tjuta (The Olgas)',
          proTip:
            'เหมาะกับสายแลนด์สเคปมาก มีมิติ/เส้นสายของหุบเขา แนะนำเดินสำรวจหามุมย้อนแสงตามเส้นทางธรรมชาติ',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'portrait กับภูเขาโดม: ใช้เลนส์ 50–85mm compress ฉากหลัง · pose แบบเดิน/หยุดมองวิวให้ดูธรรมชาติ',
          landscapeGuide:
            'เล่นเส้นนำสายตาของ valley + rim light · ถ่าย backlit ให้เกิด layers · ช่วงเย็นอากาศเย็นลงเร็ว เตรียมเสื้อผ้า/กันลม',
        },
      ],
    }));
  };

  const prefillTas3d2n = () => {
    setTrip((p) => ({
      ...p,
      tourCode: 'TAS-3D2N',
      tourName:
        'ทริปพร้อมช่างภาพ สัมผัสประวัติศาสตร์ ศิลปะ และตามล่าแสงใต้เมือง Hobart (Tasmania Mini Aurora Hunt)',
      countryTag: 'AU · Hobart (Tasmania)',
      city: 'Hobart',
      durationDays: 3,
      priceStandardAud: '1350',
      pricePrivateAud: '1600',
      dormitoryPolicy:
        'สไตล์ที่พัก: เน้น Backpacker & Budget Trip (Hostel / Backpackers / Motel) สะอาด ปลอดภัย สิ่งอำนวยความสะดวกพื้นฐานครบถ้วน (บางกลุ่มอาจปรับเป็น Design Home Airbnb ตามความเหมาะสม)\nรูปแบบการพัก: Dormitory (ห้องรวม) เพื่อให้สมาชิกได้พูดคุยและแชร์ประสบการณ์ร่วมกัน\nหมายเหตุ: โปรแกรมทริป/จุดล่าแสงใต้ อาจสลับลำดับตามสภาพอากาศ ทัศนวิสัย และค่าพลังงานออโรร่า เพื่อภาพที่ดีที่สุดและความปลอดภัย',
      dormUpgradeNote:
        'อัปเกรดเป็นห้องส่วนตัว: +$350–$550 AUD ต่อคืน (กรุณาแจ้งทีมงานล่วงหน้าเพื่อจัดการจองให้ทัน)',
      itinerary: [
        {
          morning:
            'Journey into History: เดินทางด้วยรถ SUV ไป Port Arthur Historic Site ย้อนรอยโบราณสถานนักโทษระดับโลก พร้อมวิวชายฝั่ง',
          afternoon:
            'Local Charm: กลับเข้าเมืองแวะ Hobart Market เลือกซื้อของคราฟต์พื้นเมืองและเสบียงระดับพรีเมียม',
          evening:
            'The Aurora Session: ขึ้น Mount Wellington (kunanyi) ชมพระอาทิตย์ตกและเริ่มภารกิจ Aurora Hunting',
          night:
            'Aurora Hunting ต่อเนื่องตามสภาพฟ้า/พลังงานออโรร่า · พักที่ฮอบาร์ต (คืนที่ 1)',
        },
        {
          morning:
            'Island Escape: นั่งเฟอร์รี่ไป Bruny Island · ถ่าย The Neck (360°) และ Bruny Island Lighthouse (จุดใต้สุด)',
          afternoon:
            'Optional Gourmet: Tasting Trail (หอยนางรมสด/ชีสทำมือระดับรางวัล) — กิจกรรมเสริม',
          evening:
            'Second Chance for Aurora: กลับฮอบาร์ต แล้วขึ้น Mount Wellington อีกรอบเพื่อเพิ่มโอกาสเห็นแสงใต้',
          night: 'Aurora Hunting รอบสอง · พักฮอบาร์ต (คืนที่ 2)',
        },
        {
          morning:
            'World-Class Art: เข้าชม MONA (Museum of Old and New Art) ถ่ายภาพสถาปัตย์ใต้ดินและคอนเซ็ปต์อาร์ต',
          afternoon:
            'Waterfront Stroll: เดินเล่น Hobart Waterfront + มื้อกลางวัน แล้วไปสนามบิน Hobart (HBA) บินกลับ SYD',
          evening: '',
          night: '',
        },
      ],
      spots: [
        {
          name: 'Mount Wellington (kunanyi)',
          proTip:
            'จุดยุทธศาสตร์ล่า Aurora Australis (มืด เงียบ ไม่มีแสงเมืองรบกวน) อากาศหนาวมาก เตรียมเสื้อกันหนาวหนา ๆ',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'portrait ตอน sunset: backlight + rim light · ใช้ 35–85mm · ใส่เสื้อกันหนาว/เลเยอร์ให้ดู cinematic',
          landscapeGuide:
            'sunset panoramic + city lights · night: aurora (wide fast lens + tripod) · ตั้งค่ากล้องตามความแรง aurora/เมฆ',
        },
        {
          name: 'Bruny Island (The Neck & Lighthouse)',
          proTip:
            'แลนด์สเคปทรงพลังด้วยแนวหน้าผาและเกลียวคลื่น + จุดชมวิว 360° ที่ The Neck · มี Tasting Trail (optional)',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'ถ่ายคู่ lighthouse: ใช้ 35–50mm ให้ตัวแบบเด่น · ลมแรงเลือก pose แนบเส้นนำสายตา · โทนขาว/น้ำเงินเข้ากับทะเล',
          landscapeGuide:
            'wide เก็บเส้นคอคอด + คลื่น · ใช้ ND ทำ long exposure น้ำเนียน · มุมสูง 360° ช่วยจัด composition แบบ editorial',
        },
        {
          name: 'MONA (Museum of Old and New Art)',
          proTip:
            'สถาปัตย์ใต้ดิน + lighting เอกลักษณ์ เหมาะกับ portrait แนวอาร์ต/คอนเซ็ปต์ และ silhouette ที่ดูน่าค้นหา',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'เล่นเงา silhouette กับไฟเส้น · ใช้ 35mm เก็บ environment · โพสยืนนิ่ง/เดินช้า ๆ ให้ mood gallery',
          landscapeGuide:
            'โครงสร้าง/geometry: symmetry + leading lines · ระวัง noise ในที่มืด · ปรับ WB ให้โทน clean-minimal',
        },
      ],
    }));
  };

  const prefillTasLh4d3n = () => {
    setTrip((p) => ({
      ...p,
      tourCode: 'TAS-LH-4D3N',
      tourName: 'ทริปพร้อมช่างภาพ สัมผัสประวัติศาสตร์ ศิลปะ และตามล่าแสงใต้ (Tasmania Summer: Launceston - Hobart)',
      countryTag: 'AU · Tasmania (Launceston → Hobart)',
      city: 'Hobart',
      durationDays: 4,
      priceStandardAud: '1650',
      pricePrivateAud: '1850',
      dormitoryPolicy:
        'สไตล์ที่พัก: Backpacker & Budget Trip (Hostel / Backpackers / Motel) เน้นสะอาด ปลอดภัย และสิ่งอำนวยความสะดวกพื้นฐานครบถ้วน\nรูปแบบการพัก: Dormitory (ห้องรวม) เพื่อเปิดโอกาสให้สมาชิกได้พูดคุย แลกเปลี่ยนประสบการณ์ และสนิทสนมกัน\nหมายเหตุ: โปรแกรมเดินทาง/จุดถ่ายภาพ/จุดล่าแสงใต้ อาจสลับลำดับตามสภาพอากาศ ทัศนวิสัย และค่าพลังงานออโรร่า เพื่อภาพที่ดีที่สุดและความปลอดภัย',
      dormUpgradeNote:
        'อัปเกรดเป็นห้องส่วนตัว: +$250–$550 AUD ต่อคืน (กรุณาแจ้งทีมงานล่วงหน้าเพื่อเช็กและจองให้ทันเวลา)',
      itinerary: [
        {
          morning:
            'Bridestowe Lavender Estate: ไปทุ่งลาเวนเดอร์ ดักแสงสาย ๆ เพื่อสร้างมิติภาพพอร์ตเทรต/แลนด์สเคป',
          afternoon:
            'Richmond Bridge: ถ่ายสะพานหินเก่าแก่ที่สุด + เรียนรู้การเล่าเรื่องด้วย Leading Lines',
          evening:
            'The Aurora Hunt: ภารกิจล่า Aurora ครั้งแรก ณ จุดมืดสนิทไร้แสงกวน + สอนตั้งค่ากล้อง',
          night: 'Aurora Hunting ตามสภาพฟ้า/พลังงาน · พักที่พักในเส้นทางทริป (คืนที่ 1)',
        },
        {
          morning:
            'Cradle Mountain: เดินทางไปจุดเช็คอินธรรมชาติระดับโลก เฝ้ารอ Reflection ผิวน้ำนิ่งเหมือนกระจก',
          afternoon:
            'Nature & Wildlife: เดินสำรวจเก็บภาพป่าโบราณและสัตว์ป่าท้องถิ่นในมุม Unseen',
          evening:
            'Aurora Mission Night 2: ล่าแสงใต้ต่อเนื่องในพิกัดใหม่เพื่อเพิ่มโอกาสสูงสุด',
          night: 'Aurora Hunting รอบสอง · พักใกล้อุทยานหรือในเส้นทางทริป (คืนที่ 2)',
        },
        {
          morning:
            'World-Class Art: เข้าชม MONA เรียนรู้เทคนิค Chiaroscuro เล่นแสง/เงา ถ่ายภาพคอนเซ็ปต์',
          afternoon:
            'Hobart Market & Cascade Brewery: street vibe ที่ตลาดโลคอล + ถ่ายสถาปัตย์ Cascade Brewery (พักผ่อน/จิบเครื่องดื่ม)',
          evening:
            'Mt. Wellington (kunanyi): ขึ้นยอดเขาเก็บ Golden Hour เหนือเมือง Hobart',
          night:
            'Final Aurora Hunt: ภารกิจล่าแสงใต้คืนสุดท้าย เก็บตกทุกความทรงจำ · พักในเมืองฮอบาร์ต (คืนที่ 3)',
        },
        {
          morning:
            'Farewell Tasmania: เก็บภาพเช้าเมือง Hobart เดินเล่นย่าน Waterfront แบบชิล ๆ ก่อนเดินทางกลับ',
          afternoon: 'เดินทางสู่สนามบินเพื่อบินกลับซิดนีย์ (SYD)',
          evening: '',
          night: '',
        },
      ],
      spots: [
        {
          name: 'Bridestowe Lavender Estate & Richmond Bridge',
          proTip:
            'ลาเวนเดอร์เน้นดักแสงช่วงสายเพื่อสร้างมิติ/เงาสวย · Richmond Bridge เน้นการเล่าเรื่องด้วย Leading Lines',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'Lavender: เสื้อผ้าโทนขาว/ครีม/พาสเทลให้ตัดกับม่วง · ใช้ 35–85mm เก็บละลายฉากหลัง · Richmond: pose เดินบนสะพาน/หันกลับให้ mood classic',
          landscapeGuide:
            'Lavender: ใช้เส้นแถวเป็น leading lines + มุมต่ำให้ดอกนำสายตา · Richmond: จัดเฟรมซุ้มโค้งสะพาน + reflection ถ้ามีน้ำ',
        },
        {
          name: 'Cradle Mountain (Reflection & Wildlife)',
          proTip:
            'จุดยุทธศาสตร์ทั้ง landscape “น้ำกระจก” และพิกัดลับ Aurora Mission Night 2 เฝ้าลุ้นแสงเต้นเหนือยอดเขา',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'ใช้ 50–85mm compress ฉากหลังภูเขา · ถ่ายริมทะเลสาบเน้น reflection · โทนเสื้อผ้าเอิร์ธโทนเข้ากับธรรมชาติ',
          landscapeGuide:
            'reflection: รอผิวน้ำนิ่ง + ใช้ CPL คุม glare · wildlife: เลนส์ยาว 70–200/100–400 · night: wide fast + tripod',
        },
        {
          name: 'MONA & Mt. Wellington (kunanyi)',
          proTip:
            'MONA: เล่น Chiaroscuro แสง/เงาแบบมือโปร · Mt. Wellington: Golden Hour + ภารกิจล่าแสงใต้คืนสุดท้าย',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'MONA: silhouette / concept pose · Mt. Wellington: portrait ตอน golden hour ใช้ rim light + layer clothing ให้ cinematic',
          landscapeGuide:
            'MONA: geometry/symmetry ในอาคาร + WB clean-minimal · Mt. Wellington: panoramic 360° + night aurora (wide fast lens + tripod)',
        },
      ],
    }));
  };

  const prefillCan2d1n = () => {
    setTrip((p) => ({
      ...p,
      tourCode: 'CAN-2D1N',
      tourName: 'ทริปถ่ายภาพทุ่งคาโนล่า 2 วัน 1 คืน (Cowra & Canowindra Canola Fields Photo Trip)',
      countryTag: 'AU · Cowra / Canowindra (NSW)',
      city: 'Cowra',
      durationDays: 2,
      priceStandardAud: '380',
      pricePrivateAud: '',
      dormitoryPolicy:
        'สไตล์ที่พัก: เน้นกันเองและคุ้มค่า (Backpackers / Motels) สะอาด ปลอดภัย และสิ่งอำนวยความสะดวกพื้นฐานครบถ้วน\nรูปแบบการพัก: Dormitory / ห้องแชร์ร่วมกัน เพื่อให้ทุกคนได้พูดคุยและแลกเปลี่ยนประสบการณ์ร่วมกัน\nหมายเหตุ: โปรแกรม/จุดถ่ายภาพอาจสลับลำดับตามสภาพอากาศ ทัศนวิสัย และธรรมชาติของวันออกทริป เพื่อได้ภาพที่สวยที่สุด',
      dormUpgradeNote:
        'อัปเกรดเป็นห้องส่วนตัว (Private Room): +$150–$350 AUD ต่อคืน (กรุณาแจ้งล่วงหน้าเพื่อเช็กและจองให้ทันเวลา)',
      itinerary: [
        {
          morning: 'ออกเดินทางจากซิดนีย์ → Cowra / Canowindra (ระยะทาง ~309 กม.)',
          afternoon:
            'เช็กอินเมืองเก่าสุดคลาสสิก (Cowra & Canowindra) ถ่ายภาพแนว Vintage Storytelling ตามมุมตึกเก่า/คาเฟ่โลคอล',
          evening:
            'Canola Fields: ดักแสงเย็น (Golden Hour) ที่ทุ่งคาโนล่า ทีมงานช่วยจัดมุม/ท่าโพสให้สีเหลืองตัดกับเสื้อผ้าเด่น ๆ',
          night: 'เข้าที่พัก 1 คืน พักผ่อน/พูดคุยแลกเปลี่ยนประสบการณ์',
        },
        {
          morning:
            'Canola Fields: เก็บภาพช่วงเช้าแสงนุ่ม + ลุยจุดยุทธศาสตร์ที่ทีมงานสำรวจไว้ (ถ่าย portrait/landscape)',
          afternoon:
            'Cowra Japanese Garden (Optional): เก็บภาพสวนญี่ปุ่น/สะพานแดง/ลำธาร (ไม่รวมค่าเข้า) หรือแวะถ่ายตามเส้นทางโร้ดทริป',
          evening: 'เดินทางกลับซิดนีย์ (Sydney) พร้อมไฟล์ภาพสวย ๆ เต็มอิ่ม',
          night: '',
        },
      ],
      spots: [
        {
          name: 'Canola Fields (ทุ่งดอกคาโนล่า)',
          proTip:
            'เหมาะถ่ายได้ทุกมุม ทีมงานแนะนำองค์ประกอบให้สีเหลืองตัดกับสีเสื้อผ้า ถ่ายพอร์ตเทรตสวยปังทุกชัตเตอร์',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'แนะนำเสื้อผ้าโทนฟ้า/น้ำเงิน/ขาว/แดง เพื่อคอนทราสต์กับสีเหลือง · ใช้ 35–85mm เก็บละลายฉากหลัง · pose เดิน/หมุน/จับดอกแบบธรรมชาติ',
          landscapeGuide:
            'จัดเส้นแถวคาโนล่าเป็น leading lines · มุมต่ำให้ดอกไม้เป็น foreground · Golden Hour จะได้มิติ/เงาสวย · ลอง panorama เก็บ “ทะเลสีเหลือง”',
        },
        {
          name: 'Cowra & Canowindra (Historic Country Town)',
          proTip:
            'เดินเจาะลึกเก็บภาพมุมตึกเก่า คาเฟ่โลคอล และสถาปัตย์ดั้งเดิม ให้โทนวินเทจมีเสน่ห์',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'ถ่ายคู่ storefront/brick wall ให้ mood editorial · ใช้ 35–50mm · pose เดินข้ามถนน/ถือกาแฟ/หันมองกล้องแบบ candid',
          landscapeGuide:
            'เล่าเรื่องด้วยป้ายร้าน/เส้นถนน/รถคลาสสิก · ถ่ายช่วงเย็นให้แสงนุ่ม · เก็บรายละเอียด texture/typography ให้ดู premium',
        },
        {
          name: 'Cowra Japanese Garden & Cultural Centre (Optional)',
          proTip:
            'มุมสะพานและสวนหินเป็นจุดยุทธศาสตร์สำหรับภาพนิ่งสงบ คู่สีตัดกันสวย (กิจกรรมเสริม ไม่รวมค่าเข้า)',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'ใช้สะพานแดง/ลำธารเป็นฉากหลัง · pose แบบนิ่งสงบ · เลือกเสื้อผ้าโทนขาว/ดำ/ครีมให้ตัดกับสีสวน',
          landscapeGuide:
            'จัดเฟรมเส้นสะพาน + reflection · ใช้เลนส์กว้างเก็บสวนหิน · ถ่ายมุมสมมาตรเพื่อความ minimal',
        },
      ],
    }));
  };

  const prefillSyd1day = () => {
    setTrip((p) => ({
      ...p,
      tourCode: 'SYD-1DAY',
      tourName: 'One Day Trip in Sydney & Photoshoot Packages',
      countryTag: 'AU · Sydney (1 Day)',
      city: 'Sydney',
      durationDays: 1,
      categoryCode: 'SYD-1DAY',
      categoryName: 'แพ็กเกจทริปถ่ายภาพซิดนีย์ 1 วันเต็ม (One Day Trip in Sydney & Photoshoot Packages)',
      basePriceAud: '250',
      depositAud: '100',
      priceStandardAud: '',
      pricePrivateAud: '',
      dormitoryPolicy:
        'เวลาเดินทางปกติ: 08:00–18:00 (ยกเว้น Milky Way 18:00–23:00)\nขนาดกลุ่ม: Private กลุ่มเล็ก จำกัด 4 ท่าน/ทริป\nราคาเริ่มต้น: $250 AUD/ท่าน (ปรับตามแพ็กเกจ)\nนโยบายมัดจำ: $100 AUD ล็อคคิว (No Refund ไม่คืนเงินมัดจำทุกกรณี)\nหมายเหตุ: แพ็กเกจธรรมชาติ (Milky Way/Glow worms) อาจปรับหน้างานตามสภาพอากาศเพื่อความปลอดภัยและภาพที่ดีที่สุด',
      dormUpgradeNote: '',
      itinerary: Array.from({ length: 4 }).map(() => ({ morning: '', afternoon: '', evening: '', night: '' })),
      spots: [
        {
          name: 'Influencer Photoshoot — Sydney 5 Best Locations',
          proTip:
            'ราคา $680 AUD/ท่าน · ถ่าย 3 ชั่วโมง · 5 โลเคชั่นเด็ด · เปลี่ยนชุดไม่จำกัด · ถ่ายไม่จำกัด + แต่งโทน + ส่งอัลบั้มออนไลน์ · รับ-ส่งหน้าโรงแรม',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'สไตล์ street/editorial · 35–85mm · เปลี่ยนชุดหลายลุคได้ · ทีมงานช่วย posing + light direction',
          landscapeGuide: '—',
        },
        {
          name: 'Sydney → Anna Bay (Coast & Sand Dunes)',
          proTip:
            'Long Jetty / Catherine Hill Bay / Anna Bay · เปิดจอง Winter + Summer',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'โทนขาว/ครีม/ฟ้าเข้ากับทะเลและทราย · ถ่าย environmental portraits + motion',
          landscapeGuide:
            'เนินทราย: ลายเส้นเป็น leading lines · golden hour ได้มิติ · ลอง panorama + silhouette',
        },
        {
          name: 'Sydney → Kiama (South Coast Nature)',
          proTip:
            'Old Helensburgh Station / Seacliff Bridge / Bombo Headland · เปิดจอง Winter + Summer',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'Seacliff: cinematic walk · Bombo: dress contrast vs basalt · Helensburgh: mystery silhouette',
          landscapeGuide:
            'Seacliff: wide curve composition · Bombo: basalt columns + tide pools · Helensburgh: tripod low-light (ตามสภาพหน้างาน)',
        },
        {
          name: 'Milky Way Hunt near Sydney (Winter Only)',
          proTip:
            'เวลา 18:00–23:00 · เปิดเฉพาะฤดูหนาว · ไปจุดท้องฟ้ามืดสนิท ถ่าย Milky Way + portrait คู่หมู่ดาว',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'ใช้ไฟช่วยแบบนุ่ม + pose นิ่ง · เสื้อผ้าโทนเข้มหรือขาวตาม mood',
          landscapeGuide:
            'wide fast lens + tripod · long exposure · ทีมงานสอนตั้งค่ากล้องหน้างาน',
        },
      ],
    }));
  };

  const prefillObe1day = () => {
    setTrip((p) => ({
      ...p,
      tourCode: 'OBE-1DAY',
      tourName: 'ทริปด่วนล่าหิมะแรกวันเดียว Oberon, NSW (Oberon First Snow Hunt One Day Trip)',
      countryTag: 'AU · Oberon NSW',
      city: 'Oberon',
      weather: '',
      messengerUrl: 'https://m.me/trip2talk.chapter99',
      coverUrl:
        'https://images.unsplash.com/photo-1459478309853-2c33a60058e7?w=1400&q=85&auto=format&fit=crop',
      durationDays: 1,
      departureStart: '2026-05-08',
      departureEnd: '2026-05-08',
      slotsBooked: '0',
      slotsMax: '4',
      basePriceAud: '260',
      depositAud: '',
      categoryCode: 'OBE-1DAY',
      categoryName: 'One Day Trip',
      dormitoryPolicy: '',
      itinerary: Array.from({ length: 4 }).map(() => ({ morning: '', afternoon: '', evening: '', night: '' })),
      spots: [
        {
          name: 'Hunt the Snow (Oberon)',
          proTip:
            'ไม่การันตี 100% ว่าหิมะจะตกหนักแค่ไหน แต่นี่คือเสน่ห์ของ Snow Hunting — พื้นขาวช่วยเด้งแสง ทำให้หน้าดูไบรท์และถ่ายขึ้นกล้องมาก',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide:
            'เสื้อโทนครีม/เอิร์ธโทน + หมวก/ผ้าพันคอเพิ่มเลเยอร์ · โพสเดิน/จับหมวก/มองไกลให้ฟีล cinematic',
          landscapeGuide:
            'เก็บ leading lines ของถนน/แนวต้นไม้ · ถ่าย wide + low angle ให้เห็น texture หิมะ/หมอก',
        },
        {
          name: 'Pro Photographer Guide',
          proTip:
            'พี่แสนช่วยจัดท่า จัดทาง จัดมุมแสง แบบตัวต่อตัวตาม reference — ได้รูปสไตล์แมกกาซีน ไม่ต้องคิดโพสเอง',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide: 'ปล่อยมือผ่อนคลาย + เอียงไหล่/คางนิด ๆ · เดินช้า ๆ แล้วหยุดให้จังหวะกดชัตเตอร์',
          landscapeGuide: 'ใช้ระยะ 24–35mm เก็บทั้งคนและบรรยากาศ · เน้น subject แยกจาก background ด้วยแสง/มุม',
        },
        {
          name: 'Travel in Style (SUV Road Trip)',
          proTip: 'ทริปเล็ก อบอุ่น ยืดหยุ่นสูง เหมือนเพื่อนสนิทชวนกันออกไปล่าหิมะและถ่ายรูปเล่นแก้หนาว',
          mapsUrl: '',
          photoUrl: '',
          portraitGuide: 'ถ่าย candid ในรถ/ริมทาง · mood relaxed แต่ดูแพง',
          landscapeGuide: 'เก็บ establishing shot ของ road trip · รถ + วิว + ท้องฟ้า',
        },
      ],
    }));
  };

  const saveTrip = async () => {
    setSyncing('trip');
    setSyncOk(null);
    setSyncError(null);
    try {
      const durationDays = Math.max(1, Math.min(4, Math.round(Number(trip.durationDays) || 1)));
      const payload = {
        sheet: 'Trips_Data',
        trip: {
          tourCode: trip.tourCode.trim(),
          tourName: trip.tourName.trim(),
          countryTag: trip.countryTag.trim(),
          city: trip.city.trim(),
          weather: trip.weather.trim(),
          messengerUrl: trip.messengerUrl.trim(),
          coverUrl: trip.coverUrl.trim(),
          durationDays,
          departureStart: trip.departureStart.trim(),
          departureEnd: trip.departureEnd.trim(),
          slotsBooked: trip.slotsBooked.trim(),
          slotsMax: trip.slotsMax.trim(),
          priceStandardAud: trip.priceStandardAud.trim(),
          pricePrivateAud: trip.pricePrivateAud.trim(),
          categoryCode: trip.categoryCode.trim(),
          categoryName: trip.categoryName.trim(),
          basePriceAud: trip.basePriceAud.trim(),
          depositAud: trip.depositAud.trim(),
          dormitoryPolicy: trip.dormitoryPolicy.trim(),
          dormUpgradeNote: trip.dormUpgradeNote.trim(),
          itinerary:
            durationDays > 1
              ? trip.itinerary.slice(0, durationDays).map((d, idx) => ({
                  dayNumber: idx + 1,
                  morning: d.morning.trim(),
                  afternoon: d.afternoon.trim(),
                  evening: d.evening.trim(),
                  night: d.night.trim(),
                }))
              : [],
          spots: trip.spots
            .slice(0, MAX_SPOTS)
            .map((s) => ({
              name: s.name.trim(),
              proTip: s.proTip.trim(),
              mapsUrl: s.mapsUrl.trim(),
              photoUrl: s.photoUrl.trim(),
                  portraitGuide: s.portraitGuide.trim(),
                  landscapeGuide: s.landscapeGuide.trim(),
            })),
        },
      };
      await postToAppsScript(payload);
      setSyncOk('Trips_Data synced.');
      void loadTourCodes();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing('none');
    }
  };

  const saveBooking = async () => {
    setSyncing('booking');
    setSyncOk(null);
    setSyncError(null);
    try {
      const payload = {
        sheet: 'Customer_Bookings',
        booking: {
          bookingId: booking.bookingId.trim(),
          customerName: booking.customerName.trim(),
          tourCode: booking.tourCode.trim(),
        },
      };
      await postToAppsScript(payload);
      setSyncOk('Customer_Bookings synced.');
      setBooking({ bookingId: '', customerName: '', tourCode: booking.tourCode });
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing('none');
    }
  };

  return (
    <section className="cyber-card p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="cyber-section-header text-amber-400 tracking-wide">INTERNAL CMS · DASHBOARD</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Save here → auto sync to Google Sheets (Apps Script)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={prefillMel4d3n} className="cyber-btn-ghost">
            PREFILL MEL-4D3N
          </button>
            <button type="button" onClick={prefillUlu4d3n} className="cyber-btn-ghost">
              PREFILL ULU-4D3N
            </button>
            <button type="button" onClick={prefillTas3d2n} className="cyber-btn-ghost">
              PREFILL TAS-3D2N
            </button>
            <button type="button" onClick={prefillTasLh4d3n} className="cyber-btn-ghost">
              PREFILL TAS-LH-4D3N
            </button>
            <button type="button" onClick={prefillCan2d1n} className="cyber-btn-ghost">
              PREFILL CAN-2D1N
            </button>
            <button type="button" onClick={prefillSyd1day} className="cyber-btn-ghost">
              PREFILL SYD-1DAY
            </button>
            <button type="button" onClick={prefillObe1day} className="cyber-btn-ghost">
              PREFILL OBE-1DAY
            </button>
          <button type="button" onClick={() => void loadTourCodes()} className="cyber-btn-ghost">
            REFRESH TRIPS
          </button>
        </div>
      </div>

      {(syncOk || syncError) && (
        <div
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm font-mono',
            syncError ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          )}
        >
          {syncError ?? syncOk}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FORM 1 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-neutral-200">FORM 1 · CREATE / UPDATE TRIP DATA</p>
            {syncing === 'trip' && (
              <span className="inline-flex items-center gap-2 text-xs font-mono text-amber-400">
                <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                SYNCING…
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 font-mono">Tour Code</label>
              <input
                className="cyber-input mt-1"
                value={trip.tourCode}
                onChange={(e) => setTrip((p) => ({ ...p, tourCode: e.target.value }))}
                placeholder="SYD-WKND-001"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 font-mono">Country Tag</label>
              <input
                className="cyber-input mt-1"
                value={trip.countryTag}
                onChange={(e) => setTrip((p) => ({ ...p, countryTag: e.target.value }))}
                placeholder="AU · Sydney"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 font-mono">City (Weather)</label>
              <input
                className="cyber-input mt-1"
                value={trip.city}
                onChange={(e) => setTrip((p) => ({ ...p, city: e.target.value }))}
                placeholder="Melbourne"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 font-mono">Duration (Days)</label>
              <input
                type="number"
                min={1}
                max={4}
                className="cyber-input mt-1"
                value={trip.durationDays}
                onChange={(e) => setTrip((p) => ({ ...p, durationDays: Number(e.target.value || 1) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 font-mono">Departure Start (ISO)</label>
              <input
                className="cyber-input mt-1"
                value={trip.departureStart}
                onChange={(e) => setTrip((p) => ({ ...p, departureStart: e.target.value }))}
                placeholder="2026-05-08"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 font-mono">Departure End (ISO)</label>
              <input
                className="cyber-input mt-1"
                value={trip.departureEnd}
                onChange={(e) => setTrip((p) => ({ ...p, departureEnd: e.target.value }))}
                placeholder="2026-05-08"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 font-mono">Slots Booked</label>
              <input
                className="cyber-input mt-1"
                value={trip.slotsBooked}
                onChange={(e) => setTrip((p) => ({ ...p, slotsBooked: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 font-mono">Slots Max</label>
              <input
                className="cyber-input mt-1"
                value={trip.slotsMax}
                onChange={(e) => setTrip((p) => ({ ...p, slotsMax: e.target.value }))}
                placeholder="4"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 font-mono">Tour Category Code (optional)</label>
              <input
                className="cyber-input mt-1"
                value={trip.categoryCode}
                onChange={(e) => setTrip((p) => ({ ...p, categoryCode: e.target.value }))}
                placeholder="SYD-1DAY"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 font-mono">Category Name (optional)</label>
              <input
                className="cyber-input mt-1"
                value={trip.categoryName}
                onChange={(e) => setTrip((p) => ({ ...p, categoryName: e.target.value }))}
                placeholder="One Day Trip in Sydney & Photoshoot Packages"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 font-mono">Base Price (AUD) (optional)</label>
              <input
                className="cyber-input mt-1"
                value={trip.basePriceAud}
                onChange={(e) => setTrip((p) => ({ ...p, basePriceAud: e.target.value }))}
                placeholder="250"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 font-mono">Deposit (AUD) (optional)</label>
              <input
                className="cyber-input mt-1"
                value={trip.depositAud}
                onChange={(e) => setTrip((p) => ({ ...p, depositAud: e.target.value }))}
                placeholder="100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-neutral-500 font-mono">Tour Name</label>
            <input
              className="cyber-input mt-1"
              value={trip.tourName}
              onChange={(e) => setTrip((p) => ({ ...p, tourName: e.target.value }))}
              placeholder="Sydney Photo Journey — Coastal Icons"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 font-mono">Weather</label>
              <input
                className="cyber-input mt-1"
                value={trip.weather}
                onChange={(e) => setTrip((p) => ({ ...p, weather: e.target.value }))}
                placeholder="16°C ☀️"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 font-mono">Messenger Group Link</label>
              <input
                className="cyber-input mt-1"
                value={trip.messengerUrl}
                onChange={(e) => setTrip((p) => ({ ...p, messengerUrl: e.target.value }))}
                placeholder="https://m.me/join/..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 font-mono">Standard Price (AUD)</label>
              <input
                className="cyber-input mt-1"
                value={trip.priceStandardAud}
                onChange={(e) => setTrip((p) => ({ ...p, priceStandardAud: e.target.value }))}
                placeholder="1550"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 font-mono">Private Price (AUD)</label>
              <input
                className="cyber-input mt-1"
                value={trip.pricePrivateAud}
                onChange={(e) => setTrip((p) => ({ ...p, pricePrivateAud: e.target.value }))}
                placeholder="2300"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-neutral-500 font-mono">Dormitory / Accommodation Policy</label>
            <textarea
              className="cyber-input mt-1 min-h-[96px] resize-none"
              value={trip.dormitoryPolicy}
              onChange={(e) => setTrip((p) => ({ ...p, dormitoryPolicy: e.target.value }))}
              placeholder="Default: shared dormitory rooms (separated by gender where possible). Bring earplugs..."
            />
          </div>

          <div>
            <label className="text-xs text-neutral-500 font-mono">Upgrade Note</label>
            <input
              className="cyber-input mt-1"
              value={trip.dormUpgradeNote}
              onChange={(e) => setTrip((p) => ({ ...p, dormUpgradeNote: e.target.value }))}
              placeholder="Upgrade to a private room: +$350–$550 AUD"
            />
          </div>

          {Number(trip.durationDays) > 1 && (
            <div className="cyber-card p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-200">ITINERARY BUILDER</p>
                  <p className="text-xs text-neutral-500 font-mono mt-1">Day 1 → Day 4 (Morning / Afternoon / Evening / Night)</p>
                </div>
                <span className="text-xs text-neutral-500 font-mono">{Math.max(2, Math.min(4, trip.durationDays))} days</span>
              </div>

              {trip.itinerary.slice(0, Math.max(2, Math.min(4, trip.durationDays))).map((d, idx) => (
                <div key={idx} className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
                  <p className="text-xs font-mono text-neutral-500">DAY {idx + 1}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-500 font-mono">Morning</label>
                      <textarea
                        className="cyber-input mt-1 min-h-[84px] resize-none"
                        value={d.morning}
                        onChange={(e) =>
                          setTrip((p) => ({
                            ...p,
                            itinerary: p.itinerary.map((row, i) => (i === idx ? { ...row, morning: e.target.value } : row)),
                          }))
                        }
                        placeholder="🌤️ Sunrise / breakfast / first location"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 font-mono">Afternoon</label>
                      <textarea
                        className="cyber-input mt-1 min-h-[84px] resize-none"
                        value={d.afternoon}
                        onChange={(e) =>
                          setTrip((p) => ({
                            ...p,
                            itinerary: p.itinerary.map((row, i) => (i === idx ? { ...row, afternoon: e.target.value } : row)),
                          }))
                        }
                        placeholder="🚗 Drive / lunch / scenic stop"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 font-mono">Evening</label>
                      <textarea
                        className="cyber-input mt-1 min-h-[84px] resize-none"
                        value={d.evening}
                        onChange={(e) =>
                          setTrip((p) => ({
                            ...p,
                            itinerary: p.itinerary.map((row, i) => (i === idx ? { ...row, evening: e.target.value } : row)),
                          }))
                        }
                        placeholder="📸 Golden hour portrait / dinner"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 font-mono">Night / Milky Way notes</label>
                      <textarea
                        className="cyber-input mt-1 min-h-[84px] resize-none"
                        value={d.night}
                        onChange={(e) =>
                          setTrip((p) => ({
                            ...p,
                            itinerary: p.itinerary.map((row, i) => (i === idx ? { ...row, night: e.target.value } : row)),
                          }))
                        }
                        placeholder="🌌 Milky Way hunt / stargazing / rest"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <UploadCard
            label="Trip Cover Photo"
            valueUrl={trip.coverUrl}
            pathPrefix={`${tripPathPrefix}/cover`}
            onUploaded={(url) => setTrip((p) => ({ ...p, coverUrl: url }))}
            disabled={!trip.tourCode.trim()}
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-neutral-200">Dynamic Spots (up to 4)</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canRemoveSpot}
                className="cyber-btn-ghost disabled:opacity-40"
                onClick={() =>
                  setTrip((p) => ({ ...p, spots: p.spots.slice(0, Math.max(1, p.spots.length - 1)) }))
                }
              >
                − spot
              </button>
              <button
                type="button"
                disabled={!canAddSpot}
                className="cyber-btn-ghost disabled:opacity-40"
                onClick={() =>
                  setTrip((p) => ({
                    ...p,
                    spots: [
                      ...p.spots,
                      { name: '', proTip: '', mapsUrl: '', photoUrl: '', portraitGuide: '', landscapeGuide: '' },
                    ].slice(0, MAX_SPOTS),
                  }))
                }
              >
                + spot
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {trip.spots.map((s, idx) => (
              <div key={idx} className="cyber-card p-4 space-y-3">
                <p className="text-xs font-mono text-neutral-500">SPOT {idx + 1}</p>
                <div>
                  <label className="text-xs text-neutral-500 font-mono">Spot Name</label>
                  <input
                    className="cyber-input mt-1"
                    value={s.name}
                    onChange={(e) =>
                      setTrip((p) => ({
                        ...p,
                        spots: p.spots.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row)),
                      }))
                    }
                    placeholder="Helensburgh Old Tunnel"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 font-mono">P'Saen Pro‑Tip</label>
                  <textarea
                    className="cyber-input mt-1 min-h-[84px] resize-none"
                    value={s.proTip}
                    onChange={(e) =>
                      setTrip((p) => ({
                        ...p,
                        spots: p.spots.map((row, i) => (i === idx ? { ...row, proTip: e.target.value } : row)),
                      }))
                    }
                    placeholder="Phone torch from behind = rim light silhouette"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-500 font-mono">Portrait Guide</label>
                    <textarea
                      className="cyber-input mt-1 min-h-[84px] resize-none"
                      value={s.portraitGuide}
                      onChange={(e) =>
                        setTrip((p) => ({
                          ...p,
                          spots: p.spots.map((row, i) => (i === idx ? { ...row, portraitGuide: e.target.value } : row)),
                        }))
                      }
                      placeholder="Poses / interaction prompts / lens suggestion"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 font-mono">Landscape Guide</label>
                    <textarea
                      className="cyber-input mt-1 min-h-[84px] resize-none"
                      value={s.landscapeGuide}
                      onChange={(e) =>
                        setTrip((p) => ({
                          ...p,
                          spots: p.spots.map((row, i) => (i === idx ? { ...row, landscapeGuide: e.target.value } : row)),
                        }))
                      }
                      placeholder="Best time / composition / settings / gear"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-neutral-500 font-mono">Google Maps Link</label>
                  <input
                    className="cyber-input mt-1"
                    value={s.mapsUrl}
                    onChange={(e) =>
                      setTrip((p) => ({
                        ...p,
                        spots: p.spots.map((row, i) => (i === idx ? { ...row, mapsUrl: e.target.value } : row)),
                      }))
                    }
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </div>

                <UploadCard
                  label={`Spot ${idx + 1} Photo`}
                  valueUrl={s.photoUrl}
                  pathPrefix={`${tripPathPrefix}/spots/spot-${idx + 1}`}
                  onUploaded={(url) =>
                    setTrip((p) => ({
                      ...p,
                      spots: p.spots.map((row, i) => (i === idx ? { ...row, photoUrl: url } : row)),
                    }))
                  }
                  disabled={!trip.tourCode.trim()}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="cyber-btn-gold"
            disabled={syncing !== 'none'}
            onClick={() => void saveTrip()}
          >
            SAVE & SYNC (Trips_Data)
          </button>
        </div>

        {/* FORM 2 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-neutral-200">FORM 2 · REGISTER CUSTOMER BOOKING</p>
            {syncing === 'booking' && (
              <span className="inline-flex items-center gap-2 text-xs font-mono text-amber-400">
                <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                SYNCING…
              </span>
            )}
          </div>

          <div>
            <label className="text-xs text-neutral-500 font-mono">Tour Code</label>
            <select
              className="cyber-input mt-1"
              value={booking.tourCode}
              onChange={(e) => setBooking((p) => ({ ...p, tourCode: e.target.value }))}
            >
              <option value="">Select tour…</option>
              {computedTourCodes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 font-mono">Booking ID</label>
              <input
                className="cyber-input mt-1"
                value={booking.bookingId}
                onChange={(e) => setBooking((p) => ({ ...p, bookingId: e.target.value }))}
                placeholder="BK-123456"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 font-mono">Customer Name</label>
              <input
                className="cyber-input mt-1"
                value={booking.customerName}
                onChange={(e) => setBooking((p) => ({ ...p, customerName: e.target.value }))}
                placeholder="Jane Doe"
              />
            </div>
          </div>

          <button
            type="button"
            className="cyber-btn-gold"
            disabled={syncing !== 'none'}
            onClick={() => void saveBooking()}
          >
            SAVE & SYNC (Customer_Bookings)
          </button>

          <p className="text-xs text-neutral-600 font-mono leading-relaxed">
            Apps Script must accept JSON and append to tabs: <span className="text-neutral-400">Trips_Data</span> /
            <span className="text-neutral-400"> Customer_Bookings</span>.
          </p>
        </div>
      </div>
    </section>
  );
}

