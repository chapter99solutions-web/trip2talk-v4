import { supabase } from './supabase';

export class BookingDuplicateEmailError extends Error {
  readonly reason = 'already_booked';

  constructor() {
    super('อีเมลนี้จองทริปนี้ไปแล้ว');
    this.name = 'BookingDuplicateEmailError';
  }
}

/** RPC check_booking_allowed — requires supabase/booking-one-per-email.sql on the project. */
export async function assertBookingAllowed(email: string, tripCode: string): Promise<void> {
  const trimmedEmail = email.trim();
  const code = tripCode.trim().toUpperCase();
  if (!trimmedEmail || !code) return;

  const { data, error } = await supabase.rpc('check_booking_allowed', {
    p_email: trimmedEmail,
    p_tour_code: code,
  });

  if (error) {
    if (/check_booking_allowed|42883|does not exist/i.test(error.message)) {
      console.warn('[Trip2Talk] check_booking_allowed RPC missing — run supabase/booking-one-per-email.sql');
      return;
    }
    throw new Error(error.message);
  }

  const row = data as { ok?: boolean; reason?: string } | null;
  if (row?.ok === false && row.reason === 'already booked') {
    throw new BookingDuplicateEmailError();
  }
}
