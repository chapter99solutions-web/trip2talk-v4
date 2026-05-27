import { ClientTier } from '../../types/tour';

const STYLES: Record<ClientTier, string> = {
  VVIP: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  VIP: 'text-violet-400 bg-violet-400/10 border-violet-400/30',
  STANDARD: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/30',
};

export default function TierBadge({ tier }: { tier: ClientTier }) {
  return (
    <span className={`cyber-badge px-2 py-0.5 rounded border ${STYLES[tier]}`}>
      {tier}
    </span>
  );
}
