import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { findTripByRef } from '../lib/publicTours';
import ClientTripWizard from '../components/client/ClientTripWizard';
import { supabase } from '../lib/supabase';

/** Client trip hub — 4-step onboarding + waivers (/trip/:bookingRef) */
export default function ClientVIPHubPage() {
  const { bookingRef } = useParams<{ bookingRef: string }>();
  const trip = bookingRef ? findTripByRef(bookingRef) : undefined;
  const [booking, setBooking] = useState<{ preferred_pickup?: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!bookingRef) return;
      // Best-effort: bookingRef is sometimes a trip_code in demo. Only query DB when it looks like a booking reference.
      if (!/^BK-/i.test(bookingRef)) return;

      const { data } = await supabase
        .from('tour_bookings')
        .select('preferred_pickup')
        .eq('reference_number', bookingRef)
        .maybeSingle();

      if (!cancelled) setBooking((data as { preferred_pickup?: string | null } | null) ?? null);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [bookingRef]);

  if (!trip || !bookingRef) {
    return (
      <div className="min-h-screen bg-navy text-white px-4 py-16">
        <div className="max-w-lg mx-auto text-center rounded-2xl bg-[#132333] border border-white/10 p-6">
          <p className="text-red-300">Trip reference not found.</p>
          <Link to="/" className="text-teal text-sm mt-4 inline-block hover:underline">
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy px-4 py-8 text-white">
      <div className="max-w-lg mx-auto">
        <ClientTripWizard trip={trip} tripRef={bookingRef} booking={booking} />
        <p className="text-center mt-8 text-xs text-white/60">
          <Link to={`/album/${trip.id}`} className="text-teal hover:underline">
            Album delivery
          </Link>
          {' · '}
          <Link to="/terms" className="hover:underline">
            Photo terms
          </Link>
        </p>
      </div>
    </div>
  );
}
