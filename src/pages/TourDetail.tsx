import { Link, useParams } from 'react-router-dom';
import { formatAUD } from '../lib/payidCalc';
import { findTripById } from '../lib/publicTours';
import { quoteTripTotal } from '../lib/bookingPolicy';
import TripSizeTierBadge from '../components/cyber/TripSizeTierBadge';
import { useState } from 'react';

export default function TourDetail() {
  const { tourId } = useParams<{ tourId: string }>();
  const trip = tourId ? findTripById(tourId) : undefined;
  const [partyPax, setPartyPax] = useState(4);

  if (!trip) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-red-400 font-sans">Trip not found.</p>
        <Link to="/" className="inline-block mt-4 text-[color:var(--teal)] text-sm">
          ← Back to journeys
        </Link>
      </div>
    );
  }

  const quote = quoteTripTotal(trip.price_aud, partyPax);

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <Link to="/" className="text-xs text-neutral-500 hover:text-[color:var(--teal)]">
        ← All journeys
      </Link>

      <header>
        <p className="font-mono text-xs text-[color:var(--teal)]">{trip.trip_code}</p>
        <h1 className="font-serif text-2xl font-semibold text-[color:var(--gold)] mt-1">
          {trip.destination}
        </h1>
        <p className="text-sm text-neutral-400 mt-2 font-mono">
          {trip.start_date} — {trip.end_date}
        </p>
      </header>

      <div className="cyber-card p-5 space-y-4">
        <p className="text-sm text-neutral-300">
          List price <span className="font-mono text-[color:var(--gold)]">{formatAUD(trip.price_aud)}</span>{' '}
          per person
        </p>

        <div>
          <label className="text-xs text-neutral-500 block mb-2">Party size (2–6)</label>
          <input
            type="number"
            min={2}
            max={6}
            value={partyPax}
            onChange={(e) => setPartyPax(Number(e.target.value))}
            className="cyber-input w-24 text-center"
          />
          {quote.tier && (
            <div className="mt-2 flex items-center gap-2">
              <TripSizeTierBadge tier={quote.tier} />
              {quote.valid && (
                <span className="font-mono text-sm text-[color:var(--teal)]">
                  Total {formatAUD(quote.totalAud)}
                </span>
              )}
            </div>
          )}
          {!quote.valid && (
            <p className="text-xs text-red-400 mt-2">Party must be 2–3 (Private) or 4–6 (Standard).</p>
          )}
        </div>

        <Link
          to={`/book/${trip.id}?pax=${partyPax}`}
          className={`cyber-btn-gold block text-center ${!quote.valid ? 'pointer-events-none opacity-40' : ''}`}
        >
          Book this journey
        </Link>
      </div>

      <p className="text-xs text-neutral-500 text-center">
        <Link to="/package-terms" className="underline hover:text-[color:var(--teal)]">
          Package & cancellation terms
        </Link>
      </p>
    </div>
  );
}
