import { supabase } from './supabase';

export interface NotificationPayload {
  client_name: string;
  client_email?: string;
  client_phone?: string;
  trip_code: string;
  amount_aud: number;
  reference_number: string;
  payment_method: string;
  booking_status?: string;
}

export const dispatchTransactionNotification = async (
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-trip-receipt', {
      body: {
        ...payload,
        client_email: payload.client_email ?? '',
        client_phone: payload.client_phone ?? '',
      },
    });
    if (error) throw error;
    console.log('[Trip2Talk] Receipt sent:', data);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      '[Trip2Talk] Receipt notification skipped (Edge Function not configured):',
      message
    );
    return { success: false, error: message };
  }
};
