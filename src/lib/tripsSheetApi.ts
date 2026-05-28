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
};

export type CustomerBookingRow = {
  bookingId: string;
  customerName: string;
  tourCode: string;
};

export type ConsentStatus = 'CHECKED_IN';

export type ConsentLogRow = {
  timestampIso: string;
  bookingId: string;
  customerName: string;
  tourCode: string;
  consentStatus: ConsentStatus;
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
  return clampInt(n, 1, 4);
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

  return {
    tourCode,
    tourName: asString(r.tourName || r.tour_name || r['Tour Name']).trim(),
    countryTag,
    weather: asString(r.weather || r['Weather']).trim(),
    messengerUrl: asString(r.messengerUrl || r.messenger_url || r.facebook_chat_url || r['Messenger']).trim(),
    coverUrl: asString(r.coverUrl || r.cover_url || r.image || r['Cover']).trim(),
    spots,
    seasonGroup: normalizeSeasonGroup(r.seasonGroup || r.season_group || r.season || r.category || r['Category']),

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
    slotsMax: asNumber(r.slotsMax || r.slots_max || r.capacity || r['Slots Max'] || r['Capacity']),
  };
}

function extractTrips(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const obj = payload as Record<string, unknown>;
  const candidates = [obj.trips, obj.data, obj.rows, obj.items, obj.result];
  const arr = candidates.find(Array.isArray);
  return Array.isArray(arr) ? (arr as unknown[]) : [];
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
  return { bookingId, customerName, tourCode };
}

async function postToAppsScript(payload: unknown): Promise<void> {
  const url = import.meta.env.VITE_GAS_WEBAPP_URL as string | undefined;
  if (!url) throw new Error('Missing VITE_GAS_WEBAPP_URL');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Apps Script error: HTTP ${res.status}${text ? ` — ${text}` : ''}`);
  }
}

export async function fetchTripsFromSheet(): Promise<TripSheetRow[]> {
  const url = import.meta.env.VITE_GAS_WEBAPP_URL as string | undefined;
  if (!url) throw new Error('Missing VITE_GAS_WEBAPP_URL');

  // Try a few common Apps Script patterns without requiring a specific backend implementation.
  const urls = [
    `${url}?sheet=Trips_Data`,
    `${url}?tab=Trips_Data`,
    `${url}?action=list&sheet=Trips_Data`,
    url,
  ];

  let lastErr: unknown = null;
  for (const u of urls) {
    try {
      const res = await fetch(u, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as unknown;
      const rows = extractTrips(json);
      const normalized = rows.map(normalizeTripRow).filter((x): x is TripSheetRow => Boolean(x));
      if (normalized.length > 0) return normalized;
    } catch (e) {
      lastErr = e;
    }
  }

  throw new Error(lastErr instanceof Error ? lastErr.message : 'Could not load Trips_Data');
}

export async function fetchTripByCodeFromSheet(tourCode: string): Promise<TripSheetRow | null> {
  const all = await fetchTripsFromSheet();
  const match = all.find((t) => t.tourCode.toLowerCase() === tourCode.toLowerCase());
  return match ?? null;
}

export async function fetchCustomerBookingByIdFromSheet(bookingId: string): Promise<CustomerBookingRow | null> {
  const url = import.meta.env.VITE_GAS_WEBAPP_URL as string | undefined;
  if (!url) throw new Error('Missing VITE_GAS_WEBAPP_URL');

  const urls = [
    `${url}?sheet=Customer_Bookings&bookingId=${encodeURIComponent(bookingId)}`,
    `${url}?tab=Customer_Bookings&bookingId=${encodeURIComponent(bookingId)}`,
    `${url}?action=getBooking&bookingId=${encodeURIComponent(bookingId)}`,
    `${url}?sheet=Customer_Bookings`,
    `${url}?tab=Customer_Bookings`,
  ];

  let lastErr: unknown = null;
  for (const u of urls) {
    try {
      const res = await fetch(u, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as unknown;
      const rows = extractBookings(json);
      const normalized = rows.map(normalizeBookingRow).filter((x): x is CustomerBookingRow => Boolean(x));
      const match = normalized.find((b) => b.bookingId.toLowerCase() === bookingId.toLowerCase());
      if (match) return match;
      if (normalized.length > 0 && urls.indexOf(u) <= 2) return null;
    } catch (e) {
      lastErr = e;
    }
  }

  throw new Error(lastErr instanceof Error ? lastErr.message : 'Could not load Customer_Bookings');
}

export async function logConsentToSheet(row: ConsentLogRow): Promise<void> {
  await postToAppsScript({
    sheet: 'Consents',
    consent: row,
  });
}

