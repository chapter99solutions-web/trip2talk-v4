import { supabase } from './supabase';

/** GAS router contract (via Supabase Edge only — never fetch GAS from browser). */
export interface GASRequest {
  action: string;
  data: Record<string, unknown>;
}

export interface GASResponse {
  success: boolean;
  sheet_row?: number;
  sheets_row_id?: string;
  pdf_url?: string;
  folder_url?: string;
  file_url?: string;
  drive_url?: string;
  error?: string;
}

type EdgeFn =
  | 'sync-booking-to-sheets'
  | 'sync-waiver-to-sheets'
  | 'sync-receipt-to-sheets'
  | 'sync-delivery-status';

async function invokeEdge(
  fn: EdgeFn,
  body: Record<string, unknown>
): Promise<GASResponse> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) return { success: false, error: error.message };
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Empty edge response' };
  }
  const row = data as Record<string, unknown>;
  if (row.success === false) {
    return { success: false, error: String(row.error ?? 'Sync failed') };
  }
  return {
    success: true,
    sheet_row: typeof row.sheet_row === 'number' ? row.sheet_row : undefined,
    sheets_row_id: row.sheets_row_id != null ? String(row.sheets_row_id) : undefined,
    pdf_url: typeof row.pdf_url === 'string' ? row.pdf_url : undefined,
    folder_url: typeof row.folder_url === 'string' ? row.folder_url : undefined,
    file_url: typeof row.file_url === 'string' ? row.file_url : undefined,
    drive_url: typeof row.drive_url === 'string' ? row.drive_url : undefined,
  };
}

export async function callGAS(action: string, data: Record<string, unknown>): Promise<GASResponse> {
  switch (action) {
    case 'appendBookingRow':
      return invokeEdge('sync-booking-to-sheets', {
        bookingId: String(data.booking_id ?? data.bookingId ?? ''),
        data,
      });
    case 'appendWaiverRow':
    case 'createWaiverPDF':
      return invokeEdge('sync-waiver-to-sheets', {
        bookingId: String(data.booking_id ?? ''),
        waiverSignatureId: data.waiver_signature_id,
        data: { ...data, gas_action: action },
      });
    case 'appendReceiptRow':
    case 'createATOFolder':
      return invokeEdge('sync-receipt-to-sheets', {
        receiptId: data.receipt_id,
        tripId: data.trip_id,
        data: { ...data, gas_action: action },
      });
    case 'updateDeliveryRow':
      return invokeEdge('sync-delivery-status', {
        bookingId: String(data.booking_id ?? ''),
        data,
      });
    default:
      return { success: false, error: `Unknown GAS action: ${action}` };
  }
}

export const syncBookingToSheets = (booking: Record<string, unknown>) =>
  callGAS('appendBookingRow', booking);

export const syncWaiverToSheetsAndDrive = (waiver: Record<string, unknown>) =>
  callGAS('appendWaiverRow', waiver);

export const syncReceiptToDriveAndSheets = (receipt: Record<string, unknown>) =>
  callGAS('appendReceiptRow', receipt);

export const updateDeliveryTrackerSheet = (delivery: Record<string, unknown>) =>
  callGAS('updateDeliveryRow', delivery);
