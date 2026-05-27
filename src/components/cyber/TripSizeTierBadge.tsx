import { TripSizeTier, TRIP_SIZE_TIERS } from '../../lib/bookingPolicy';

const STYLES: Record<TripSizeTier, string> = {
  STANDARD: 'text-[color:var(--teal)] bg-[color:var(--teal)]/10 border-[color:var(--teal)]/30',
  PRIVATE: 'text-[color:var(--gold)] bg-[color:var(--gold)]/10 border-[color:var(--gold)]/30',
};

export default function TripSizeTierBadge({ tier }: { tier: TripSizeTier }) {
  const meta = TRIP_SIZE_TIERS[tier];
  return (
    <span className={`cyber-badge px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wide ${STYLES[tier]}`}>
      {meta.tierLabel}
    </span>
  );
}
