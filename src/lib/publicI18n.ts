import { useI18n } from './i18n';

export const PUBLIC_STRINGS = {
  th: {
    curated_journeys: 'ทริปคัดสรรพิเศษ',
    tier_subtitle: 'Tier 1 มาตรฐาน (4–6 ท่าน) · Tier 2 ส่วนตัว (1–3 ท่าน) รับรองการเดินทาง',
    view_all_trips: 'ดูทริปทั้งหมด',
    read_reviews: '💬 อ่านรีวิวจากลูกทริป',
    portfolio_gallery: 'ผลงานถ่ายภาพ',
    filter_all: 'ทั้งหมด',
    filter_portrait: 'Portrait',
    filter_landscape: 'Landscape',
    filter_one_day: 'ทริปวันเดียว',
    filter_overnight: 'ทริปค้างคืน',
    filter_by_season: 'เตรียมตัวตามฤดู',
    book_now: 'จองทริปนี้',
    model_mode: '👗 นางแบบ',
    photographer_mode: '📷 ช่างภาพ',
    express_3d: '+A$80 รับภายใน 3 วัน',
    express_24h: '+A$150 รับพรุ่งนี้',
  },
  en: {
    curated_journeys: 'Curated journeys',
    tier_subtitle: 'Tier 1 Standard (4–6 guests) · Tier 2 Private (1–3 guests) Guaranteed',
    view_all_trips: 'View all trips',
    read_reviews: '💬 Guest reviews',
    portfolio_gallery: 'Photography portfolio',
    filter_all: 'All',
    filter_portrait: 'Portrait',
    filter_landscape: 'Landscape',
    filter_one_day: 'One Day Trip',
    filter_overnight: 'Overnight Trip',
    filter_by_season: 'By Season',
    book_now: 'Book this trip',
    model_mode: '👗 Model',
    photographer_mode: '📷 Photographer',
    express_3d: '+A$80 · 3-day delivery',
    express_24h: '+A$150 · next-day delivery',
  },
} as const;

export function usePublicStrings() {
  const { lang } = useI18n();
  return PUBLIC_STRINGS[lang === 'TH' ? 'th' : 'en'];
}
