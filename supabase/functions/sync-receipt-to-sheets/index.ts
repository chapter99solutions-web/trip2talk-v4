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

  const body = (await req.json()) as {
    receiptId?: string;
    tripId?: string;
    data?: Record<string, unknown>;
  };
  const data = body.data ?? {};
  const receiptId = body.receiptId ?? (typeof data.receipt_id === 'string' ? data.receipt_id : '');
  const tripId = body.tripId ?? String(data.trip_id ?? '');

  const folderGas = await callGasAction('createATOFolder', { ...data, trip_id: tripId });
  if (!folderGas.success) {
    return jsonResponse({ success: false, error: folderGas.error ?? 'createATOFolder failed' }, 502);
  }

  const rowGas = await callGasAction('appendReceiptRow', {
    ...data,
    trip_id: tripId,
    folder_url: folderGas.folder_url,
  });
  if (!rowGas.success) {
    return jsonResponse({ success: false, error: rowGas.error ?? 'appendReceiptRow failed' }, 502);
  }

  const driveUrl = rowGas.drive_url ?? rowGas.file_url ?? folderGas.folder_url;
  const sheetsRowId = rowGas.sheets_row_id ?? rowGas.sheet_row;

  if (receiptId) {
    const supabase = createClient(supabaseUrl, serviceKey);
    const patch: Record<string, string> = { updated_at: new Date().toISOString() };
    if (driveUrl) patch.drive_url = driveUrl;
    if (sheetsRowId != null) patch.sheets_row_id = String(sheetsRowId);
    const { error } = await supabase.from('receipts').update(patch).eq('id', receiptId);
    if (error) return jsonResponse({ success: false, error: error.message }, 500);
  }

  return jsonResponse({
    success: true,
    drive_url: driveUrl,
    folder_url: folderGas.folder_url,
    sheets_row_id: sheetsRowId != null ? String(sheetsRowId) : undefined,
  });
});
