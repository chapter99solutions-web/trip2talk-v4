import type { TripSheetRow } from './tripsSheetApi';

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

export function tripRegionBadge(countryTag: string, tourName: string): string {
  const tag = (countryTag || '').trim();
  let region = tag;
  if (tag.includes('·')) region = tag.split('·').pop()?.trim() || tag;
  else if (tag.includes('—')) region = tag.split('—')[0]?.trim() || tag;
  else if (tag.includes('-')) region = tag.split('-')[0]?.trim() || tag;
  if (!region) region = tourName.split(' ')[0] || 'Trip2Talk';
  return `${countryFlagEmoji(tag)} ${region.toUpperCase()}`;
}

export function tripDurationLabel(days: number): string {
  const d = Math.max(1, days || 1);
  return `${d} day${d === 1 ? '' : 's'}`;
}

export function tripCapacityLabel(tour: TripSheetRow): string {
  const max = tour.slotsMax ?? 5;
  const booked = tour.slotsBooked ?? Math.min(max - 1, 4);
  return `${booked}/${max} People`;
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
