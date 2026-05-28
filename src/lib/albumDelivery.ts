import { supabase } from './supabase';

export type AlbumStatus = 'pending' | 'processing' | 'delivered' | 'expired';

export interface AlbumDeliveryRow {
  id: string;
  tour_id: string;
  reference_number: string | null;
  album_status: AlbumStatus;
  album_url: string | null;
  facebook_chat_url: string | null;
  album_expires_at: string | null;
  expires_at: string | null;
  client_name: string;
  tour_title: string;
}

function clientDisplayName(row: {
  crm_clients: {
    first_name_en: string;
    last_name_en: string;
    first_name_th?: string;
    last_name_th?: string;
  } | null;
}): string {
  const c = row.crm_clients;
  if (!c) return 'ลูกทริป';
  const en = `${c.first_name_en} ${c.last_name_en}`.trim();
  if (en) return en;
  return `${c.first_name_th ?? ''} ${c.last_name_th ?? ''}`.trim() || 'ลูกทริป';
}

function tourTitle(row: { tours: { destination?: string; trip_code?: string } | null }): string {
  const t = row.tours;
  if (!t) return 'ทริป';
  return t.destination ? `${t.destination} (${t.trip_code ?? ''})` : (t.trip_code ?? 'ทริป');
}

export async function fetchAlbumDeliveryBookings(): Promise<AlbumDeliveryRow[]> {
  const { data, error } = await supabase.from('tour_bookings').select(`
    id,
    tour_id,
    reference_number,
    album_status,
    album_url,
    facebook_chat_url,
    album_expires_at,
    expires_at,
    crm_clients ( first_name_en, last_name_en, first_name_th, last_name_th ),
    tours ( destination, trip_code )
  `);

  if (error) throw new Error(error.message);

  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    const crmRaw = row.crm_clients;
    const tourRaw = row.tours;
    const crm = (Array.isArray(crmRaw) ? crmRaw[0] : crmRaw) as Parameters<typeof clientDisplayName>[0]['crm_clients'];
    const tour = (Array.isArray(tourRaw) ? tourRaw[0] : tourRaw) as Parameters<typeof tourTitle>[0]['tours'];
    const normalized = { crm_clients: crm ?? null, tours: tour ?? null };
    const status = ((row.album_status as AlbumStatus | null) ?? 'pending') as AlbumStatus;
    return {
      id: row.id as string,
      tour_id: row.tour_id as string,
      reference_number: (row.reference_number as string | null) ?? null,
      album_status: status,
      album_url: (row.album_url as string | null) ?? null,
      facebook_chat_url: (row.facebook_chat_url as string | null) ?? null,
      album_expires_at: (row.album_expires_at as string | null) ?? null,
      expires_at: (row.expires_at as string | null) ?? null,
      client_name: clientDisplayName(normalized),
      tour_title: tourTitle(normalized),
    };
  });
}

export interface AlbumDeliveryPatch {
  album_status?: AlbumStatus;
  album_url?: string | null;
  facebook_chat_url?: string | null;
}

export async function updateAlbumDelivery(
  bookingId: string,
  patch: AlbumDeliveryPatch
): Promise<void> {
  if (patch.album_status === 'delivered') {
    const { error: rpcErr } = await supabase.rpc('mark_album_delivered', {
      p_tour_id: null,
      p_client_id: null,
      p_booking_id: bookingId,
    });
    if (rpcErr) throw new Error(rpcErr.message);
  }

  const { error: updateErr } = await supabase.from('tour_bookings').update(patch).eq('id', bookingId);
  if (updateErr) throw new Error(updateErr.message);
}

export async function fetchAlbumByBookingRef(bookingRef: string): Promise<{
  id: string;
  album_status: AlbumStatus;
  album_url: string | null;
  album_expires_at: string | null;
  facebook_chat_url: string | null;
} | null> {
  const ref = bookingRef.trim();
  if (!ref) return null;

  const { data, error } = await supabase
    .from('tour_bookings')
    .select('id, album_status, album_url, album_expires_at, expires_at, facebook_chat_url')
    .eq('reference_number', ref)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    id: string;
    album_status?: AlbumStatus | null;
    album_url?: string | null;
    album_expires_at?: string | null;
    expires_at?: string | null;
    facebook_chat_url?: string | null;
  };

  return {
    id: row.id,
    album_status: (row.album_status ?? 'pending') as AlbumStatus,
    album_url: row.album_url ?? null,
    album_expires_at: row.album_expires_at ?? row.expires_at ?? null,
    facebook_chat_url: row.facebook_chat_url ?? null,
  };
}

export async function fetchAlbumBookingForTrip(tourIdOrCode: string): Promise<{
  album_status: AlbumStatus | null;
  album_expires_at: string | null;
} | null> {
  const { findTripById } = await import('./publicTours');
  const localTrip = findTripById(tourIdOrCode);
  const tripCode = localTrip?.trip_code ?? tourIdOrCode;

  let tourUuid: string | null = null;
  const { data: byCode } = await supabase.from('tours').select('id').eq('trip_code', tripCode).limit(1);
  if (byCode?.[0]?.id) tourUuid = byCode[0].id;
  else {
    const { data: byId } = await supabase.from('tours').select('id').eq('id', tourIdOrCode).limit(1);
    if (byId?.[0]?.id) tourUuid = byId[0].id;
  }

  if (!tourUuid) return null;

  const { data, error } = await supabase
    .from('tour_bookings')
    .select('album_status, album_expires_at, expires_at')
    .eq('tour_id', tourUuid)
    .eq('album_status', 'delivered')
    .order('album_delivered_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    album_status?: AlbumStatus | null;
    album_expires_at?: string | null;
    expires_at?: string | null;
  };

  return {
    album_status: (row.album_status ?? null) as AlbumStatus | null,
    album_expires_at: row.album_expires_at ?? row.expires_at ?? null,
  };
}
