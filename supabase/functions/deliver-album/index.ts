/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

/** Album signed URL + DB expires_at — always 60 days (not 90). */
const ALBUM_EXPIRES_DAYS = 60;
const ALBUM_EXPIRES_SEC = 60 * 60 * 24 * ALBUM_EXPIRES_DAYS;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const body = await req.json();

  const tourId = body.tour_id as string;
  const clientId = (body.client_id as string) || null;
  const bookingId = (body.booking_id as string) || null;
  const objectPath = (body.object_path as string) || `${tourId}/album.zip`;

  const requestedDays = Number(body.expires_in_days);
  const expiresInDays =
    Number.isFinite(requestedDays) && requestedDays > 0
      ? Math.min(requestedDays, ALBUM_EXPIRES_DAYS)
      : ALBUM_EXPIRES_DAYS;
  const expiresInSec = 60 * 60 * 24 * expiresInDays;

  const bucket = 'tour-photos';
  const { data: signed, error: signErr } = await client.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresInSec);

  // DB: expires_at = now() + interval '60 days' (via mark_album_delivered / album_link_expires_at)
  const { data: delivery, error: deliveryErr } = await client.rpc('mark_album_delivered', {
    p_tour_id: tourId,
    p_client_id: clientId,
    p_booking_id: bookingId,
  });

  const deliveryRow = delivery as { album_delivered_at?: string; expires_at?: string } | null;
  const albumDeliveredAt = deliveryRow?.album_delivered_at ?? new Date().toISOString();
  const expiresAt = deliveryRow?.expires_at ?? null;

  if (deliveryErr) {
    console.warn('[deliver-album] mark_album_delivered:', deliveryErr.message);
  }

  if (clientId && !deliveryErr) {
    const { data: stats } = await client.rpc('refresh_crm_journey_stats', {
      p_client_id: clientId,
      p_trip_revenue: 0,
    });

    const { data: crm } = await client
      .from('crm_clients')
      .select('first_name_en, last_name_en, phone')
      .eq('id', clientId)
      .maybeSingle();

    const row = Array.isArray(stats) ? stats[0] : stats;
    const vipTier = (row?.vip_tier as string) ?? 'standard';
    const totalTrips = Number(row?.total_trips ?? 0);
    const name = crm ? `${crm.first_name_en} ${crm.last_name_en}`.trim() : 'Guest';

    if (crm?.phone) {
      const fnUrl = `${supabaseUrl}/functions/v1/send-retarget-sms`;
      await fetch(fnUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: name,
          client_phone: crm.phone,
          vip_tier: vipTier,
          total_trips: totalTrips,
        }),
      });
    }
  }

  if (signErr) {
    return new Response(
      JSON.stringify({
        error: signErr.message,
        album_delivered_at: albumDeliveredAt,
        expires_at: expiresAt,
        expires_in_days: ALBUM_EXPIRES_DAYS,
      }),
      { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      signed_url: signed?.signedUrl ?? null,
      expires_at: expiresAt,
      album_delivered_at: albumDeliveredAt,
      expires_in_days: ALBUM_EXPIRES_DAYS,
      bucket,
      object_path: objectPath,
    }),
    { headers: { ...corsHeaders, 'content-type': 'application/json' } }
  );
});
