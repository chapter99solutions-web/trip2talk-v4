/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import type {
  GasBridgeResponse,
  SyncPipelineAction,
  SyncPipelineFailure,
  SyncPipelineRequest,
  SyncPipelineSuccess,
} from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYNC_ACTIONS: readonly SyncPipelineAction[] = [
  'sync_booking',
  'sync_waiver',
  'sync_receipt',
];

function json(body: SyncPipelineSuccess | SyncPipelineFailure, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isSyncAction(value: string): value is SyncPipelineAction {
  return (SYNC_ACTIONS as readonly string[]).includes(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRequest(body: unknown): SyncPipelineRequest | SyncPipelineFailure {
  if (!isPlainObject(body)) {
    return { success: false, error: 'Body must be a JSON object' };
  }

  const action = body.action;
  const bookingId = body.bookingId;
  const data = body.data;

  if (typeof action !== 'string' || !action.trim()) {
    return { success: false, error: 'Missing or invalid action' };
  }
  if (typeof bookingId !== 'string' || !bookingId.trim()) {
    return { success: false, error: 'Missing or invalid bookingId' };
  }
  if (!isPlainObject(data)) {
    return { success: false, error: 'Missing or invalid data (must be object)' };
  }

  if (!isSyncAction(action)) {
    return { success: false, error: `Unknown action: ${action}` };
  }

  return { action, bookingId: bookingId.trim(), data };
}

function extractSheetsRowId(gas: GasBridgeResponse, data: Record<string, unknown>): string | null {
  const raw = gas.sheets_row_id ?? gas.sheetRowId ?? data.sheets_row_id;
  if (raw === undefined || raw === null || raw === '') return null;
  return String(raw);
}

async function callGasBridge(
  gasUrl: string,
  payload: SyncPipelineRequest
): Promise<GasBridgeResponse> {
  const res = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let parsed: GasBridgeResponse;
  try {
    parsed = text ? (JSON.parse(text) as GasBridgeResponse) : {};
  } catch {
    throw new Error(`GAS returned non-JSON (HTTP ${res.status}): ${text.slice(0, 240)}`);
  }

  if (!res.ok) {
    throw new Error(parsed.error ?? `GAS HTTP ${res.status}: ${text.slice(0, 240)}`);
  }

  return parsed;
}

async function resolveBookingUuid(
  supabase: SupabaseClient,
  bookingId: string
): Promise<string | null> {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(bookingId)) return bookingId;

  const { data, error } = await supabase
    .from('tour_bookings')
    .select('id')
    .eq('reference_number', bookingId)
    .maybeSingle();

  if (error) throw new Error(`Booking lookup failed: ${error.message}`);
  return data?.id ?? null;
}

async function writeBackBooking(
  supabase: SupabaseClient,
  bookingId: string,
  sheetsRowId: string
): Promise<void> {
  const bookingUuid = await resolveBookingUuid(supabase, bookingId);
  if (!bookingUuid) {
    throw new Error(`No tour_bookings row for bookingId: ${bookingId}`);
  }

  const { error } = await supabase
    .from('tour_bookings')
    .update({ sheets_row_id: sheetsRowId })
    .eq('id', bookingUuid);

  if (error) throw new Error(`tour_bookings update failed: ${error.message}`);
}

async function writeBackWaiver(
  supabase: SupabaseClient,
  bookingId: string,
  data: Record<string, unknown>,
  sheetsRowId: string | null,
  pdfUrl: string | null
): Promise<void> {
  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  if (sheetsRowId) patch.sheets_row_id = sheetsRowId;
  if (pdfUrl) patch.pdf_url = pdfUrl;

  if (Object.keys(patch).length <= 1) {
    throw new Error('sync_waiver: GAS did not return pdf_url or sheets_row_id');
  }

  const waiverSignatureId =
    typeof data.waiver_signature_id === 'string' ? data.waiver_signature_id : null;

  if (waiverSignatureId) {
    const { error } = await supabase
      .from('waiver_signatures')
      .update(patch)
      .eq('id', waiverSignatureId);
    if (error) throw new Error(`waiver_signatures update failed: ${error.message}`);
    return;
  }

  const bookingUuid = await resolveBookingUuid(supabase, bookingId);
  if (!bookingUuid) {
    throw new Error(`No booking for waiver sync: ${bookingId}`);
  }

  const { error } = await supabase
    .from('waiver_signatures')
    .update(patch)
    .eq('booking_id', bookingUuid);

  if (error) throw new Error(`waiver_signatures update failed: ${error.message}`);
}

async function writeBackReceipt(
  supabase: SupabaseClient,
  bookingId: string,
  data: Record<string, unknown>,
  sheetsRowId: string | null,
  driveUrl: string | null
): Promise<void> {
  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  if (sheetsRowId) patch.sheets_row_id = sheetsRowId;
  if (driveUrl) patch.drive_url = driveUrl;

  if (Object.keys(patch).length <= 1) {
    throw new Error('sync_receipt: GAS did not return drive_url or sheets_row_id');
  }

  const receiptId = typeof data.receipt_id === 'string' ? data.receipt_id : null;

  if (receiptId) {
    const { error } = await supabase.from('receipts').update(patch).eq('id', receiptId);
    if (error) throw new Error(`receipts update failed: ${error.message}`);
    return;
  }

  const bookingUuid = await resolveBookingUuid(supabase, bookingId);
  if (bookingUuid) {
    const { error } = await supabase.from('receipts').update(patch).eq('booking_id', bookingUuid);
    if (error) throw new Error(`receipts update failed: ${error.message}`);
    return;
  }

  const { error } = await supabase.from('receipts').update(patch).eq('reference_number', bookingId);
  if (error) throw new Error(`receipts update failed: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  const gasUrl = Deno.env.get('GAS_WEBAPP_URL');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!gasUrl || !supabaseUrl || !serviceRoleKey) {
    return json(
      {
        success: false,
        error: 'Missing GAS_WEBAPP_URL or Supabase service configuration',
      },
      500
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = parseRequest(rawBody);
  if ('success' in parsed && parsed.success === false) {
    return json(parsed, 400);
  }

  const request = parsed as SyncPipelineRequest;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let gasResult: GasBridgeResponse;
  try {
    gasResult = await callGasBridge(gasUrl, request);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ success: false, error: message }, 502);
  }

  const sheetsRowId = extractSheetsRowId(gasResult, request.data);
  const pdfUrl =
    typeof gasResult.pdf_url === 'string'
      ? gasResult.pdf_url
      : typeof request.data.pdf_url === 'string'
        ? request.data.pdf_url
        : null;
  const driveUrl =
    typeof gasResult.drive_url === 'string'
      ? gasResult.drive_url
      : typeof request.data.drive_url === 'string'
        ? request.data.drive_url
        : null;

  try {
    switch (request.action) {
      case 'sync_booking': {
        const passthrough = request.data.passthrough === true;
        if (!sheetsRowId) {
          if (passthrough) break;
          return json(
            {
              success: false,
              error: 'sync_booking: GAS did not return sheets_row_id',
            },
            422
          );
        }
        await writeBackBooking(supabase, request.bookingId, sheetsRowId);
        break;
      }
      case 'sync_waiver': {
        await writeBackWaiver(supabase, request.bookingId, request.data, sheetsRowId, pdfUrl);
        break;
      }
      case 'sync_receipt': {
        await writeBackReceipt(supabase, request.bookingId, request.data, sheetsRowId, driveUrl);
        break;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ success: false, error: message }, 500);
  }

  const response: SyncPipelineSuccess = {
    success: true,
    action: request.action,
    bookingId: request.bookingId,
    ...(sheetsRowId ? { sheets_row_id: sheetsRowId } : {}),
    ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
    ...(driveUrl ? { drive_url: driveUrl } : {}),
  };

  return json(response);
});
