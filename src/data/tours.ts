import { MASTER_TRIP_SEEDS } from '../lib/masterTrips';
import type { TripSeason, TripType } from '../lib/masterTrips';
import type { TripSheetRow } from '../lib/tripsSheetApi';

export type ItineraryDay = {
  day: number;
  title: string;
  desc: string;
};

export type TourFallback = {
  tourCode: string;
  anonymizedTitle: string;
  tripType: TripType;
  standardPrice: number;
  privatePrice: number;
  durationLabel: string;
  season: TripSeason;
  maxPax: number;
  highlights: string[];
  pickupType: string;
  description: string;
  // ---- Optional rich content (drives the data-driven TourDetail sections) ----
  /** Display name incl. duration suffix, e.g. "Victoria Photo Trip (4D3N)". */
  tourName?: string;
  /** Thai display name. */
  nameTh?: string;
  /** Region label, e.g. "AU · AUSTRALIA · SOUTH". */
  location?: string;
  rating?: number;
  /** ISO date of the next departure, e.g. "2026-02-22". */
  nextDate?: string;
  /** Literal departure label that overrides the formatted nextDate, e.g. "All Year Round". */
  departureLabel?: string;
  endDate?: string;
  weather?: string;
  /** Thai marketing tagline. */
  tagline?: string;
  /** Thai category label, e.g. "ทริปค้างคืน". */
  category?: string;
  itinerary?: ItineraryDay[];
  included?: string[];
  excluded?: string[];
  accommodation?: string;
  /** Emoji icons for the highlight cards, cycled across highlights. */
  highlightIcons?: string[];
  /** Seats remaining, shown in the urgency badge. */
  seatsLeft?: number;
  /** Flagship/featured treatment in the trips listing grid. */
  featured?: boolean;
  /** Hardcoded gallery photo URLs — consumed by TourDetail before any bucket lookup (first = hero). */
  galleryPhotos?: string[];
};

const PORTFOLIO_BASE =
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio';

export const TOUR_FALLBACK_DATA: TourFallback[] = [
  {
    tourCode: 'MEL-4D3N',
    anonymizedTitle: 'Secret Southern Coast',
    tourName: 'Victoria Photo Trip (4D3N)',
    nameTh: 'ทริปถ่ายภาพ 4 วัน 3 คืน: จากซิดนีย์สู่เมลเบิร์น',
    location: 'AU · AUSTRALIA · SOUTH',
    tripType: 'overnight',
    standardPrice: 1550,
    privatePrice: 2300,
    durationLabel: '4 Days 3 Nights',
    season: 'autumn',
    maxPax: 5,
    rating: 4.8,
    nextDate: '2026-02-22',
    endDate: '2026-02-25',
    weather: 'Autumn 14–18°C',
    category: 'ทริปค้างคืน',
    tagline:
      'เบื่อไหมกับการเที่ยวที่ต้องรีบเร่ง? มาถ่ายรูปกับเรา สัมผัสความงามของเมลเบิร์น เมืองแห่ง 4 ฤดูใน 1 วัน',
    highlights: [
      'Great Ocean Road & The Twelve Apostles — golden hour + Milky Way',
      'Pink Lake — สาหร่ายสีชมพู + ทางช้างเผือกสะท้อนน้ำ',
      'Melbourne City — street art, State Library, Flinders Street Station',
    ],
    highlightIcons: ['📸', '🌸', '🏙️'],
    seatsLeft: 2,
    pickupType: 'airport_terminal',
    description:
      "An immersive 4-day photography journey through Victoria's most dramatic landscapes — Twelve Apostles golden hour, Pink Lake Milky Way reflections, and Melbourne city street art.",
    itinerary: [
      {
        day: 1,
        title: 'SYD → Twelve Apostles',
        desc: 'รับรถ SUV → Great Ocean Road → ถ่าย Golden Hour → ล่า Milky Way',
      },
      {
        day: 2,
        title: 'Blue Hour → Pink Lake',
        desc: 'เก็บแสงเช้า Blue Hour → เดินทางสู่ Pink Lake → ถ่าย Milky Way สะท้อนน้ำ',
      },
      {
        day: 3,
        title: 'Melbourne City',
        desc: 'Street Art · State Library Victoria · Princes Bridge · Flinders Street',
      },
      {
        day: 4,
        title: 'Melbourne → SYD',
        desc: 'ถ่ายวิถีชีวิตยามเช้า → คืนรถ → บินกลับซิดนีย์',
      },
    ],
    included: [
      'รถ SUV พร้อมคนขับและน้ำมัน',
      'ช่างภาพมืออาชีพตลอดทริป',
      'น้ำดื่มตลอดทาง',
      'ค่าเข้าอุทยาน',
      'ช่วยจองตั๋วเครื่องบินฟรี',
    ],
    excluded: ['ตั๋วเครื่องบินไป-กลับ', 'ค่าอาหารทุกมื้อ', 'ประกันการเดินทาง'],
    accommodation: 'Dormitory (ห้องรวม) — อัปเกรดห้องส่วนตัว +$350-$550/คืน',
    galleryPhotos: [
      `${PORTFOLIO_BASE}/Melbourne/01.jpg`,
      `${PORTFOLIO_BASE}/Melbourne/02.jpg`,
      `${PORTFOLIO_BASE}/Melbourne/03.jpeg`,
      `${PORTFOLIO_BASE}/Melbourne/04.jpg`,
      `${PORTFOLIO_BASE}/Melbourne/Mel02.jpg`,
      `${PORTFOLIO_BASE}/Melbourne/Mel03.jpg`,
    ],
  },
  {
    tourCode: 'ULU-4D3N',
    anonymizedTitle: 'The Red Desert Odyssey',
    tourName: 'The Red Desert Odyssey (4D3N)',
    nameTh: 'ทริปถ่ายภาพ 4 วัน 3 คืน: ดินแดน Outback อุลูรู',
    location: 'AU · AUSTRALIA · OUTBACK',
    tripType: 'overnight',
    standardPrice: 1690,
    privatePrice: 1690,
    durationLabel: '4 Days 3 Nights',
    season: 'all',
    maxPax: 5,
    rating: 4.8,
    nextDate: '2026-03-15',
    endDate: '2026-03-18',
    weather: 'Desert 28°C day / 8°C night',
    category: 'ทริปค้างคืน',
    tagline:
      'อยากมีรูปโปรไฟล์ปัง ๆ ไม่ซ้ำใคร? มาล่าทางช้างเผือกกลางทะเลทราย Outback กับเรา',
    highlights: [
      'Uluru — หินเปลี่ยนสีส้มแดง + Milky Way กลางทะเลทราย',
      'Field of Light — หลอดไฟ 50,000 ดวงของ Bruce Munro ตอนรุ่งเช้า',
      'Kata Tjuta (The Olgas) — โดมหิน 36 ก้อน แลนด์สเคปย้อนแสง',
    ],
    highlightIcons: ['🏜️', '💡', '🪨'],
    seatsLeft: 3,
    pickupType: 'airport_terminal',
    description:
      '4-day photography journey to Uluru-Kata Tjuta — sunrise over the red rock, Field of Light at dawn, Milky Way in pitch-black desert skies.',
    itinerary: [
      {
        day: 1,
        title: 'SYD → Ayers Rock → Uluru Sunset',
        desc: 'รับรถตู้ → เช็กอิน Outback Lodge → ชมหินเปลี่ยนสี Sunset → ล่า Milky Way',
      },
      {
        day: 2,
        title: 'Field of Light → Kata Tjuta',
        desc: 'เดินป่า Kata Tjuta ตลอดวัน → 19:00 น. รถบัสพิเศษเข้าชม Field of Light ยามค่ำคืน → แสงไฟ 50,000 ดวงท่ามกลางความมืด',
      },
      {
        day: 3,
        title: 'Uluru Sunrise → Base Walk',
        desc: 'ชม Uluru Sunrise → เดินสำรวจรอบฐานหิน → ค่ำล่า Milky Way ทะเลทราย',
      },
      {
        day: 4,
        title: 'Kata Tjuta Dune → SYD',
        desc: 'Sunrise ครั้งสุดท้าย → ปางอูฐ Camel Express → บินกลับซิดนีย์',
      },
    ],
    included: [
      'รถพร้อมคนขับและน้ำมันตลอดทริป',
      'ที่พัก Outback Lodge 3 คืน',
      'ค่าเข้าอุทยาน Uluru-Kata Tjuta 3 วัน',
      'ตั๋วเข้าชม Field of Light',
      'น้ำดื่มตลอดทาง',
      'ช่างภาพมืออาชีพตลอดทริป',
      'ช่วยจองตั๋วเครื่องบินฟรี',
    ],
    excluded: ['ตั๋วเครื่องบินไป-กลับ', 'ค่าอาหารทุกมื้อ', 'ประกันการเดินทาง'],
    accommodation: 'Outback Lodge Dormitory — อัปเกรดห้องส่วนตัว +$350-$550/คืน',
    galleryPhotos: [
      `${PORTFOLIO_BASE}/Ulruru/1.jpg`,
      `${PORTFOLIO_BASE}/Ulruru/2.jpg`,
      `${PORTFOLIO_BASE}/Ulruru/3.jpg`,
      `${PORTFOLIO_BASE}/Ulruru/4.jpg`,
      `${PORTFOLIO_BASE}/Ulruru/5.jpg`,
      `${PORTFOLIO_BASE}/Ulruru/6.jpg`,
      `${PORTFOLIO_BASE}/Ulruru/7.jpg`,
      `${PORTFOLIO_BASE}/Ulruru/8.jpg`,
      `${PORTFOLIO_BASE}/Ulruru/9.jpg`,
      `${PORTFOLIO_BASE}/Ulruru/10.jpg`,
      `${PORTFOLIO_BASE}/Ulruru/11.jpg`,
      `${PORTFOLIO_BASE}/Ulruru/12.jpg`,
    ],
  },
  {
    tourCode: 'NZ-6D5N',
    anonymizedTitle: 'The Alpine Kingdom',
    tourName: 'The Alpine Kingdom (6D5N)',
    nameTh: 'ทริปถ่ายภาพ 6 วัน 5 คืน: New Zealand South Island',
    location: 'NZ · NEW ZEALAND',
    tripType: 'overnight',
    standardPrice: 2300,
    privatePrice: 2300,
    durationLabel: '6 Days 5 Nights',
    season: 'all',
    maxPax: 5,
    rating: 4.9,
    departureLabel: 'All Year Round',
    weather: 'Varies by season',
    category: 'ทริปค้างคืน',
    tagline:
      'ทริปที่ยาวที่สุด ไกลที่สุด และสวยที่สุดที่เราทำ — New Zealand South Island',
    highlights: [
      'Milford Sound — ฟยอร์ดที่สวยที่สุดในโลก ยามฝนและหมอก',
      'Lake Tekapo — Church of the Good Shepherd + ท้องฟ้าเต็มดาว Milky Way',
      'Queenstown & Southern Alps — ภูเขาหิมะ + ทะเลสาบสีฟ้าเทอควอยซ์',
    ],
    highlightIcons: ['🏔️', '⛪', '🚠'],
    seatsLeft: 2,
    featured: true,
    pickupType: 'airport_terminal',
    description:
      "The ultimate photography journey through New Zealand's South Island — Milford Sound, Lake Tekapo, Queenstown, and the Southern Alps.",
    itinerary: [
      {
        day: 1,
        title: 'SYD → Christchurch',
        desc: 'บินสู่ Christchurch → เช็กอิน → เดินสำรวจเมือง',
      },
      {
        day: 2,
        title: 'Lake Tekapo',
        desc: 'Church of the Good Shepherd → Lupins (ฤดูใบไม้ผลิ) → ค่ำล่า Milky Way ที่ท้องฟ้ามืดสนิท',
      },
      {
        day: 3,
        title: 'Mt Cook / Aoraki',
        desc: 'ภูเขาที่สูงที่สุดใน NZ → Hooker Valley Track → Glacier reflections',
      },
      {
        day: 4,
        title: 'Queenstown',
        desc: 'Remarkables Mountain Range → Lake Wakatipu → เช้าตรู่ Mist on the lake',
      },
      {
        day: 5,
        title: 'Milford Sound',
        desc: 'ขับรถผ่าน Fiordland → Milford Sound Cruise → น้ำตกและฝนเขตร้อน',
      },
      {
        day: 6,
        title: 'Queenstown → SYD',
        desc: 'ถ่ายภาพยามเช้าครั้งสุดท้าย → บินกลับซิดนีย์',
      },
    ],
    included: [
      'รถ SUV พร้อมคนขับ 6 วัน',
      'ที่พัก 5 คืน',
      'ช่างภาพมืออาชีพตลอดทริป',
      'Milford Sound Cruise',
      'ค่าเข้าอุทยาน',
      'น้ำดื่มตลอดทาง',
      'ช่วยจองตั๋วฟรี',
    ],
    excluded: ['ตั๋วเครื่องบินไป-กลับ', 'ค่าอาหารทุกมื้อ', 'ประกันการเดินทาง'],
    galleryPhotos: [
      `${PORTFOLIO_BASE}/New%20Zealand/Cover/01.jpg`,
      `${PORTFOLIO_BASE}/New%20Zealand/Cover/02.jpg`,
      `${PORTFOLIO_BASE}/New%20Zealand/Cover/03.jpg`,
      `${PORTFOLIO_BASE}/New%20Zealand/Cover/04.jpg`,
      `${PORTFOLIO_BASE}/New%20Zealand/Cover/05.jpg`,
      `${PORTFOLIO_BASE}/New%20Zealand/Cover/06.jpg`,
      `${PORTFOLIO_BASE}/New%20Zealand/Cover/07.jpg`,
      `${PORTFOLIO_BASE}/New%20Zealand/Cover/08.jpg`,
      `${PORTFOLIO_BASE}/New%20Zealand/Cover/09.jpg`,
      `${PORTFOLIO_BASE}/New%20Zealand/Cover/10.jpg`,
    ],
  },
  {
    tourCode: 'TAS-3D2N',
    anonymizedTitle: 'The Aurora Edge',
    tripType: 'overnight',
    standardPrice: 1350,
    privatePrice: 1650,
    durationLabel: '3 Days 2 Nights',
    season: 'winter',
    maxPax: 6,
    highlights: ['Mt Wellington Aurora Hunt', 'Bruny Island', 'MONA'],
    pickupType: 'airport_terminal',
    description: "Tasmania in winter — hunt the Southern Lights from the island's highest peak.",
  },
  {
    tourCode: 'TAS-LH-4D3N',
    anonymizedTitle: 'Lavender & Aurora Trail',
    tripType: 'overnight',
    standardPrice: 1650,
    privatePrice: 1850,
    durationLabel: '4 Days 3 Nights',
    season: 'summer',
    maxPax: 6,
    highlights: ['Bridestowe Lavender', 'Cradle Mountain', 'MONA'],
    pickupType: 'airport_terminal',
    description: 'Purple lavender fields by day, aurora hunting by night across Tasmania.',
  },
  {
    tourCode: 'KIA-1DAY',
    anonymizedTitle: 'The Coastal Cliffs',
    tripType: 'one_day',
    standardPrice: 250,
    privatePrice: 290,
    durationLabel: '1 Day',
    season: 'winter',
    maxPax: 4,
    highlights: ['Helensburgh Station', 'Seacliff Bridge', 'Bombo Headland'],
    pickupType: 'thaitown_main',
    description:
      "Sydney's most dramatic winter coastal drive — sea cliffs, basalt columns, and vintage ruins.",
  },
  {
    tourCode: 'CAN-2D1N',
    anonymizedTitle: 'The Golden Fields',
    tripType: 'overnight',
    standardPrice: 380,
    privatePrice: 380,
    durationLabel: '2 Days 1 Night',
    season: 'spring',
    maxPax: 4,
    highlights: ['Canola Fields', 'Cowra Old Town', 'Japanese Garden'],
    pickupType: 'thaitown_main',
    description:
      'Spring road trip to golden canola fields and charming country towns west of Sydney.',
  },
  {
    tourCode: 'SYD-1DAY',
    anonymizedTitle: 'Secret Sydney',
    tripType: 'one_day',
    standardPrice: 250,
    privatePrice: 680,
    durationLabel: '1 Day',
    season: 'all',
    maxPax: 4,
    highlights: ['Sydney Hidden Gems', 'Milky Way Hunt', 'Anna Bay Dunes'],
    pickupType: 'thaitown_main',
    description: "Discover Sydney's secret photography spots — from coastal cliffs to starlit skies.",
  },
];

function durationDaysFromLabel(label: string): number {
  const match = label.match(/(\d+)\s*Day/i);
  return match ? parseInt(match[1], 10) : 1;
}

function masterMetaForCode(tourCode: string) {
  return MASTER_TRIP_SEEDS.find((s) => s.tourCode.toUpperCase() === tourCode.toUpperCase());
}

export function findTourFallbackByCode(tourCode: string): TourFallback | undefined {
  const q = tourCode.trim().toUpperCase();
  return TOUR_FALLBACK_DATA.find((t) => t.tourCode.toUpperCase() === q);
}

export function tourFallbackToSheetRow(fallback: TourFallback): TripSheetRow {
  const master = masterMetaForCode(fallback.tourCode);
  const durationDays = master?.durationDays ?? durationDaysFromLabel(fallback.durationLabel);

  return {
    tourCode: fallback.tourCode,
    tourName: fallback.anonymizedTitle,
    countryTag: master?.countryTag ?? 'AU',
    weather: master?.weather ?? '',
    messengerUrl: 'https://m.me/trip2talk.chapter99',
    coverUrl: master?.coverUrl ?? '',
    spots: fallback.highlights.map((name) => ({
      spotName: name,
      proTip: '',
      mapsUrl: '',
      photoUrl: '',
      portraitGuide: '',
      landscapeGuide: '',
    })),
    seasonGroup: fallback.season === 'all' ? 'all_year' : 'seasonal',
    city: '',
    durationDays,
    priceStandardAud: fallback.standardPrice,
    pricePrivateAud: fallback.privatePrice,
    categoryCode: fallback.tourCode,
    categoryName: fallback.tripType,
    basePriceAud: fallback.standardPrice,
    depositAud: null,
    dormitoryPolicy: '',
    dormUpgradeNote: '',
    itinerary: [],
    departureStart: '',
    departureEnd: '',
    slotsBooked: null,
    slotsMax: fallback.maxPax,
    tripType: fallback.tripType,
    season: fallback.season,
    highlights: fallback.highlights.join(', '),
    pickupType: fallback.pickupType,
    maxPax: fallback.maxPax,
  };
}

export const TOUR_FALLBACK_SHEET_ROWS: TripSheetRow[] = TOUR_FALLBACK_DATA.map(tourFallbackToSheetRow);

/** Sheet rows win on duplicate tourCode; missing codes filled from fallback. */
export function mergeTripsWithFallback(sheetRows: TripSheetRow[]): TripSheetRow[] {
  const byCode = new Map<string, TripSheetRow>();
  for (const row of TOUR_FALLBACK_SHEET_ROWS) {
    byCode.set(row.tourCode.toUpperCase(), row);
  }
  for (const row of sheetRows) {
    if (row.tourCode?.trim()) {
      byCode.set(row.tourCode.trim().toUpperCase(), row);
    }
  }
  return TOUR_FALLBACK_DATA.map((fb) => byCode.get(fb.tourCode.toUpperCase())!).filter(Boolean);
}
