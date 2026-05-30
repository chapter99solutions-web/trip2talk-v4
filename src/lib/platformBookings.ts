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

export async function fetchPlatformBookings(): Promise<PlatformBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id, external_id, client_name, email, trip_id, trip_name, departure_date, intake_status, total_amount, status, created_at'
    )
    .order('departure_date', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PlatformBooking[];
}

export async function fetchConfirmedBookings(): Promise<PlatformBooking[]> {
  const rows = await fetchPlatformBookings();
  return rows.filter((b) => String(b.status).toLowerCase() === 'confirmed');
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
