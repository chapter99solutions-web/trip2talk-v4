import { supabase } from './supabase';

export type GoogleSheetsAppendRequest = {
  /** Optional sheet/tab name override. */
  sheetName?: string;
  /** Values appended as one row. */
  values: Array<string | number>;
};

/**
 * Minimal client wrapper around the `google-workspace-sync` edge function.
 * The edge function owns auth + spreadsheet routing.
 */
export async function appendRowToGoogleSheet(input: GoogleSheetsAppendRequest): Promise<{
  success: boolean;
  spreadsheetUrl?: string;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke('google-workspace-sync', {
    body: {
      action: 'APPEND_ROW',
      taxYear: input.sheetName,
      payload: { values: input.values },
    },
  });

  if (error) return { success: false, error: error.message };
  if (data && typeof data === 'object' && 'success' in data && !(data as any).success) {
    return { success: false, error: (data as any).error ?? 'Google Sheets append failed' };
  }
  return { success: true, spreadsheetUrl: (data as any)?.spreadsheetUrl };
}

