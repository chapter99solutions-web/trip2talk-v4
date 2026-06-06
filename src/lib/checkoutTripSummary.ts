import { findTourFallbackByCode } from '../data/tours';
import { fetchTripAvailability } from './customerJourney';
import { PORTFOLIO_TOURS } from './portfolioTours';
import {
  fetchAvailableTourDates,
  formatTourDateRangeLabel,
} from './publicTours';
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
  coverImageUrl: string;
};

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80';

export async function fetchCheckoutTripSummary(
  tripCode: string,
): Promise<CheckoutTripSummary | null> {
  const code = tripCode.trim().toUpperCase();
  if (!code) return null;

  const [dbRes, sheet, availability, dates] = await Promise.all([
    supabase
      .from('tours')
      .select(
        'trip_code, title, anonymized_title, destination, duration_text, price_aud, max_pax, slots_booked, slots_max, departure_start, departure_end, cover_image, cover_image_url',
      )
      .eq('trip_code', code)
      .limit(1)
      .maybeSingle(),
    fetchTripByCodeFromSheet(code).catch(() => null),
    fetchTripAvailability(code),
    fetchAvailableTourDates(code),
  ]);

  const fallback = findTourFallbackByCode(code);
  const portfolio = PORTFOLIO_TOURS.find(
    (t) => t.id === code || t.tripCode.toUpperCase() === code,
  );

  const row = dbRes.data as Record<string, unknown> | null;
  if (dbRes.error) {
    console.warn('[Checkout] fetchCheckoutTripSummary:', dbRes.error.message);
  }

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

  const durationLabel =
    String(row?.duration_text ?? '').trim() ||
    (sheet?.durationDays ? `${sheet.durationDays} Days` : '') ||
    portfolio?.duration ||
    fallback?.durationLabel ||
    '—';

  const departureStart =
    availability?.departureStart ||
    String(row?.departure_start ?? '').trim() ||
    sheet?.departureStart ||
    dates[0]?.start_date ||
    '';
  const departureEnd =
    availability?.departureEnd ||
    String(row?.departure_end ?? '').trim() ||
    sheet?.departureEnd ||
    dates[0]?.end_date ||
    null;
  const departureLabel = departureStart
    ? formatTourDateRangeLabel(departureStart, departureEnd)
    : 'เปิดจองเร็ว ๆ นี้ / Dates coming soon';

  const priceAud = Number(
    row?.price_aud ?? sheet?.priceStandardAud ?? portfolio?.priceAud ?? fallback?.standardPrice ?? 0,
  );

  const maxPax = Number(
    row?.slots_max ?? row?.max_pax ?? availability?.slotsMax ?? sheet?.slotsMax ?? sheet?.maxPax ?? fallback?.maxPax ?? 6,
  );

  const seatsLeft =
    availability?.seatsLeft ??
    (row?.slots_max != null && row?.slots_booked != null
      ? Math.max(0, Number(row.slots_max) - Number(row.slots_booked))
      : null);

  const coverImageUrl =
    String(row?.cover_image ?? '').trim() ||
    String(row?.cover_image_url ?? '').trim() ||
    sheet?.coverUrl?.trim() ||
    portfolio?.image ||
    fallback?.galleryPhotos?.[0] ||
    FALLBACK_COVER;

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
