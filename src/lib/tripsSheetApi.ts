import { masterTripsAsSheetRows } from './masterTrips';
import { MOCK_CUSTOMER_BOOKINGS } from './mockBookings';
import { forwardSheetPayload } from './syncPipeline';
import type { TripSeason, TripType } from './masterTrips';

const GAS_WEBAPP_URL =
  (import.meta.env.VITE_GAS_WEBAPP_URL as string | undefined)?.trim() || '';

function requireGasUrl(): string {
  if (!GAS_WEBAPP_URL) throw new Error('Missing VITE_GAS_WEBAPP_URL');
  return GAS_WEBAPP_URL;
}

function parseGasError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const o = payload as Record<string, unknown>;
  if (o.status === 'error') {
    return asString(o.message || o.error).trim() || 'GAS returned an error';
  }
  if (o.ok === false) {
    return asString(o.message || o.error).trim() || 'GAS returned an error';
  }
  return null;
}

/** GAS health ping when sheet param is ignored — not trip rows. */
function isGasHealthPing(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const o = payload as Record<string, unknown>;
  const data = o.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const inner = data as Record<string, unknown>;
  return (
    typeof inner.status === 'string' &&
    inner.status.toLowerCase().includes('gas running') &&
    !Array.isArray(inner.trips) &&
    !Array.isArray(inner.rows)
  );
}

function rowsFromHeaderTable(rows: unknown[][]): Record<string, unknown>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => asString(h).trim());
  return rows.slice(1).map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      if (!header) return;
      const key = header
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .replace(/_+/g, '_');
      const camel = key
        .split('_')
        .map((part, idx) =>
          idx === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join('');
      obj[camel || header] = row[i];
      obj[header] = row[i];
    });
    return obj;
  });
}

export type TripSpotRow = {
  spotName: string;
  proTip: string;
  mapsUrl: string;
  photoUrl: string;
  portraitGuide: string;
  landscapeGuide: string;
};

export type ItinerarySlotId = 'morning' | 'afternoon' | 'evening' | 'night';

export type TripItineraryDay = {
  dayNumber: number; // 1..4
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
};

export type TripSheetRow = {
  tourCode: string;
  tourName: string;
  countryTag: string;
  weather: string;
  messengerUrl: string;
  coverUrl: string;
  spots: TripSpotRow[];
  seasonGroup: 'all_year' | 'seasonal';

  // Multi-day / road trip support
  city: string; // for weather widget
  durationDays: number; // 1..4
  priceStandardAud: number | null;
  pricePrivateAud: number | null;
  // Category-style packages (e.g., SYD-1DAY)
  categoryCode: string;
  categoryName: string;
  basePriceAud: number | null;
  depositAud: number | null;
  dormitoryPolicy: string;
  dormUpgradeNote: string;
  itinerary: TripItineraryDay[];

  /** Optional departure window for public date pills (DD/MM/YYYY or ISO). */
  departureStart: string;
  departureEnd: string;
  slotsBooked: number | null;
  slotsMax: number | null;

  tripType: TripType | '';
  season: TripSeason | '';
  highlights: string;
  pickupType: string;
  maxPax: number | null;
};

export type CustomerBookingRow = {
  bookingId: string;
  customerName: string;
  tourCode: string;
  tourName: string;
  phone: string;
  pickupLocation: string;
  pickupDisplay: string;
  tourDate: string;
  departTime: string;
  guests: number | null;
  totalAmount: number | null;
  fbChatUrl: string;
  notes: string;
};

export type ConsentStatus = 'CHECKED_IN';

export type ConsentLogRow = {
  timestampIso: string;
  bookingId: string;
  customerName: string;
  tourCode: string;
  consentStatus: ConsentStatus;
};

export type ClientIntakePayload = {
  bookingId: string;
  tourCode: string;
  fullName: string;
  dob: string;
  emergencyName: string;
  emergencyPhone: string;
  dietary: string[];
  dietaryOther: string;
  medical: string;
  motionSickness: string;
  photoStyle: string[];
};

export type BookingStatusPayload = {
  bookingId: string;
  tourCode: string;
  customerName: string;
  bookingStatus: string;
  intakeStatus: string;
  checkedIn: boolean;
};

export type CreateBookingInput = {
  bookingId: string;
  tourCode: string;
  customerName: string;
  bookingStatus?: string;
};

export type CreateBookingResult = {
  success: boolean;
  bookingId: string;
  intakeStatus?: string;
  portalLink: string;
  error?: string;
};

export type PendingIntakeRow = {
  bookingId: string;
  tourCode: string;
  customerName: string;
  bookingStatus: string;
};

function asString(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = asString(v).replace(/[,$\s]/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function clampInt(n: number, min: number, max: number) {
  const x = Math.round(n);
  return Math.max(min, Math.min(max, x));
}

function normalizeSeasonGroup(raw: unknown): 'all_year' | 'seasonal' {
  const s = asString(raw).trim().toLowerCase();
  if (!s) return 'all_year';
  if (s.includes('season')) return 'seasonal';
  if (s.includes('all')) return 'all_year';
  if (s.includes('year')) return 'all_year';
  // fallback: treat unknown as all-year (safer for public display)
  return 'all_year';
}

function normalizeDurationDays(raw: unknown): number {
  const n = asNumber(raw);
  if (n == null) return 1;
  return clampInt(n, 1, 7);
}

function normalizeTripType(raw: unknown, durationDays: number): TripType {
  const s = asString(raw).trim().toLowerCase();
  if (s === 'one_day' || s === 'one-day' || s === 'day') return 'one_day';
  if (s === 'overnight') return 'overnight';
  return durationDays > 1 ? 'overnight' : 'one_day';
}

function normalizeSeason(raw: unknown): TripSeason | '' {
  const s = asString(raw).trim().toLowerCase();
  if (s === 'autumn' || s === 'winter' || s === 'spring' || s === 'summer' || s === 'all') {
    return s;
  }
  return '';
}

function extractCity(countryTag: string): string {
  // Examples:
  // "AU · Sydney" → "Sydney"
  // "Melbourne — Tasmania" → "Melbourne"
  // "NZ" → "NZ"
  const s = (countryTag || '').trim();
  if (!s) return 'Sydney';
  if (s.includes('·')) return s.split('·').pop()?.trim() || s;
  if (s.includes('-')) return s.split('-')[0]?.trim() || s;
  if (s.includes('—')) return s.split('—')[0]?.trim() || s;
  if (s.includes(',')) return s.split(',')[0]?.trim() || s;
  return s;
}

function normalizeItinerary(rawTrip: Record<string, unknown>): TripItineraryDay[] {
  const raw = rawTrip.itinerary ?? rawTrip.Itinerary ?? rawTrip['Itinerary'];
  if (Array.isArray(raw)) {
    return raw
      .slice(0, 4)
      .map((d, idx) => {
        const o = (d ?? {}) as Record<string, unknown>;
        return {
          dayNumber: clampInt(asNumber(o.dayNumber ?? o.day ?? o['Day']) ?? idx + 1, 1, 4),
          morning: asString(o.morning ?? o['Morning']).trim(),
          afternoon: asString(o.afternoon ?? o['Afternoon']).trim(),
          evening: asString(o.evening ?? o['Evening']).trim(),
          night: asString(o.night ?? o['Night'] ?? o.milkyWay ?? o['Milky Way']).trim(),
        };
      })
      .filter((d) => d.morning || d.afternoon || d.evening || d.night);
  }

  // Column-style fallbacks (Day 1 Morning, day1_morning, etc.)
  const days: TripItineraryDay[] = [];
  for (let i = 1; i <= 4; i++) {
    const morning = asString(
      rawTrip[`day${i}Morning`] ??
        rawTrip[`day${i}_morning`] ??
        rawTrip[`Day ${i} Morning`] ??
        rawTrip[`D${i} Morning`]
    ).trim();
    const afternoon = asString(
      rawTrip[`day${i}Afternoon`] ??
        rawTrip[`day${i}_afternoon`] ??
        rawTrip[`Day ${i} Afternoon`] ??
        rawTrip[`D${i} Afternoon`]
    ).trim();
    const evening = asString(
      rawTrip[`day${i}Evening`] ??
        rawTrip[`day${i}_evening`] ??
        rawTrip[`Day ${i} Evening`] ??
        rawTrip[`D${i} Evening`]
    ).trim();
    const night = asString(
      rawTrip[`day${i}Night`] ??
        rawTrip[`day${i}_night`] ??
        rawTrip[`Day ${i} Night`] ??
        rawTrip[`D${i} Night`] ??
        rawTrip[`Day ${i} Milky Way`] ??
        rawTrip[`day${i}MilkyWay`]
    ).trim();

    if (morning || afternoon || evening || night) {
      days.push({ dayNumber: i, morning, afternoon, evening, night });
    }
  }
  return days;
}

function normalizeTripRow(raw: unknown): TripSheetRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const tourCode =
    asString(r.tourCode || r.tour_code || r.tripCode || r.trip_code || r['Tour Code'] || r['tour_code']).trim();
  if (!tourCode) return null;

  const spotsRaw = (r.spots ?? r.Spots ?? []) as unknown;
  const spotsArr = Array.isArray(spotsRaw) ? spotsRaw : [];

  const spots: TripSpotRow[] = spotsArr
    .slice(0, 4)
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return {
        spotName: asString(o.spotName || o.name || o['Spot Name']).trim(),
        proTip: asString(o.proTip || o.pro_tip || o['Pro Tip']).trim(),
        mapsUrl: asString(o.mapsUrl || o.maps_url || o['Maps']).trim(),
        photoUrl: asString(o.photoUrl || o.photo_url || o['Photo']).trim(),
        portraitGuide: asString(o.portraitGuide || o.portrait_guide || o['Portrait Guide'] || o['Portrait']).trim(),
        landscapeGuide: asString(o.landscapeGuide || o.landscape_guide || o['Landscape Guide'] || o['Landscape']).trim(),
      };
    })
    .filter((s) => s.spotName || s.photoUrl || s.mapsUrl || s.proTip || s.portraitGuide || s.landscapeGuide);

  const countryTag = asString(r.countryTag || r.country_tag || r['Country Tag']).trim();
  const itinerary = normalizeItinerary(r);
  const durationDays = normalizeDurationDays(r.durationDays || r.duration_days || r.days || r['Duration Days'] || r['Days']);
  const season = normalizeSeason(r.season || r.Season || r['Season']);
  const tripType = normalizeTripType(r.tripType || r.trip_type || r['Trip Type'] || r.categoryName, durationDays);

  return {
    tourCode,
    tourName: asString(r.tourName || r.tour_name || r['Tour Name']).trim(),
    countryTag,
    weather: asString(r.weather || r['Weather']).trim(),
    messengerUrl: asString(r.messengerUrl || r.messenger_url || r.facebook_chat_url || r['Messenger']).trim(),
    coverUrl: asString(r.coverUrl || r.cover_url || r.image || r['Cover']).trim(),
    spots,
    seasonGroup:
      season === 'all'
        ? 'all_year'
        : normalizeSeasonGroup(r.seasonGroup || r.season_group || r.category || r['Category'] || season),

    city: asString(r.city || r.City || r['City']).trim() || extractCity(countryTag),
    durationDays: itinerary.length > 0 ? Math.max(durationDays, itinerary.length) : durationDays,
    priceStandardAud: asNumber(r.priceStandardAud || r.price_standard_aud || r.standardPrice || r['Standard Price'] || r['Standard']),
    pricePrivateAud: asNumber(r.pricePrivateAud || r.price_private_aud || r.privatePrice || r['Private Price'] || r['Private']),
    categoryCode: asString(r.categoryCode || r.category_code || r['Tour Category Code'] || r['Category Code']).trim(),
    categoryName: asString(r.categoryName || r.category_name || r['Category Name']).trim(),
    basePriceAud: asNumber(r.basePriceAud || r.base_price_aud || r['Base Price'] || r['Starting Price']),
    depositAud: asNumber(r.depositAud || r.deposit_aud || r['Deposit']),
    dormitoryPolicy: asString(r.dormitoryPolicy || r.dorm_policy || r['Dormitory Policy'] || r['Accommodation Policy']).trim(),
    dormUpgradeNote: asString(r.dormUpgradeNote || r.dorm_upgrade || r['Dorm Upgrade'] || r['Upgrade']).trim(),
    itinerary,

    departureStart: asString(
      r.departureStart || r.departure_start || r.startDate || r.start_date || r['Departure Start'] || r['Start Date']
    ).trim(),
    departureEnd: asString(
      r.departureEnd || r.departure_end || r.endDate || r.end_date || r['Departure End'] || r['End Date']
    ).trim(),
    slotsBooked: asNumber(r.slotsBooked || r.slots_booked || r.booked || r['Slots Booked'] || r['Booked']),
    slotsMax: asNumber(
      r.slotsMax || r.slots_max || r.maxPax || r.max_pax || r.capacity || r['Slots Max'] || r['Max Pax'] || r['Capacity']
    ),
    tripType,
    season,
    highlights: asString(r.highlights || r.Highlights).trim(),
    pickupType: asString(r.pickupType || r.pickup_type || r['Pickup Type']).trim(),
    maxPax: asNumber(r.maxPax || r.max_pax || r['Max Pax'] || r.slotsMax || r['Slots Max']),
  };
}

function extractTrips(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    if (payload.length > 0 && Array.isArray(payload[0])) {
      return rowsFromHeaderTable(payload as unknown[][]);
    }
    return payload;
  }
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;

  const direct = [obj.trips, obj.rows, obj.items, obj.result];
  const directArr = direct.find(Array.isArray);
  if (Array.isArray(directArr)) return directArr as unknown[];

  const data = obj.data;
  if (Array.isArray(data)) {
    if (data.length > 0 && Array.isArray(data[0])) {
      return rowsFromHeaderTable(data as unknown[][]);
    }
    return data as unknown[];
  }
  if (data && typeof data === 'object') {
    const inner = data as Record<string, unknown>;
    if (Array.isArray(inner.trips)) return inner.trips as unknown[];
    if (Array.isArray(inner.rows)) {
      const rows = inner.rows as unknown[];
      if (rows.length > 0 && Array.isArray(rows[0])) {
        return rowsFromHeaderTable(rows as unknown[][]);
      }
      return rows;
    }
  }

  return [];
}

function portfolioFallbackTrips(): TripSheetRow[] {
  return masterTripsAsSheetRows();
}

function extractBookings(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  const candidates = [obj.bookings, obj.data, obj.rows, obj.items, obj.result];
  const arr = candidates.find(Array.isArray);
  return Array.isArray(arr) ? (arr as unknown[]) : [];
}

function normalizeBookingRow(raw: unknown): CustomerBookingRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const bookingId = asString(r.bookingId || r.booking_id || r['Booking ID'] || r['BookingId']).trim();
  if (!bookingId) return null;
  const customerName = asString(r.customerName || r.customer_name || r['Customer Name'] || r['Name']).trim();
  const tourCode = asString(r.tourCode || r.tour_code || r['Tour Code'] || r['Package']).trim();
  const tourName = asString(r.tourName || r.tour_name || r['Tour Name']).trim();
  const pickupLocation = asString(r.pickupLocation || r.pickup_location || r['Pickup'] || r['Pickup Location']).trim();
  const pickupDisplay = asString(
    r.pickupDisplay || r.pickup_display || r['Pickup Display'] || pickupLocation
  ).trim();
  const tourDate = asString(r.tourDate || r.tour_date || r['Tour Date']).trim();
  const departTime = asString(r.departTime || r.depart_time || r['Depart Time'] || r['Depart']).trim();
  const fbChatUrl = asString(r.fbChatUrl || r.fb_chat_url || r['FB Chat URL']).trim();
  const notes = asString(r.notes || r.Notes).trim();
  const phone = asString(r.phone || r.phoneNumber || r['Phone'] || r['Phone Number'] || r['Mobile']).trim();
  const guests = asNumber(r.guests || r.pax || r['Guests'] || r['Pax']);
  const totalAmount = asNumber(r.totalAmount || r.total_amount || r['Total Amount']);
  return {
    bookingId,
    customerName,
    tourCode,
    tourName,
    phone,
    pickupLocation,
    pickupDisplay,
    tourDate,
    departTime,
    guests,
    totalAmount,
    fbChatUrl,
    notes,
  };
}

function mockBookingsFallback(): CustomerBookingRow[] {
  return MOCK_CUSTOMER_BOOKINGS.map((b) => ({ ...b }));
}

export async function fetchCustomerBookingsFromSheet(): Promise<CustomerBookingRow[]> {
  let url: string;
  try {
    url = requireGasUrl();
  } catch (e) {
    console.warn('[GAS][Customer_Bookings] Missing VITE_GAS_WEBAPP_URL — mock fallback', e);
    return mockBookingsFallback();
  }

  const urls = [
    { url: `${url}?action=getBookings`, label: 'action=getBookings' },
    { url: `${url}?sheet=Customer_Bookings`, label: 'sheet=Customer_Bookings' },
    { url: `${url}?tab=Customer_Bookings`, label: 'tab=Customer_Bookings' },
  ];

  let lastErr: unknown = null;
  for (const { url: u, label } of urls) {
    try {
      const res = await fetch(u, { method: 'GET', cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as unknown;
      const gasErr = parseGasError(json);
      if (gasErr) throw new Error(gasErr);
      if (label === 'action=getBookings' && isGasHealthPing(json)) {
        throw new Error('GAS getBookings not deployed (health ping only)');
      }
      const rows = extractBookings(json);
      const normalized = rows.map(normalizeBookingRow).filter((x): x is CustomerBookingRow => Boolean(x));
      if (label === 'action=getBookings') return normalized;
      if (normalized.length > 0) return normalized;
    } catch (e) {
      console.error('[GAS][Customer_Bookings] fetch attempt failed', {
        label,
        url: u,
        error: e instanceof Error ? e.message : e,
      });
      lastErr = e;
    }
  }

  console.warn('[GAS][Customer_Bookings] Using mock fallback', lastErr);
  return mockBookingsFallback();
}

function normalizePhone(input: string): string {
  return (input || '').replace(/[^\d+]/g, '').replace(/^00/, '+').trim();
}

export async function fetchCustomerBookingByBookingIdOrPhone(query: string): Promise<CustomerBookingRow | null> {
  const q = query.trim();
  if (!q) return null;
  const qPhone = normalizePhone(q);

  try {
    const byId = await fetchCustomerBookingByIdFromSheet(q);
    if (byId) return byId;
  } catch {
    // fall back to full scan below
  }

  const all = await fetchCustomerBookingsFromSheet();
  const match =
    all.find((b) => b.bookingId.toLowerCase() === q.toLowerCase()) ??
    (qPhone ? all.find((b) => normalizePhone(b.phone) === qPhone) : undefined);
  return match ?? null;
}

async function postToAppsScript(payload: Record<string, unknown>): Promise<void> {
  const bookingId =
    typeof payload.bookingId === 'string'
      ? payload.bookingId
      : typeof payload.consent === 'object' &&
          payload.consent !== null &&
          typeof (payload.consent as { bookingId?: string }).bookingId === 'string'
        ? (payload.consent as { bookingId: string }).bookingId
        : 'sheet-sync';

  const result = await forwardSheetPayload('sync_booking', bookingId, {
    passthrough: true,
    ...payload,
  });

  if (!result.success) {
    throw new Error(result.error);
  }
}

const TRIPS_CACHE_TTL_MS = 5 * 60 * 1000;
const GAS_ATTEMPT_TIMEOUT_MS = 7000;
let tripsCache: { at: number; rows: TripSheetRow[] } | null = null;
let tripsInflight: Promise<TripSheetRow[]> | null = null;

/** fetch() with an AbortController timeout so a cold/slow GAS can't hang the UI. */
function fetchWithTimeout(url: string, ms = GAS_ATTEMPT_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { method: 'GET', cache: 'no-store', signal: ctrl.signal }).finally(() =>
    clearTimeout(timer)
  );
}

/**
 * Cached + de-duped trips loader. Returns the memoized list within the TTL and
 * collapses concurrent callers onto a single in-flight request. Successful
 * results are cached; failures are not (so the next call retries).
 */
export async function fetchTripsFromSheet(): Promise<TripSheetRow[]> {
  if (tripsCache && Date.now() - tripsCache.at < TRIPS_CACHE_TTL_MS) {
    return tripsCache.rows;
  }
  if (tripsInflight) return tripsInflight;

  tripsInflight = fetchTripsFromSheetUncached()
    .then((rows) => {
      tripsCache = { at: Date.now(), rows };
      return rows;
    })
    .finally(() => {
      tripsInflight = null;
    });

  return tripsInflight;
}

async function fetchTripsFromSheetUncached(): Promise<TripSheetRow[]> {
  const url = requireGasUrl();

  const attempts: { url: string; label: string }[] = [
    { url: `${url}?action=getTrips`, label: 'action=getTrips' },
    { url: `${url}?action=getTrips&sheet=Trips_Data`, label: 'action=getTrips&sheet=Trips_Data' },
    { url: `${url}?action=list&sheet=Trips_Data`, label: 'action=list&sheet=Trips_Data' },
    { url: `${url}?sheet=Trips_Data`, label: 'sheet=Trips_Data' },
  ];

  let lastErr: unknown = null;
  let gasConfigError: string | null = null;

  for (const { url: u, label } of attempts) {
    try {
      const res = await fetchWithTimeout(u);
      const bodyText = await res.text();
      if (!res.ok) {
        console.error('[GAS][Trips_Data] HTTP error', {
          label,
          url: u,
          status: res.status,
          bodyText: bodyText.slice(0, 2000),
        });
        throw new Error(`HTTP ${res.status}`);
      }

      let json: unknown;
      try {
        json = bodyText ? (JSON.parse(bodyText) as unknown) : null;
      } catch {
        throw new Error('GAS returned non-JSON');
      }

      const gasErr = parseGasError(json);
      if (gasErr) {
        if (/spreadsheet|YOUR_SPREADSHEET/i.test(gasErr)) {
          gasConfigError = gasErr;
        }
        throw new Error(gasErr);
      }

      if (isGasHealthPing(json)) {
        throw new Error('GAS health check only (sheet not read)');
      }

      const rows = extractTrips(json);
      const normalized = rows.map(normalizeTripRow).filter((x): x is TripSheetRow => Boolean(x));
      if (normalized.length > 0) return normalized;

      throw new Error('No trip rows in response');
    } catch (e) {
      console.error('[GAS][Trips_Data] fetch attempt failed', {
        label,
        url: u,
        error: e instanceof Error ? { name: e.name, message: e.message } : e,
      });
      lastErr = e;
    }
  }

  if (gasConfigError) {
    console.warn('[GAS][Trips_Data] Using portfolio fallback — fix Apps Script SPREADSHEET_ID', gasConfigError);
    return portfolioFallbackTrips();
  }

  const fallback = portfolioFallbackTrips();
  if (fallback.length > 0) {
    console.warn('[GAS][Trips_Data] Using portfolio fallback after GAS failure', lastErr);
    return fallback;
  }

  throw new Error(lastErr instanceof Error ? lastErr.message : 'Could not load Trips_Data');
}

export async function fetchTripByCodeFromSheet(tourCode: string): Promise<TripSheetRow | null> {
  const all = await fetchTripsFromSheet();
  const match = all.find((t) => t.tourCode.toLowerCase() === tourCode.toLowerCase());
  return match ?? null;
}

export async function fetchCustomerBookingByIdFromSheet(bookingId: string): Promise<CustomerBookingRow | null> {
  try {
    const all = await fetchCustomerBookingsFromSheet();
    return all.find((b) => b.bookingId.toLowerCase() === bookingId.toLowerCase()) ?? null;
  } catch {
    const mock = mockBookingsFallback().find((b) => b.bookingId.toLowerCase() === bookingId.toLowerCase());
    return mock ?? null;
  }
}

export async function logConsentToSheet(row: ConsentLogRow): Promise<void> {
  await postToAppsScript({
    sheet: 'Consents',
    consent: row,
  });
}

export type UpdateIntakeResult = {
  success: boolean;
  bookingId: string;
  intakeStatus: string;
};

/** Server route POST /api/update-intake → GAS updateIntake */
export async function submitClientIntake(payload: ClientIntakePayload): Promise<UpdateIntakeResult> {
  const storageKey = `t2t_intake_${payload.bookingId}`;
  localStorage.setItem(storageKey, JSON.stringify({ ...payload, savedAt: new Date().toISOString() }));

  try {
    const res = await fetch('/api/booking/intake', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as UpdateIntakeResult & { error?: string };
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update intake');
    }
    return data;
  } catch (e) {
    console.warn('[GAS] updateIntake failed — data kept in localStorage', e);
    return { success: false, bookingId: payload.bookingId, intakeStatus: 'Pending' };
  }
}

export async function updateBookingCheckedIn(bookingId: string): Promise<void> {
  try {
    await postToAppsScript({ action: 'updateCheckedIn', bookingId });
  } catch (e) {
    console.warn('[GAS] updateCheckedIn failed', e);
  }
}

/** Server route POST /api/booking/create → GAS createBooking */
export async function createCustomerBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const res = await fetch('/api/booking/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookingId: input.bookingId,
      tourCode: input.tourCode,
      customerName: input.customerName,
      bookingStatus: input.bookingStatus || 'Deposit Paid',
    }),
  });

  const data = (await res.json()) as CreateBookingResult & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create booking');
  }
  return data;
}

/** Server route GET /api/get-booking-status → GAS getBookingStatus */
/** Server route GET /api/booking/pending → GAS getPendingIntakes */
export async function fetchPendingIntakes(): Promise<PendingIntakeRow[]> {
  const res = await fetch('/api/booking/pending', { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'Failed to load pending intakes');
  }
  return (await res.json()) as PendingIntakeRow[];
}

export async function fetchBookingStatusFromSheet(
  bookingId: string
): Promise<BookingStatusPayload | null> {
  try {
    const res = await fetch(`/api/booking/status?bookingId=${encodeURIComponent(bookingId)}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as BookingStatusPayload;
  } catch {
    return null;
  }
}

export function readStoredClientIntake(bookingId: string): ClientIntakePayload | null {
  try {
    const raw = localStorage.getItem(`t2t_intake_${bookingId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ClientIntakePayload;
  } catch {
    return null;
  }
}

export function isClientIntakeComplete(bookingId: string): boolean {
  return localStorage.getItem(`t2t_intake_done_${bookingId}`) === '1';
}

export function markClientIntakeComplete(bookingId: string): void {
  localStorage.setItem(`t2t_intake_done_${bookingId}`, '1');
}

