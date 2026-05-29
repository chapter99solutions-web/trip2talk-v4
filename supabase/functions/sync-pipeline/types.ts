/** Contract: client → sync-pipeline edge → Google Apps Script */
export type SyncPipelineAction = 'sync_booking' | 'sync_waiver' | 'sync_receipt';

export interface SyncPipelineRequest {
  action: string;
  bookingId: string;
  data: Record<string, unknown>;
}

export interface GasBridgeResponse {
  ok?: boolean;
  success?: boolean;
  error?: string;
  sheets_row_id?: string | number;
  sheetRowId?: string | number;
  pdf_url?: string;
  drive_url?: string;
}

export interface SyncPipelineSuccess {
  success: true;
  action: SyncPipelineAction;
  bookingId: string;
  sheets_row_id?: string;
  pdf_url?: string;
  drive_url?: string;
}

export interface SyncPipelineFailure {
  success: false;
  error: string;
}
