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

export const PORTFOLIO_TOURS: PortfolioTour[] = [
  {
    id: 'nz-aut-2026',
    tripCode: 'NZ-AUT-2026',
    title: 'New Zealand Alpine Light',
    location: 'Queenstown, NZ',
    priceAud: 1850,
    rating: 4.9,
    reviewCount: 48,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    category: 'overnight',
    duration: '7 days',
    featured: true,
  },
  {
    id: 'gc-surf-2026',
    tripCode: 'GC-SURF-2026',
    title: 'Gold Coast Golden Hour',
    location: 'Gold Coast, QLD',
    priceAud: 890,
    rating: 4.8,
    reviewCount: 32,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    category: 'one-day',
    duration: '1 day',
  },
  {
    id: 'syd-harbour-2026',
    tripCode: 'SYD-HARBOUR-2026',
    title: 'Sydney Harbour Frames',
    location: 'Sydney, NSW',
    priceAud: 720,
    rating: 4.7,
    reviewCount: 61,
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80',
    category: 'city',
    duration: '1 day',
  },
  {
    id: 'blue-mountains-wild',
    tripCode: 'BM-WILD-2026',
    title: 'Blue Mountains Wildlife Dawn',
    location: 'Katoomba, NSW',
    priceAud: 640,
    rating: 4.9,
    reviewCount: 27,
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    category: 'wildlife',
    duration: '2 days',
  },
  {
    id: 'byron-wedding',
    tripCode: 'BYRON-WED-2026',
    title: 'Byron Bay Coastal Vows',
    location: 'Byron Bay, NSW',
    priceAud: 2200,
    rating: 5,
    reviewCount: 19,
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    category: 'wedding',
    duration: '2 days',
  },
  {
    id: 'melbourne-overnight',
    tripCode: 'MEL-OVN-2026',
    title: 'Melbourne Laneways & Coast',
    location: 'Melbourne, VIC',
    priceAud: 980,
    rating: 4.6,
    reviewCount: 41,
    image: 'https://images.unsplash.com/photo-1514395462725-7b8b0e7f0870?w=800&q=80',
    category: 'overnight',
    duration: '3 days',
  },
];

export const TOUR_FILTERS: { id: TourFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'one-day', label: 'One Day' },
  { id: 'overnight', label: 'Overnight' },
  { id: 'wedding', label: 'Wedding' },
  { id: 'wildlife', label: 'Wildlife' },
  { id: 'city', label: 'City' },
];
