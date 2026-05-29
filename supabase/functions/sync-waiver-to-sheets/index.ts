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
    bookingId?: string;
    waiverSignatureId?: string;
    data?: Record<string, unknown>;
  };
  const data = body.data ?? {};
  const bookingId = body.bookingId ?? String(data.booking_id ?? '');
  const waiverSignatureId =
    body.waiverSignatureId ?? (typeof data.waiver_signature_id === 'string' ? data.waiver_signature_id : '');

  if (!bookingId) {
    return jsonResponse({ success: false, error: 'Missing bookingId' }, 400);
  }

  const rowGas = await callGasAction('appendWaiverRow', { ...data, booking_id: bookingId });
  if (!rowGas.success) {
    return jsonResponse({ success: false, error: rowGas.error ?? 'appendWaiverRow failed' }, 502);
  }

  const pdfGas = await callGasAction('createWaiverPDF', { ...data, booking_id: bookingId });
  if (!pdfGas.success) {
    return jsonResponse({ success: false, error: pdfGas.error ?? 'createWaiverPDF failed' }, 502);
  }

  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  const sheetsRowId = rowGas.sheets_row_id ?? rowGas.sheet_row;
  if (sheetsRowId != null) patch.sheets_row_id = String(sheetsRowId);
  const pdfUrl = pdfGas.pdf_url ?? pdfGas.file_url ?? pdfGas.drive_url;
  if (pdfUrl) patch.pdf_url = pdfUrl;

  const supabase = createClient(supabaseUrl, serviceKey);
  if (waiverSignatureId) {
    const { error } = await supabase.from('waiver_signatures').update(patch).eq('id', waiverSignatureId);
    if (error) return jsonResponse({ success: false, error: error.message }, 500);
  } else {
    const { error } = await supabase.from('waiver_signatures').update(patch).eq('booking_id', bookingId);
    if (error) return jsonResponse({ success: false, error: error.message }, 500);
  }

  return jsonResponse({
    success: true,
    sheets_row_id: patch.sheets_row_id,
    pdf_url: patch.pdf_url,
  });
});
