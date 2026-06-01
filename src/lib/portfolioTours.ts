import { TOUR_FALLBACK_DATA } from '../data/tours';

export type TourCategory = 'one-day' | 'overnight' | 'wedding' | 'wildlife' | 'city';

export type TourFilter = 'all' | TourCategory;

export interface PortfolioTour {
  id: string;
  tripCode: string;
  title: string;
  location: string;
  priceAud: number;
  rating: number;
  reviewCount: number;
  image: string;
  category: TourCategory;
  duration: string;
  featured?: boolean;
}

function categoryFromTripType(tripType: string): TourCategory {
  return tripType === 'one_day' ? 'one-day' : 'overnight';
}

/** One portfolio entry per real tour code (8 trips). */
export const PORTFOLIO_TOURS: PortfolioTour[] = TOUR_FALLBACK_DATA.map((fb) => ({
  id: fb.tourCode,
  tripCode: fb.tourCode,
  title: (fb.tourName ?? fb.anonymizedTitle).trim(),
  location: fb.location ?? 'Australia',
  priceAud: fb.standardPrice,
  rating: fb.rating ?? 4.8,
  reviewCount: 0,
  image: fb.galleryPhotos?.[0] ?? '',
  category: categoryFromTripType(fb.tripType),
  duration: fb.durationLabel,
  featured: fb.featured,
}));

export const TOUR_FILTERS: { id: TourFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'one-day', label: 'One Day' },
  { id: 'overnight', label: 'Overnight' },
  { id: 'wedding', label: 'Wedding' },
  { id: 'wildlife', label: 'Wildlife' },
  { id: 'city', label: 'City' },
];
