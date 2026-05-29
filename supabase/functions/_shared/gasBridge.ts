/** Shared GAS /exec bridge — server-only (GAS_WEBAPP_URL secret). */

export type GasAction =
  | 'appendBookingRow'
  | 'appendWaiverRow'
  | 'createWaiverPDF'
  | 'appendReceiptRow'
  | 'createATOFolder'
  | 'updateDeliveryRow';

export interface GasInvokeResult {
  success: boolean;
  sheet_row?: number;
  sheets_row_id?: string | number;
  pdf_url?: string;
  folder_url?: string;
  file_url?: string;
  drive_url?: string;
  error?: string;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function callGasAction(
  action: GasAction,
  data: Record<string, unknown>
): Promise<GasInvokeResult> {
  const gasUrl = Deno.env.get('GAS_WEBAPP_URL');
  if (!gasUrl) {
    return { success: false, error: 'GAS_WEBAPP_URL not configured' };
  }

  const res = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  });

  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {
      success: false,
      error: `GAS non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`,
    };
  }

  if (!res.ok) {
    return {
      success: false,
      error: String(parsed.error ?? `GAS HTTP ${res.status}`),
    };
  }

  const ok = parsed.success === true || parsed.ok === true;
  if (!ok && parsed.error) {
    return { success: false, error: String(parsed.error) };
  }

  return {
    success: true,
    sheet_row: typeof parsed.sheet_row === 'number' ? parsed.sheet_row : undefined,
    sheets_row_id:
      (parsed.sheets_row_id ?? parsed.sheetRowId ?? parsed.sheet_row) as string | number | undefined,
    pdf_url: typeof parsed.pdf_url === 'string' ? parsed.pdf_url : undefined,
    folder_url: typeof parsed.folder_url === 'string' ? parsed.folder_url : undefined,
    file_url: typeof parsed.file_url === 'string' ? parsed.file_url : undefined,
    drive_url: typeof parsed.drive_url === 'string' ? parsed.drive_url : undefined,
  };
}
