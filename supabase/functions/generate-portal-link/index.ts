/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PORTAL_EXPIRY_DAYS = 7;
const SITE_URL = 'https://www.trip2talk.com.au';

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

  let body: { booking_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  const bookingId = (body.booking_id || '').trim();
  if (!bookingId) {
    return new Response(JSON.stringify({ error: 'booking_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookingId);

  const bookingQuery = client.from('bookings').select('id, external_id, client_name').limit(1);
  const { data: booking, error: bookingErr } = isUuid
    ? await bookingQuery.eq('id', bookingId).maybeSingle()
    : await bookingQuery.eq('external_id', bookingId).maybeSingle();

  if (bookingErr) {
    return new Response(JSON.stringify({ error: bookingErr.message }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  if (!booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + PORTAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertErr } = await client.from('portal_links').insert({
    booking_id: booking.id,
    token,
    expires_at: expiresAt,
  });

  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 400,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  const siteUrl = (Deno.env.get('SITE_URL') || Deno.env.get('VITE_PUBLIC_SITE_URL') || SITE_URL).replace(
    /\/$/,
    ''
  );
  const url = `${siteUrl}/album-prep?token=${token}`;

  return new Response(
    JSON.stringify({
      url,
      token,
      expires_at: expiresAt,
      booking_id: booking.id,
      external_id: booking.external_id,
    }),
    { headers: { ...corsHeaders, 'content-type': 'application/json' } }
  );
});
