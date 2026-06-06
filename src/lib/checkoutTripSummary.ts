import { findTourFallbackByCode } from '../data/tours';
import { fetchTripAvailability } from './customerJourney';
import { PORTFOLIO_TOURS } from './portfolioTours';
import { formatTourDateRangeLabel } from './publicTours';
import { supabase } from './supabase';
import { fetchTripByCodeFromSheet } from './tripsSheetApi';

export type CheckoutTripSummary = {
  tourName: string;
  tripCode: string;
  destination: string;
  durationLabel: string;
  departureLabel: string;
  priceAud: number;
  maxPax: number;
  seatsLeft: number | null;
  coverImageUrl: string | null;
};

const FULL_TOUR_SELECT =
  'trip_code, title, anonymized_title, destination, duration_text, duration_days, trip_date, standard_price, price_aud, price_per_person, max_pax, slots_booked, slots_max, departure_start, departure_end, start_date, end_date, cover_image, cover_image_url';

const CORE_TOUR_SELECT =
  'trip_code, title, anonymized_title, destination, duration_text, price_aud, price_per_person, max_pax, slots_booked, slots_max, departure_start, departure_end, start_date, end_date, cover_image, cover_image_url';

function formatDurationDays(days: number, fallback: string): string {
  if (!Number.isFinite(days) || days <= 0) return fallback;
  const nights = Math.max(0, days - 1);
  if (nights > 0) return `${days} Days ${nights} Nights`;
  return days === 1 ? '1 Day' : `${days} Days`;
}

function nightsFromDateRange(startIso: string, endIso: string | null): number | null {
  const start = new Date(`${startIso}T00:00:00`);
  const end = endIso ? new Date(`${endIso}T00:00:00`) : null;
  if (!Number.isFinite(start.getTime())) return null;
  if (!end || !Number.isFinite(end.getTime())) return null;
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diff > 0 ? diff + 1 : null;
}

async function fetchTourRow(tripCode: string): Promise<Record<string, unknown> | null> {
  const code = tripCode.trim().toUpperCase();
  const run = async (select: string) =>
    supabase.from('tours').select(select).eq('trip_code', code).limit(1).maybeSingle();

  const full = await run(FULL_TOUR_SELECT);
  if (!full.error) return (full.data as Record<string, unknown> | null) ?? null;

  if (full.error.message.includes('does not exist')) {
    const core = await run(CORE_TOUR_SELECT);
    if (!core.error) return (core.data as Record<string, unknown> | null) ?? null;
    console.warn('[Checkout] fetchCheckoutTripSummary:', core.error.message);
    return null;
  }

  console.warn('[Checkout] fetchCheckoutTripSummary:', full.error.message);
  return null;
}

export async function fetchCheckoutTripSummary(
  tripCode: string,
): Promise<CheckoutTripSummary | null> {
  const code = tripCode.trim().toUpperCase();
  if (!code) return null;

  const [row, sheet, availability] = await Promise.all([
    fetchTourRow(code),
    fetchTripByCodeFromSheet(code).catch(() => null),
    fetchTripAvailability(code),
  ]);

  const fallback = findTourFallbackByCode(code);
  const portfolio = PORTFOLIO_TOURS.find(
    (t) => t.id === code || t.tripCode.toUpperCase() === code,
  );

  const tripCodeOut = String(row?.trip_code ?? code).trim().toUpperCase();
  const tourName =
    String(row?.title ?? '').trim() ||
    sheet?.tourName?.trim() ||
    portfolio?.title ||
    fallback?.tourName ||
    fallback?.anonymizedTitle ||
    tripCodeOut;

  const destination =
    String(row?.destination ?? '').trim() ||
    sheet?.city?.trim() ||
    sheet?.countryTag?.trim() ||
    portfolio?.location?.split('·').pop()?.trim() ||
    fallback?.location?.split('·').pop()?.trim() ||
    'Australia';

  const durationDaysRaw = Number(row?.duration_days);
  const rangeDays = nightsFromDateRange(
    String(row?.start_date ?? row?.departure_start ?? ''),
    String(row?.end_date ?? row?.departure_end ?? '') || null,
  );
  const durationLabel = formatDurationDays(
    Number.isFinite(durationDaysRaw) && durationDaysRaw > 0
      ? durationDaysRaw
      : rangeDays ?? sheet?.durationDays ?? 0,
    String(row?.duration_text ?? '').trim() ||
      portfolio?.duration ||
      fallback?.durationLabel ||
      '—',
  );

  const tripDate =
    String(row?.trip_date ?? '').trim() ||
    String(row?.departure_start ?? '').trim() ||
    availability?.departureStart ||
    sheet?.departureStart ||
    String(row?.start_date ?? '').trim() ||
    '';
  const tripDateEnd =
    String(row?.departure_end ?? '').trim() ||
    availability?.departureEnd ||
    sheet?.departureEnd ||
    String(row?.end_date ?? '').trim() ||
    null;
  const departureLabel = tripDate
    ? formatTourDateRangeLabel(tripDate, tripDateEnd)
    : 'เปิดจองเร็ว ๆ นี้ / Dates coming soon';

  const priceAud = Number(
    row?.standard_price ??
      row?.price_aud ??
      row?.price_per_person ??
      sheet?.priceStandardAud ??
      portfolio?.priceAud ??
      fallback?.standardPrice ??
      0,
  );

  const maxPax = Number(
    row?.slots_max ?? row?.max_pax ?? availability?.slotsMax ?? sheet?.slotsMax ?? sheet?.maxPax ?? fallback?.maxPax ?? 6,
  );

  const slotsBooked =
    row?.slots_booked != null
      ? Number(row.slots_booked)
      : availability?.slotsBooked != null
        ? availability.slotsBooked
        : NaN;
  const slotsMax = Number(row?.slots_max ?? availability?.slotsMax ?? NaN);
  const seatsLeft =
    availability?.seatsLeft ??
    (Number.isFinite(slotsMax) && Number.isFinite(slotsBooked)
      ? Math.max(0, slotsMax - slotsBooked)
      : null);

  const coverFromDb =
    String(row?.cover_image ?? '').trim() || String(row?.cover_image_url ?? '').trim();
  const coverImageUrl = coverFromDb || null;

  return {
    tourName,
    tripCode: tripCodeOut,
    destination,
    durationLabel,
    departureLabel,
    priceAud,
    maxPax,
    seatsLeft,
    coverImageUrl,
  };
}
