import { MASTER_TRIP_SEEDS } from '../lib/masterTrips';
import type { TripSeason, TripType } from '../lib/masterTrips';
import type { TripSheetRow } from '../lib/tripsSheetApi';

export type ItineraryDay = {
  day: number;
  title: string;
  desc: string;
};

/** A selectable sub-package within a trip (different scope/price options). */
export type SubPackage = {
  name: string;
  detail: string;
  price: string;
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
  /** Portfolio bucket folder whose images auto-populate the gallery at runtime (overrides galleryPhotos for the strip; galleryPhotos[0] stays the hero/cover). */
  galleryFolder?: string;
  /** Selectable sub-packages (different scope/price options). Renders a dedicated "Packages" section in TourDetail when present. */
  subPackages?: SubPackage[];
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
      `${PORTFOLIO_BASE}/New%20Zealand/Spring/T2T-10.JPG`,
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
    tourName: 'The Aurora Edge (3D2N)',
    nameTh:
      'ทริปพร้อมช่างภาพ สัมผัสประวัติศาสตร์ ศิลปะ และตามล่าแสงใต้เมือง Hobart (Tasmania Mini Aurora Hunt)',
    location: 'AU · AUSTRALIA · TASMANIA',
    tripType: 'overnight',
    standardPrice: 1350,
    privatePrice: 1600,
    durationLabel: '3 Days 2 Nights',
    season: 'winter',
    maxPax: 6,
    rating: 4.8,
    nextDate: '2026-03-16',
    endDate: '2026-03-18',
    category: 'ทริปค้างคืน',
    highlights: ['Mt Wellington Aurora Hunt', 'Bruny Island', 'MONA'],
    highlightIcons: ['🌌', '🏝️', '🎨'],
    pickupType: 'airport_terminal',
    description:
      'ร่วมเดินทางไปกับทริปส่วนตัวสุด Exclusive ที่ออกแบบมาเพื่อกลุ่มเพื่อนและครอบครัว สัมผัสเสน่ห์ของเกาะแทสเมเนียในแบบพรีเมียม ตั้งแต่สถาปัตยกรรมหินทรายอันเป็นตำนาน ไปจนถึงความมหัศจรรย์ของแสงออโรร่าบนยอดเขาที่สูงที่สุดในฮอบาร์ต พักดีไซน์โฮมสุดชิค เดินทางสบายไม่เร่งรีบ',
    itinerary: [
      {
        day: 1,
        title: 'Port Arthur → Mt. Wellington Aurora Hunt',
        desc: 'นั่งรถ Private SUV มุ่งสู่ Port Arthur Historic Site → บ่ายเดิน Hobart Market → เย็นขึ้นยอดเขา Mt. Wellington ชมพระอาทิตย์ตกและล่าแสงออโรร่า พัก Design Home Airbnb',
      },
      {
        day: 2,
        title: 'Bruny Island Full Day',
        desc: 'นั่งเฟอร์รี่ลุยเกาะ Bruny Island เต็มวัน → The Neck + Bruny Lighthouse → แวะฟาร์มหอยนางรม (Optional) → ค่ำลุ้นล่าแสงใต้รอบสอง พัก Design Home Airbnb',
      },
      {
        day: 3,
        title: 'MONA → Waterfront → SYD',
        desc: 'เช้าเข้า MONA → มื้อเที่ยงเดินเล่น Waterfront → บ่ายเดินทางสู่สนามบิน บินกลับซิดนีย์',
      },
    ],
    included: [
      'รถ Private SUV + คนขับ',
      'ช่างภาพมืออาชีพ',
      'น้ำดื่ม',
      'ค่าเข้าสถานที่ตามแพลน',
      'ประสานงานจองตั๋วเครื่องบิน',
    ],
    excluded: ['ตั๋วเครื่องบิน', 'อาหารทุกมื้อ', 'ประกันการเดินทาง'],
    accommodation:
      'พักร่วมกันแบบ Dormitory/Design Airbnb อัปเกรดห้องส่วนตัวเพิ่ม $350-$550 AUD/คืน',
    galleryPhotos: [
      `${PORTFOLIO_BASE}/Tasmania/CT99-12.JPG`,
    ],
  },
  {
    tourCode: 'TAS-LH-4D3N',
    anonymizedTitle: 'Lavender & Aurora Trail',
    tourName: 'Tasmania Summer: Launceston – Hobart (4D3N)',
    nameTh:
      'ทริปพร้อมช่างภาพ สัมผัสประวัติศาสตร์ ศิลปะ และตามล่าแสงใต้ (Tasmania Summer: Launceston - Hobart)',
    location: 'AU · AUSTRALIA · TASMANIA',
    tripType: 'overnight',
    standardPrice: 1650,
    privatePrice: 1850,
    durationLabel: '4 Days 3 Nights',
    season: 'summer',
    maxPax: 6,
    rating: 4.8,
    nextDate: '2026-03-18',
    endDate: '2026-03-21',
    weather: 'Summer 12–22°C',
    category: 'ทริปค้างคืน',
    highlights: ['Bridestowe Lavender', 'Cradle Mountain', 'MONA'],
    highlightIcons: ['💜', '🏔️', '🎨'],
    seatsLeft: 4,
    pickupType: 'airport_terminal',
    description:
      'Tasmania Summer: ครั้งหนึ่งที่ เลนส์ จะเปลี่ยนโลกของคุณ มกราคม-มีนาคมนี้คือช่วงที่แสงสวยที่สุดของปีในแทสเมเนีย มาร่วมทริปที่คัดสรรมาเพื่อคนรักกล้องโดยเฉพาะ โดยมีช่างภาพเป็น Mentor คอยแนะนำเทคนิคหน้างานแบบชิดใกล้',
    itinerary: [
      {
        day: 1,
        title: 'Bridestowe Lavender → Richmond → Aurora Hunt',
        desc: 'ลุยทุ่งลาเวนเดอร์ Bridestowe → Richmond Bridge → ค่ำล่าแสงใต้ Aurora Hunt พร้อมสอนตั้งค่ากล้อง',
      },
      {
        day: 2,
        title: 'Cradle Mountain Full Day',
        desc: 'Cradle Mountain เต็มวัน รอ Reflection → ถ่ายป่าโบราณและสัตว์ป่า → Aurora Mission Night 2',
      },
      {
        day: 3,
        title: 'MONA → Hobart → Mt. Wellington',
        desc: 'MONA → Hobart Market → Cascade Brewery → Mt. Wellington Golden Hour + Aurora Hunt ส่งท้าย',
      },
      {
        day: 4,
        title: 'Last Capture → SYD',
        desc: 'Last Capture เช้าเมืองโฮบาร์ต → Waterfront → บินกลับซิดนีย์',
      },
    ],
    included: [
      'รถ + คนขับ Launceston-Hobart',
      'ช่างภาพ Mentor',
      'น้ำดื่ม',
      'ค่าเข้าสถานที่ทั้งหมด (รวมตั๋วลาเวนเดอร์ + MONA)',
    ],
    excluded: ['ตั๋วเครื่องบิน', 'อาหารทุกมื้อ', 'ประกันการเดินทาง'],
    accommodation: 'Dormitory/Hostel/Motel อัปเกรดห้องเดี่ยวเพิ่ม $250-$550 AUD/คืน',
    galleryPhotos: [
      `${PORTFOLIO_BASE}/Tasmania/CT99-12.JPG`,
      `${PORTFOLIO_BASE}/Tasmania/CT99-201.JPG`,
      `${PORTFOLIO_BASE}/Tasmania/CT99-446.JPG`,
    ],
  },
  {
    tourCode: 'KIA-1DAY',
    anonymizedTitle: 'The Coastal Cliffs',
    tourName: 'Sydney – Kiama One Day Photo Trip (1 Day)',
    nameTh: 'ทริปถ่ายภาพวันเดียว ซิดนีย์ - คิอามา (Sydney - Kiama One Day Photo Trip)',
    location: 'Sydney - Kiama, NSW',
    tripType: 'one_day',
    standardPrice: 250,
    privatePrice: 250,
    durationLabel: '1 Day',
    season: 'winter',
    maxPax: 4,
    rating: 4.8,
    departureLabel: 'Winter Only · 08:00 - 19:00',
    weather: 'Winter 8–17°C',
    category: 'ทริปวันเดียว',
    tagline:
      'เปิดเฉพาะฤดูหนาว (Winter only) · ออกเดินทาง 08:00 - 19:00 · Peak Season (27 ธ.ค. - 5 ม.ค.) $290 AUD/ท่าน',
    highlights: ['Helensburgh Old Station', 'Seacliff Bridge', 'Bombo Headland Quarry'],
    highlightIcons: ['🚉', '🌉', '🪨'],
    seatsLeft: 4,
    pickupType: 'thaitown_main',
    description:
      'เที่ยวตามรอยสายลมและแสงแดด ไปกับทริปถ่ายภาพสุดประทับใจใกล้ซิดนีย์ สัมผัสธรรมชาติและมุมถ่ายรูปสุด Unseen รับประกันความคุ้มค่า ไม่ต้องขับรถเอง มีรูปโปรไฟล์สวยปังกลับบ้านแน่นอน!',
    itinerary: [
      {
        day: 1,
        title: 'ตารางทริปวันเดียว (08:00 - 19:00)',
        desc: '08:00 รับสมาชิก Sydney Thai Town มุ่งหน้าลงใต้ → ช่วงเช้า Helensburgh Old Station (สถานีร้าง วินเทจ), Stanwell Tops Lookout, Seacliff Bridge → ช่วงบ่าย-เย็น Bombo Headland Quarry เสาหินโบราณ รอแสง Twilight → 19:00 ส่งกลับ Sydney Thai Town',
      },
    ],
    included: [
      'รับ-ส่ง Sydney Thai Town',
      'รถ + คนขับ',
      'ช่างภาพมืออาชีพ',
      'น้ำดื่มตลอดวัน',
    ],
    excluded: ['อาหารและเครื่องดื่ม', 'ประกันการเดินทาง'],
    galleryPhotos: [
      `${PORTFOLIO_BASE}/One%20day%20trip%20SYD/705320467_10242162489108855_3820285517745745334_n.jpg`,
    ],
    galleryFolder: 'One day trip SYD',
  },
  {
    tourCode: 'CAN-2D1N',
    anonymizedTitle: 'The Golden Fields',
    tourName: 'Cowra & Canowindra Canola Fields Photo Trip (2D1N)',
    nameTh:
      'ทริปถ่ายภาพทุ่งคาโนล่า 2 วัน 1 คืน (Cowra & Canowindra Canola Fields Photo Trip)',
    location: 'Cowra & Canowindra, NSW',
    tripType: 'overnight',
    standardPrice: 380,
    privatePrice: 380,
    durationLabel: '2 Days 1 Night',
    season: 'spring',
    maxPax: 4,
    rating: 4.8,
    nextDate: '2026-10-05',
    endDate: '2026-10-06',
    departureLabel: 'Spring Only · 5 Oct & 14 Oct 2026',
    weather: 'Spring 10–22°C',
    category: 'ทริปค้างคืน',
    tagline:
      'เปิดเฉพาะฤดูใบไม้ผลิ (Spring only) · รอบเดินทาง 5 ต.ค. & 14 ต.ค. 2026 · งบสบายกระเป๋า ไม่ต้องขับรถเอง',
    highlights: ['ทุ่งดอกคาโนล่า', 'Cowra & Canowindra เมืองเก่า', 'Cowra Japanese Garden'],
    highlightIcons: ['🌼', '🏘️', '🌸'],
    seatsLeft: 4,
    pickupType: 'thaitown_main',
    description:
      'ทริปเก็บภาพประทับใจ ณ ทุ่งคาโนล่าสีเหลืองอร่ามบานสะพรั่งเต็มท้องทุ่ง จัดให้แบบครบจบในงบสบายกระเป๋า ไม่ต้องเหนื่อยขับรถเอง โร้ดทริปกลุ่มขนาดเล็กเป็นกันเอง มีช่างภาพร่วมเดินทางดูแลชี้จุดและแนะนำมุมกล้องตลอดเส้นทาง',
    itinerary: [
      {
        day: 1,
        title: 'ทุ่งคาโนล่า & เมืองเก่า',
        desc: 'ออกจากซิดนีย์ → แวะถ่ายทุ่งคาโนล่าพิกัดลับตามเส้นทาง → เดินเล่นย่านเมืองเก่า Cowra & Canowindra → พักค้างคืน',
      },
      {
        day: 2,
        title: 'สวนญี่ปุ่น & ทุ่งรอบเช้า',
        desc: 'ถ่ายภาพ Cowra Japanese Garden (Optional) → ทุ่งคาโนล่ารอบเช้า → เดินทางกลับซิดนีย์',
      },
    ],
    included: [
      'ที่พัก 1 คืน (ห้องรวม)',
      'รถ + คนขับ + น้ำมัน',
      'ช่างภาพมืออาชีพ',
      'น้ำดื่มตลอดทริป',
    ],
    excluded: [
      'อาหารทุกมื้อ',
      'ค่าเข้า Cowra Japanese Garden',
      'ค่าบอลลูน (กิจกรรมเสริม)',
      'ประกันการเดินทาง',
    ],
    accommodation: 'Dormitory/Backpackers/Motel อัปเกรดห้องเดี่ยวเพิ่ม $150-$350 AUD/คืน',
    galleryPhotos: [`${PORTFOLIO_BASE}/Cowra/12%20(1).jpg`],
    galleryFolder: 'Cowra',
  },
  {
    tourCode: 'SYD-1DAY',
    anonymizedTitle: 'Secret Sydney',
    tourName: 'One Day Trip in Sydney & Photoshoot Packages (1 Day)',
    nameTh:
      'แพ็กเกจทริปถ่ายภาพซิดนีย์ 1 วันเต็ม (One Day Trip in Sydney & Photoshoot Packages)',
    location: 'Sydney & surrounds, NSW',
    tripType: 'one_day',
    standardPrice: 250,
    privatePrice: 250,
    durationLabel: '1 Day',
    season: 'all',
    maxPax: 4,
    rating: 4.8,
    departureLabel: 'All seasons · 08:00 - 18:00 (Milky Way: Winter only, 18:00 - 23:00)',
    weather: 'All seasons',
    category: 'ทริปวันเดียว',
    tagline:
      'เริ่มต้น $250/ท่าน · มัดจำ $100 (No Refund Policy) · เวลา 08:00 - 18:00 (Milky Way: เฉพาะฤดูหนาว 18:00 - 23:00)',
    highlights: ['Sydney 5 Best Locations', 'Anna Bay Sand Dunes', 'Milky Way Hunt', 'Kiama Coast'],
    highlightIcons: ['📸', '🏜️', '🌌', '🌊'],
    seatsLeft: 4,
    pickupType: 'thaitown_main',
    description:
      'เปิดประสบการณ์การเดินทางถ่ายรูปสุดพิเศษในซิดนีย์ กับแพ็กเกจหลากหลายสไตล์ ไม่ต้องขับรถเอง มีตากล้องมืออาชีพพร้อมโดรนคอยบันทึกภาพ การันตีรูปโปรไฟล์ปังจน Instagram ลุกเป็นไฟ!',
    subPackages: [
      {
        name: '1. Influencer Photoshoot',
        detail:
          '5 locations Sydney South & North · 3 hrs · unlimited outfit changes (เปลี่ยนชุดได้ไม่จำกัด)',
        price: '$680 AUD/person',
      },
      {
        name: '2. Sydney - Anna Bay',
        detail: 'Long Jetty + Catherine Hill Bay + Anna Bay sand dunes',
        price: 'from $250 AUD',
      },
      {
        name: '3. Sydney - Kiama',
        detail: 'Old Helensburgh Station + Seacliff Bridge + Bombo Headland',
        price: 'from $250 AUD',
      },
      {
        name: '4. Milky Way Hunt',
        detail: 'Winter only · 18:00 - 23:00 · dark sky portrait + Milky Way',
        price: 'from $250 AUD',
      },
    ],
    included: ['รถ + คนขับ', 'ช่างภาพมืออาชีพ', 'โดรน', 'น้ำดื่ม'],
    excluded: ['อาหาร', 'ประกันการเดินทาง'],
    galleryPhotos: [
      `${PORTFOLIO_BASE}/SYDNEY/506861557_10236863821565478_6038697174671264606_n.jpg`,
    ],
    galleryFolder: 'SYDNEY',
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
