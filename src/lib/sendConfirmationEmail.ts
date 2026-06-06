export type ConfirmationEmailPayload = {
  /** Supabase tour_bookings.id (UUID) */
  bookingId: string;
  /** Customer-facing reference (e.g. BK-…) */
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  tripName: string;
  tripCode: string;
  departureDate: string;
  pax: number;
  totalAud: number;
  pickupPoint?: string;
  payId?: string;
};

export type ConfirmationEmailResult = {
  success: boolean;
  error?: string;
};

/** POST booking confirmation via Vercel /api/send-confirmation (Resend). */
export async function sendConfirmationEmail(
  payload: ConfirmationEmailPayload
): Promise<ConfirmationEmailResult> {
  try {
    const res = await fetch('/api/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean };

    if (!res.ok || !json.success) {
      return { success: false, error: json.error ?? `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to send email' };
  }
}
