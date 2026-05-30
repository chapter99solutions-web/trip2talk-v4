import { findTourFallbackByCode } from '../data/tours';
import { Tour } from '../types/tour';
import { PORTFOLIO_TOURS, PortfolioTour } from './portfolioTours';

function portfolioToTour(p: PortfolioTour): Tour {
  return {
    id: p.id,
    trip_code: p.tripCode,
    destination: p.location.split(',')[0] as Tour['destination'],
    start_date: '2026-06-01',
    end_date: '2026-06-08',
    price_aud: p.priceAud,
    max_pax: 6,
    current_pax: 4,
    status: 'CONFIRMED',
    base_commission_rate: 50,
    bonus_threshold_pax: 5,
    bonus_amount_aud: 200,
  };
}

/** Demo trips for public pages until Supabase seed is wired. */
export const DEMO_TRIPS: Tour[] = [
  {
    id: 'nz-aut-2026',
    trip_code: 'NZ-AUT-2026',
    destination: 'New Zealand',
    start_date: '2026-06-15',
    end_date: '2026-06-22',
    price_aud: 1850,
    max_pax: 6,
    current_pax: 4,
    status: 'CONFIRMED',
    base_commission_rate: 50,
    bonus_threshold_pax: 5,
    bonus_amount_aud: 200,
  },
  {
    id: 'gc-surf-2026',
    trip_code: 'GC-SURF-2026',
    destination: 'Gold Coast',
    start_date: '2026-07-01',
    end_date: '2026-07-05',
    price_aud: 890,
    max_pax: 6,
    current_pax: 3,
    status: 'CONFIRMED',
    base_commission_rate: 40,
    bonus_threshold_pax: 5,
    bonus_amount_aud: 150,
  },
];

function fallbackToTour(code: string): Tour {
  const fb = findTourFallbackByCode(code)!;
  return {
    id: fb.tourCode,
    trip_code: fb.tourCode,
    destination: 'Sydney',
    start_date: '2026-06-01',
    end_date: '2026-06-08',
    price_aud: fb.standardPrice,
    max_pax: fb.maxPax,
    current_pax: 1,
    status: 'CONFIRMED',
    base_commission_rate: 50,
    bonus_threshold_pax: 5,
    bonus_amount_aud: 200,
  };
}

export function findTripById(id: string): Tour | undefined {
  const fromDemo = DEMO_TRIPS.find(
    (t) => t.id === id || t.trip_code.toLowerCase() === id.toLowerCase()
  );
  if (fromDemo) return fromDemo;
  const p = PORTFOLIO_TOURS.find((t) => t.id === id || t.tripCode.toLowerCase() === id.toLowerCase());
  if (p) return portfolioToTour(p);
  const fb = findTourFallbackByCode(id);
  return fb ? fallbackToTour(id) : undefined;
}

export function findTripByRef(ref: string): Tour | undefined {
  return DEMO_TRIPS.find(
    (t) => t.trip_code.toLowerCase() === ref.toLowerCase() || t.id === ref.toLowerCase()
  );
}
