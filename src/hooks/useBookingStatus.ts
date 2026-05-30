import { useEffect, useState } from 'react';

export type IntakeStatus = 'loading' | 'Pending' | 'Completed' | 'not_found';

export interface BookingInfo {
  bookingId: string;
  tourCode: string;
  customerName: string;
  bookingStatus: string;
  intakeStatus: 'Pending' | 'Completed';
  checkedIn: boolean;
}

export function useBookingStatus(bookingId: string | null) {
  const [status, setStatus] = useState<IntakeStatus>('loading');
  const [booking, setBooking] = useState<BookingInfo | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setStatus('not_found');
      setBooking(null);
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setBooking(null);

    fetch(`/api/booking/status?bookingId=${encodeURIComponent(bookingId)}`, { cache: 'no-store' })
      .then(async (r) => {
        const data = (await r.json()) as BookingInfo & { error?: string };
        if (cancelled) return;
        if (!r.ok || data.error || !data.bookingId) {
          setStatus('not_found');
          setBooking(null);
          return;
        }
        const intakeRaw = String(data.intakeStatus || '').toLowerCase();
        const intake: 'Pending' | 'Completed' = intakeRaw === 'completed' ? 'Completed' : 'Pending';
        setBooking({ ...data, intakeStatus: intake });
        setStatus(intake);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('not_found');
          setBooking(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  return { status, booking };
}
