/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { callGasAction, corsHeaders, jsonResponse } from '../_shared/gasBridge.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405);

  const body = (await req.json()) as { bookingId?: string; data?: Record<string, unknown> };
  const data = body.data ?? {};
  const bookingId = body.bookingId ?? String(data.booking_id ?? '');

  if (!bookingId) {
    return jsonResponse({ success: false, error: 'Missing bookingId' }, 400);
  }

  const gas = await callGasAction('updateDeliveryRow', { ...data, booking_id: bookingId });
  if (!gas.success) {
    return jsonResponse({ success: false, error: gas.error ?? 'updateDeliveryRow failed' }, 502);
  }

  return jsonResponse({
    success: true,
    sheets_row_id: gas.sheets_row_id != null ? String(gas.sheets_row_id) : undefined,
  });
});
