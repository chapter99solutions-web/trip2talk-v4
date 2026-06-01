import { findTourFallbackByCode } from '../data/tours';
import { isRealTourCode } from './realTourCodes';
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
  if (!isRealTourCode(id)) return undefined;
  const p = PORTFOLIO_TOURS.find((t) => t.id === id || t.tripCode.toLowerCase() === id.toLowerCase());
  if (p) return portfolioToTour(p);
  const fb = findTourFallbackByCode(id);
  return fb ? fallbackToTour(id) : undefined;
}

export function findTripByRef(ref: string): Tour | undefined {
  return findTripById(ref);
}
