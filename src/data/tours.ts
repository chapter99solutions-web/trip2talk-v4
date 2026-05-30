import { MASTER_TRIP_SEEDS } from '../lib/masterTrips';
import type { TripSeason, TripType } from '../lib/masterTrips';
import type { TripSheetRow } from '../lib/tripsSheetApi';

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
};

export const TOUR_FALLBACK_DATA: TourFallback[] = [
  {
    tourCode: 'MEL-4D3N',
    anonymizedTitle: 'Secret Southern Coast',
    tripType: 'overnight',
    standardPrice: 1550,
    privatePrice: 2300,
    durationLabel: '4 Days 3 Nights',
    season: 'autumn',
    maxPax: 5,
    highlights: ['Great Ocean Road', 'Pink Lake', 'Melbourne City'],
    pickupType: 'airport_terminal',
    description:
      "An immersive photography journey through Victoria's most dramatic coastal landscapes.",
  },
  {
    tourCode: 'ULU-4D3N',
    anonymizedTitle: 'The Red Desert Odyssey',
    tripType: 'overnight',
    standardPrice: 1690,
    privatePrice: 1690,
    durationLabel: '4 Days 3 Nights',
    season: 'all',
    maxPax: 5,
    highlights: ['Uluru Sunrise', 'Field of Light', 'Kata Tjuta'],
    pickupType: 'airport_terminal',
    description:
      'Chase the ancient red rock at sunrise and hunt the Milky Way in total desert darkness.',
  },
  {
    tourCode: 'NZ-6D5N',
    anonymizedTitle: 'The Alpine Kingdom',
    tripType: 'overnight',
    standardPrice: 2300,
    privatePrice: 2300,
    durationLabel: '6 Days 5 Nights',
    season: 'all',
    maxPax: 5,
    highlights: ['Lake Tekapo', 'Milford Sound', 'Wanaka', 'Mt Cook'],
    pickupType: 'airport_terminal',
    description: 'New Zealand South Island — four seasons, one epic photography adventure.',
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
