import { supabase } from './supabase';

/** Must match `supabase/functions/sync-pipeline` contract. */
export type SyncPipelineAction = 'sync_booking' | 'sync_waiver' | 'sync_receipt';

export type SyncPipelinePayload = {
  action: SyncPipelineAction;
  bookingId: string;
  data: Record<string, unknown>;
};

export type SyncPipelineResult =
  | {
      success: true;
      action: SyncPipelineAction;
      bookingId: string;
      sheets_row_id?: string;
      pdf_url?: string;
      drive_url?: string;
    }
  | { success: false; error: string };

/**
 * Insulated bridge to Google Apps Script via Supabase Edge Function.
 * Never call GAS URLs from the browser — use this helper only.
 */
export async function invokeSyncPipeline(payload: SyncPipelinePayload): Promise<SyncPipelineResult> {
  const { data, error } = await supabase.functions.invoke('sync-pipeline', {
    body: payload,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Empty sync-pipeline response' };
  }

  const row = data as Record<string, unknown>;
  if (row.success === false) {
    return { success: false, error: String(row.error ?? 'Sync failed') };
  }

  if (row.success !== true) {
    return { success: false, error: 'Unexpected sync-pipeline response' };
  }

  return {
    success: true,
    action: payload.action,
    bookingId: payload.bookingId,
    sheets_row_id: row.sheets_row_id != null ? String(row.sheets_row_id) : undefined,
    pdf_url: typeof row.pdf_url === 'string' ? row.pdf_url : undefined,
    drive_url: typeof row.drive_url === 'string' ? row.drive_url : undefined,
  };
}

/** Forward legacy sheet payloads through the edge bridge (no direct GAS fetch). */
export async function forwardSheetPayload(
  action: SyncPipelineAction,
  bookingId: string,
  legacy: Record<string, unknown>
): Promise<SyncPipelineResult> {
  return invokeSyncPipeline({ action, bookingId, data: legacy });
}
