import { Link, useParams } from 'react-router-dom';
import { findTripByRef } from '../lib/publicTours';
import ClientTripWizard from '../components/client/ClientTripWizard';

/** Client trip hub — 4-step onboarding + waivers (/trip/:bookingRef) */
export default function ClientVIPHubPage() {
  const { bookingRef } = useParams<{ bookingRef: string }>();
  const trip = bookingRef ? findTripByRef(bookingRef) : undefined;

  if (!trip || !bookingRef) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center bg-white min-h-screen">
        <p className="text-red-600">Trip reference not found.</p>
        <Link to="/" className="text-emerald-600 text-sm mt-4 inline-block">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <ClientTripWizard trip={trip} tripRef={bookingRef} />
        <p className="text-center mt-8 text-xs text-slate-400">
          <Link to={`/album/${trip.id}`} className="text-emerald-600 hover:underline">
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
