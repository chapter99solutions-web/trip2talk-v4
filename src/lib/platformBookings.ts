import { supabase } from './supabase';

export type PlatformBooking = {
  id: string;
  external_id: string | null;
  client_name: string;
  email: string | null;
  trip_id: string | null;
  trip_name: string | null;
  departure_date: string | null;
  intake_status: 'pending' | 'complete';
  total_amount: number;
  status: string;
  created_at: string;
};

export type PortalLinkRow = {
  id: string;
  booking_id: string;
  token: string;
  expires_at: string;
  created_at: string;
};

/**
 * The `public.bookings` table is defined in supabase/migrations/002_portal_intake_schema.sql
 * (and supabase/14-schema-receipts-bookings.sql). If that DDL has not been run on the live
 * project, PostgREST reports "Could not find the table 'public.bookings' in the schema cache".
 * Detect that case so the dashboard degrades to an empty manifest instead of crashing.
 */
function isMissingBookingsTable(message: string): boolean {
  const m = (message || '').toLowerCase();
  return (
    m.includes('schema cache') ||
    m.includes("'public.bookings'") ||
    m.includes('relation "bookings"') ||
    (m.includes('bookings') && m.includes('does not exist'))
  );
}

export class BookingsTableMissingError extends Error {
  constructor() {
    super('Bookings table is not set up yet. Run supabase/14-schema-receipts-bookings.sql.');
    this.name = 'BookingsTableMissingError';
  }
}

export async function fetchPlatformBookings(): Promise<PlatformBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, external_id, client_name, email, trip_id, trip_name, departure_date, intake_status, total_amount, status, created_at'
    )
    .order('departure_date', { ascending: true });

  if (error) {
    if (isMissingBookingsTable(error.message)) {
      throw new BookingsTableMissingError();
    }
    throw new Error(error.message);
  }

  return (data ?? []) as PlatformBooking[];
}

export async function fetchConfirmedBookings(): Promise<PlatformBooking[]> {
  const rows = await fetchPlatformBookings();
  return rows.filter((b) => String(b.status).toLowerCase() === 'confirmed');
}

/** Mirror row in public.bookings after successful web checkout (portal/intake). */
export async function insertPlatformBookingRow(input: {
  externalId: string;
  tripCode: string;
  guestName: string;
  guestEmail: string;
  guests?: number;
  tripName?: string;
  departureDate?: string;
  totalAmount?: number;
  photoConsent?: boolean;
  emergencyName?: string;
  emergencyPhone?: string;
  medicalNotes?: string;
  termsAcceptedAt?: string;
  waiverData?: Record<string, unknown>;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      external_id: input.externalId,
      trip_id: input.tripCode,
      client_name: input.guestName,
      email: input.guestEmail,
      trip_name: input.tripName ?? input.tripCode,
      departure_date: input.departureDate ?? null,
      intake_status: 'pending',
      total_amount: input.totalAmount ?? 0,
      status: 'pending',
      photo_consent: input.photoConsent ?? false,
      emergency_name: input.emergencyName?.trim() || null,
      emergency_phone: input.emergencyPhone?.trim() || null,
      medical_notes: input.medicalNotes?.trim() || null,
      terms_accepted_at: input.termsAcceptedAt ?? null,
      waiver_data: input.waiverData ?? null,
    })
    .select('id')
    .single();

  if (error) {
    if (isMissingBookingsTable(error.message)) {
      console.warn('[Trip2Talk] bookings table missing — skip mirror insert');
      return null;
    }
    console.warn('[Trip2Talk] insertPlatformBookingRow:', error.message, {
      externalId: input.externalId,
      tripCode: input.tripCode,
      guests: input.guests ?? 1,
    });
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}

export async function fetchBookingByExternalId(externalId: string): Promise<PlatformBooking | null> {
  const ref = externalId.trim();
  if (!ref) return null;

  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, external_id, client_name, email, trip_id, trip_name, departure_date, intake_status, total_amount, status, created_at'
    )
    .eq('external_id', ref)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingBookingsTable(error.message)) return null;
    console.warn('[Trip2Talk] fetchBookingByExternalId:', error.message);
    return null;
  }

  return (data as PlatformBooking | null) ?? null;
}

export type HubBookingView = {
  bookingId: string;
  customerName: string;
  tourCode: string;
  tripName: string;
  guests: number;
  pickupLocation: string;
  departTime: string;
};

function clientNameFromRow(c: Record<string, unknown> | null | undefined): string {
  if (!c) return '';
  const en = `${String(c.first_name_en ?? '').trim()} ${String(c.last_name_en ?? '').trim()}`.trim();
  if (en) return en;
  const th = `${String(c.first_name_th ?? '').trim()} ${String(c.last_name_th ?? '').trim()}`.trim();
  return th;
}

function formatDepartureDate(raw: string | null | undefined): string {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  const iso = value.slice(0, 10);
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Resolve `/trip/:ref` hub data — `bookings.external_id` first, then `tour_bookings.reference_number`. */
export async function fetchHubBookingByRef(ref: string): Promise<HubBookingView | null> {
  const bookingRef = decodeURIComponent(ref).trim();
  if (!bookingRef) return null;

  const platformRow = await fetchBookingByExternalId(bookingRef);
  if (platformRow) {
    const tourCode = (platformRow.trip_id || '').trim();
    const tripName = (platformRow.trip_name || tourCode || 'Trip2Talk Journey').trim();
    return {
      bookingId: platformRow.external_id || platformRow.id,
      customerName: platformRow.client_name.trim(),
      tourCode,
      tripName,
      guests: 1,
      pickupLocation: '',
      departTime: formatDepartureDate(platformRow.departure_date),
    };
  }

  const { data, error } = await supabase
    .from('tour_bookings')
    .select(
      `
      id,
      reference_number,
      party_pax,
      trip_date,
      preferred_pickup,
      crm_clients (first_name_en, last_name_en, first_name_th, last_name_th),
      tours (trip_code, destination)
    `
    )
    .eq('reference_number', bookingRef)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const tours = data.tours as { trip_code?: string; destination?: string } | null;
  const tourCode = String(tours?.trip_code ?? '').trim();
  const tripName = String(tours?.destination ?? tourCode ?? 'Trip2Talk Journey').trim();
  const rawClient = data.crm_clients;
  const clientRow = Array.isArray(rawClient) ? rawClient[0] : rawClient;
  const customerName = clientNameFromRow(
    (clientRow as Record<string, unknown> | null | undefined) ?? null
  );

  return {
    bookingId: String(data.reference_number || data.id),
    customerName: customerName || 'Guest',
    tourCode,
    tripName,
    guests: Number(data.party_pax ?? 1) || 1,
    pickupLocation: String(data.preferred_pickup ?? '').trim(),
    departTime: formatDepartureDate(String(data.trip_date ?? '')),
  };
}

export async function validatePortalToken(token: string): Promise<{
  ok: boolean;
  booking: PlatformBooking | null;
  expiresAt: string | null;
}> {
  const { data: link, error } = await supabase
    .from('portal_links')
    .select('id, booking_id, token, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !link) {
    return { ok: false, booking: null, expiresAt: null };
  }

  const expiresAt = String(link.expires_at || '');
  if (!expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
    return { ok: false, booking: null, expiresAt };
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select(
      'id, external_id, client_name, email, trip_id, trip_name, departure_date, intake_status, total_amount, status, created_at'
    )
    .eq('id', link.booking_id)
    .maybeSingle();

  return {
    ok: Boolean(booking),
    booking: (booking as PlatformBooking | null) ?? null,
    expiresAt,
  };
}

export async function generatePortalLink(bookingRef: string): Promise<{ url: string; expires_at: string }> {
  const { data, error } = await supabase.functions.invoke('generate-portal-link', {
    body: { booking_id: bookingRef },
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = data as { url?: string; expires_at?: string; error?: string };
  if (row?.error) {
    throw new Error(row.error);
  }
  if (!row?.url) {
    throw new Error('No portal URL returned');
  }

  return { url: row.url, expires_at: row.expires_at || '' };
}
