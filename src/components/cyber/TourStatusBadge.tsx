import { TourStatus } from '../../types/tour';

const STYLES: Record<TourStatus, string> = {
  CONFIRMED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  ACTIVE: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  PLANNING: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/30',
  COMPLETED: 'text-neutral-500 bg-neutral-500/10 border-neutral-500/30',
  CANCELLED: 'text-red-400 bg-red-400/10 border-red-400/30',
};

export default function TourStatusBadge({ status }: { status: TourStatus }) {
  return (
    <span className={`cyber-badge px-2 py-0.5 rounded-full border ${STYLES[status]}`}>
      {status}
    </span>
  );
}
