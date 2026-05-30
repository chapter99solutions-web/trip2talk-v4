import type { TripSheetRow } from './tripsSheetApi';
import type { TripSeason } from './masterTrips';

export type TripDatePill = {
  id: string;
  label: string;
  tourCodes: string[];
};

function parseFlexibleDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const dm = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (dm) {
    const day = Number(dm[1]);
    const month = Number(dm[2]) - 1;
    let year = Number(dm[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDatePillLabel(startRaw?: string, endRaw?: string): string {
  const start = startRaw ? parseFlexibleDate(startRaw) : null;
  const end = endRaw ? parseFlexibleDate(endRaw) : null;
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (start && end) return `${fmt(start)} - ${fmt(end)}`;
  if (start) return fmt(start);
  return 'Flexible dates';
}

export function countryFlagEmoji(countryTag: string): string {
  const s = (countryTag || '').toUpperCase();
  if (s.includes('NZ') || s.includes('NEW ZEALAND')) return '🇳🇿';
  if (s.includes('AU') || s.includes('TAS') || s.includes('SYD') || s.includes('MEL') || s.includes('AUSTRALIA')) {
    return '🇦🇺';
  }
  return '🌏';
}

/** Anonymized region — no city or landmark names. */
export function tripRegionBadge(countryTag: string): string {
  const tag = (countryTag || '').trim().toUpperCase();
  if (tag.startsWith('NZ')) return `${countryFlagEmoji(tag)} New Zealand`;
  if (tag.includes('VIC')) return `${countryFlagEmoji(tag)} Australia · South`;
  if (tag.includes('NT')) return `${countryFlagEmoji(tag)} Australia · Outback`;
  if (tag.includes('TAS')) return `${countryFlagEmoji(tag)} Australia · Island`;
  if (tag.includes('NSW')) return `${countryFlagEmoji(tag)} Australia · East`;
  if (tag.includes('AU')) return `${countryFlagEmoji(tag)} Australia`;
  return `${countryFlagEmoji(tag)} Trip2Talk`;
}

export function tripDurationBadge(days: number, tripType?: string): string {
  const d = Math.max(1, days || 1);
  if (tripType === 'one_day' || d === 1) return '1 Day';
  if (d === 2) return '2D1N';
  if (d === 3) return '3D2N';
  if (d === 4) return '4D3N';
  if (d === 6) return '6D5N';
  return `${d}D${d - 1}N`;
}

export function tripDurationLabel(days: number): string {
  return tripDurationBadge(days);
}

export function tripSeasonBadge(season: TripSeason | '' | undefined): string {
  switch (season) {
    case 'autumn':
      return '🍂 Autumn';
    case 'winter':
      return '❄️ Winter';
    case 'spring':
      return '🌸 Spring';
    case 'summer':
      return '☀️ Summer';
    case 'all':
    default:
      return '🗓️ All Year';
  }
}

export function tripMaxPaxLabel(tour: TripSheetRow): string {
  const max = tour.maxPax ?? tour.slotsMax ?? 5;
  return `max ${max} pax`;
}

export function tripPriceFromLabel(tour: TripSheetRow): string {
  const price = tour.priceStandardAud ?? tour.basePriceAud;
  if (price == null) return '';
  return `from $${price.toLocaleString('en-AU')} AUD/person`;
}

export function tripCapacityLabel(tour: TripSheetRow): string {
  return tripMaxPaxLabel(tour);
}

export function buildTripDatePills(trips: TripSheetRow[]): TripDatePill[] {
  const all: TripDatePill = { id: 'all', label: 'All dates', tourCodes: trips.map((t) => t.tourCode) };
  if (!trips.length) return [all];

  const byRange = new Map<string, TripDatePill>();
  for (const t of trips) {
    const label = formatDatePillLabel(t.departureStart, t.departureEnd);
    const key = `${label}::${t.departureStart || ''}::${t.departureEnd || ''}`;
    const existing = byRange.get(key);
    if (existing) {
      existing.tourCodes.push(t.tourCode);
    } else {
      byRange.set(key, {
        id: key,
        label,
        tourCodes: [t.tourCode],
      });
    }
  }

  const rangePills = Array.from(byRange.values());
  if (rangePills.length <= 1) return [all, ...rangePills];
  return [all, ...rangePills];
}

export function filterTripsByDatePill(trips: TripSheetRow[], pill: TripDatePill): TripSheetRow[] {
  if (pill.id === 'all') return trips;
  const set = new Set(pill.tourCodes);
  return trips.filter((t) => set.has(t.tourCode));
}
