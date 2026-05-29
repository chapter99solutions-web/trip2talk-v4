/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { callGasAction, corsHeaders, jsonResponse } from '../_shared/gasBridge.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ success: false, error: 'Missing Supabase env' }, 500);
  }

  const body = (await req.json()) as { bookingId?: string; data?: Record<string, unknown> };
  const bookingId = body.bookingId ?? String(body.data?.booking_id ?? '');
  const data = body.data ?? {};

  if (!bookingId) {
    return jsonResponse({ success: false, error: 'Missing bookingId' }, 400);
  }

  const gas = await callGasAction('appendBookingRow', { ...data, booking_id: bookingId });
  if (!gas.success) {
    return jsonResponse({ success: false, error: gas.error ?? 'GAS appendBookingRow failed' }, 502);
  }

  const sheetsRowId = gas.sheets_row_id ?? gas.sheet_row;
  if (sheetsRowId != null) {
    const supabase = createClient(supabaseUrl, serviceKey);
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const q = supabase
      .from('tour_bookings')
      .update({ sheets_row_id: String(sheetsRowId) });
    const { error } = uuidRe.test(bookingId)
      ? await q.eq('id', bookingId)
      : await q.eq('reference_number', bookingId);
    if (error) {
      return jsonResponse({ success: false, error: error.message }, 500);
    }
  }

  return jsonResponse({
    success: true,
    sheet_row: gas.sheet_row,
    sheets_row_id: sheetsRowId != null ? String(sheetsRowId) : undefined,
  });
});
