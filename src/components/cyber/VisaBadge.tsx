import { VisaStatus } from '../../types/tour';

const STYLES: Record<VisaStatus, string> = {
  APPROVED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  PENDING_NZ_VISA: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  SUBMITTED: 'text-sky-400 bg-sky-400/10 border-sky-400/30',
  REJECTED: 'text-red-400 bg-red-400/10 border-red-400/30',
  NOT_REQUIRED: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/30',
};

export default function VisaBadge({ status }: { status: VisaStatus }) {
  return (
    <span className={`cyber-badge px-2 py-0.5 rounded-full border ${STYLES[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
