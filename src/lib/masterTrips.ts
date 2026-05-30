import type { TripSheetRow } from './tripsSheetApi';

export type TripSeason = 'autumn' | 'winter' | 'spring' | 'summer' | 'all';
export type TripType = 'one_day' | 'overnight';

export type MasterTripSeed = {
  tourCode: string;
  tourName: string;
  countryTag: string;
  weather: string;
  standardPrice: number;
  privatePrice: number;
  tripType: TripType;
  season: TripSeason;
  durationDays: number;
  maxPax: number;
  highlights: string;
  pickupType: string;
  coverUrl?: string;
};

export const MASTER_TRIP_SEEDS: MasterTripSeed[] = [
  {
    tourCode: 'MEL-4D3N',
    tourName: 'Secret Southern Coast (4D3N)',
    countryTag: 'AU-VIC',
    weather: 'Autumn 14-18°C',
    standardPrice: 1550,
    privatePrice: 2300,
    tripType: 'overnight',
    season: 'autumn',
    durationDays: 4,
    maxPax: 5,
    highlights: 'Great Ocean Road, Pink Lake, Melbourne City',
    pickupType: 'airport_terminal',
    coverUrl: 'https://images.unsplash.com/photo-1514395462725-7b8b0e7f0870?w=1200&q=80',
  },
  {
    tourCode: 'ULU-4D3N',
    tourName: 'The Red Desert Odyssey (4D3N)',
    countryTag: 'AU-NT',
    weather: 'Desert 28°C day / 8°C night',
    standardPrice: 1690,
    privatePrice: 1690,
    tripType: 'overnight',
    season: 'all',
    durationDays: 4,
    maxPax: 5,
    highlights: 'Uluru Sunrise, Field of Light, Kata Tjuta',
    pickupType: 'airport_terminal',
    coverUrl: 'https://images.unsplash.com/photo-1523482580695-1581f6760c66?w=1200&q=80',
  },
  {
    tourCode: 'NZ-6D5N',
    tourName: 'The Alpine Kingdom (6D5N)',
    countryTag: 'NZ-SI',
    weather: 'Varies by season',
    standardPrice: 2300,
    privatePrice: 2300,
    tripType: 'overnight',
    season: 'all',
    durationDays: 6,
    maxPax: 5,
    highlights: 'Lake Tekapo, Milford Sound, Wanaka, Mt Cook',
    pickupType: 'airport_terminal',
    coverUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
  },
  {
    tourCode: 'TAS-3D2N',
    tourName: 'The Aurora Edge (3D2N)',
    countryTag: 'AU-TAS',
    weather: 'Winter 6-12°C',
    standardPrice: 1350,
    privatePrice: 1650,
    tripType: 'overnight',
    season: 'winter',
    durationDays: 3,
    maxPax: 6,
    highlights: 'Mt Wellington Aurora Hunt, Bruny Island, MONA',
    pickupType: 'airport_terminal',
    coverUrl: 'https://images.unsplash.com/photo-1483347756197-71ef7742304b?w=1200&q=80',
  },
  {
    tourCode: 'TAS-LH-4D3N',
    tourName: 'Lavender & Aurora Trail (4D3N)',
    countryTag: 'AU-TAS',
    weather: 'Summer 16-22°C',
    standardPrice: 1650,
    privatePrice: 1850,
    tripType: 'overnight',
    season: 'summer',
    durationDays: 4,
    maxPax: 6,
    highlights: 'Bridestowe Lavender, Cradle Mountain, MONA',
    pickupType: 'airport_terminal',
    coverUrl: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1200&q=80',
  },
  {
    tourCode: 'KIA-1DAY',
    tourName: 'The Coastal Cliffs (1 Day)',
    countryTag: 'AU-NSW',
    weather: 'Winter 12-16°C',
    standardPrice: 250,
    privatePrice: 290,
    tripType: 'one_day',
    season: 'winter',
    durationDays: 1,
    maxPax: 4,
    highlights: 'Helensburgh Station, Seacliff Bridge, Bombo Headland',
    pickupType: 'thaitown_main',
    coverUrl: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&q=80',
  },
  {
    tourCode: 'CAN-2D1N',
    tourName: 'The Golden Fields (2D1N)',
    countryTag: 'AU-NSW',
    weather: 'Spring 18-24°C',
    standardPrice: 380,
    privatePrice: 380,
    tripType: 'overnight',
    season: 'spring',
    durationDays: 2,
    maxPax: 4,
    highlights: 'Canola Fields, Cowra Old Town, Japanese Garden',
    pickupType: 'thaitown_main',
    coverUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
  },
  {
    tourCode: 'SYD-1DAY',
    tourName: 'Secret Sydney (1 Day)',
    countryTag: 'AU-NSW',
    weather: 'All seasons',
    standardPrice: 250,
    privatePrice: 680,
    tripType: 'one_day',
    season: 'all',
    durationDays: 1,
    maxPax: 4,
    highlights: 'Sydney Hidden Gems, Milky Way Hunt, Anna Bay Dunes',
    pickupType: 'thaitown_main',
    coverUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&q=80',
  },
];

export function masterSeedToSheetRow(seed: MasterTripSeed): TripSheetRow {
  return {
    tourCode: seed.tourCode,
    tourName: seed.tourName,
    countryTag: seed.countryTag,
    weather: seed.weather,
    messengerUrl: 'https://m.me/trip2talk.chapter99',
    coverUrl: seed.coverUrl ?? '',
    spots: [],
    seasonGroup: seed.season === 'all' ? 'all_year' : 'seasonal',
    city: '',
    durationDays: seed.durationDays,
    priceStandardAud: seed.standardPrice,
    pricePrivateAud: seed.privatePrice,
    categoryCode: seed.tourCode,
    categoryName: seed.tripType,
    basePriceAud: seed.standardPrice,
    depositAud: null,
    dormitoryPolicy: '',
    dormUpgradeNote: '',
    itinerary: [],
    departureStart: '',
    departureEnd: '',
    slotsBooked: null,
    slotsMax: seed.maxPax,
    tripType: seed.tripType,
    season: seed.season,
    highlights: seed.highlights,
    pickupType: seed.pickupType,
    maxPax: seed.maxPax,
  };
}

export function masterTripsAsSheetRows(): TripSheetRow[] {
  return MASTER_TRIP_SEEDS.map(masterSeedToSheetRow);
}

/** Payload shape for GAS POST / seed script */
export function masterSeedToGasPayload(seed: MasterTripSeed): Record<string, unknown> {
  return {
    tourCode: seed.tourCode,
    tourName: seed.tourName,
    countryTag: seed.countryTag,
    weather: seed.weather,
    standardPrice: seed.standardPrice,
    privatePrice: seed.privatePrice,
    tripType: seed.tripType,
    season: seed.season,
    durationDays: seed.durationDays,
    maxPax: seed.maxPax,
    slotsMax: seed.maxPax,
    highlights: seed.highlights,
    pickupType: seed.pickupType,
    coverUrl: seed.coverUrl ?? '',
    messengerUrl: 'https://m.me/trip2talk.chapter99',
  };
}
