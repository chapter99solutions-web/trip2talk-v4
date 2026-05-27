import { FormEvent, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { formatAUD } from '../lib/payidCalc';
import { findTripById } from '../lib/publicTours';
import { quoteTripTotal, resolveTripSizeTier } from '../lib/bookingPolicy';
import TripSizeTierBadge from '../components/cyber/TripSizeTierBadge';
import BookingPolicyPanel from '../components/policy/BookingPolicyPanel';

export default function BookingCheckout() {
  const { tourId } = useParams<{ tourId: string }>();
  const [search] = useSearchParams();
  const trip = tourId ? findTripById(tourId) : undefined;
  const initialPax = Math.min(6, Math.max(2, Number(search.get('pax')) || 4));
  const [partyPax, setPartyPax] = useState(initialPax);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const quote = useMemo(
    () => (trip ? quoteTripTotal(trip.price_aud, partyPax) : null),
    [trip, partyPax]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!quote?.valid) return;
    setSubmitted(true);
  };

  if (!trip) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-red-400">
        Trip not found. <Link to="/" className="text-[color:var(--teal)]">Home</Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-4xl text-[color:var(--teal)]">✓</div>
        <h1 className="font-serif text-xl text-[color:var(--gold)]">Booking request received</h1>
        <p className="text-sm text-neutral-400">
          We will confirm your Private Photo Journey and send PayID details to {email}.
        </p>
        <Link to={`/trip/${trip.trip_code}`} className="cyber-btn-gold inline-block">
          Open trip hub
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <Link to={`/tours/${tourId}`} className="text-xs text-neutral-500 hover:text-[color:var(--teal)]">
        ← Trip details
      </Link>

      <h1 className="font-serif text-2xl text-[color:var(--gold)]">Checkout</h1>
      <p className="font-mono text-sm text-neutral-400">{trip.trip_code} · {trip.destination}</p>

      {quote?.tier && <TripSizeTierBadge tier={quote.tier} />}

      <form onSubmit={handleSubmit} className="cyber-card p-5 space-y-4">
        <BookingPolicyPanel
          tour={trip}
          partyPax={partyPax}
          onPartyPaxChange={setPartyPax}
          paidAud={quote?.valid ? quote.totalAud : 0}
          compact
        />

        <div>
          <label className="text-xs text-neutral-500 block mb-1">Full name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="cyber-input"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 block mb-1">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="cyber-input"
          />
        </div>

        {quote?.valid && (
          <p className="text-center font-mono text-lg text-[color:var(--teal)]">
            Total {formatAUD(quote.totalAud)}
            {resolveTripSizeTier(partyPax) === 'PRIVATE' && (
              <span className="block text-[10px] text-neutral-500 mt-1">Guaranteed Departure</span>
            )}
          </p>
        )}

        <button type="submit" disabled={!quote?.valid} className="cyber-btn-gold disabled:opacity-40">
          Request booking
        </button>
      </form>
    </div>
  );
}
