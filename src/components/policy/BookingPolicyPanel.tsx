import { useMemo, useState } from 'react';
import { Tour } from '../../types/tour';
import { useI18n } from '../../lib/i18n';
import {
  CANCELLATION_POLICY,
  TRIP_TIER_POLICY,
  CancellationBy,
  calcRefundAmount,
  calcRefundPercent,
  daysUntilTripStart,
  formatRefundPolicyLine,
  quoteTripTotal,
  resolveTripSizeTier,
  TRIP_SIZE_TIERS,
} from '../../lib/bookingPolicy';
import { formatAUD } from '../../lib/payidCalc';
import TripSizeTierBadge from '../cyber/TripSizeTierBadge';

type Props = {
  tour?: Tour | null;
  partyPax?: number;
  onPartyPaxChange?: (pax: number) => void;
  paidAud?: number;
  compact?: boolean;
};

export default function BookingPolicyPanel({
  tour,
  partyPax = 4,
  onPartyPaxChange,
  paidAud = 0,
  compact = false,
}: Props) {
  const { lang } = useI18n();
  const L = lang === 'TH' ? 'TH' : 'EN';
  const tierCopy = TRIP_TIER_POLICY[L];
  const cancelCopy = CANCELLATION_POLICY[L];

  const [cancelledBy, setCancelledBy] = useState<CancellationBy>('CUSTOMER');

  const tier = resolveTripSizeTier(partyPax);
  const quote = tour ? quoteTripTotal(tour.price_aud, partyPax) : null;

  const refundPreview = useMemo(() => {
    if (!tour) return null;
    const days = daysUntilTripStart(tour.start_date);
    const pct = calcRefundPercent(cancelledBy, days);
    const refund = paidAud > 0 ? calcRefundAmount(paidAud, pct) : null;
    return { days, pct, refund };
  }, [tour, cancelledBy, paidAud]);

  return (
    <div className={`space-y-4 ${compact ? 'text-xs' : 'text-sm'}`}>
      <section className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <h3 className="font-semibold text-[color:var(--gold)] font-serif">{tierCopy.title}</h3>
        <p className="text-neutral-300 font-sans">{tierCopy.standard}</p>
        <p className="text-neutral-300 font-sans">{tierCopy.private}</p>
        {onPartyPaxChange && (
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <label className="font-sans text-neutral-500">
              {L === 'TH' ? 'จำนวนผู้เดินทาง' : 'Party size'}
            </label>
            <input
              type="number"
              min={1}
              max={6}
              value={partyPax}
              onChange={(e) => onPartyPaxChange(Number(e.target.value))}
              className="w-16 cyber-input text-center py-1"
            />
            {tier ? (
              <TripSizeTierBadge tier={tier} />
            ) : (
              <span className="text-red-400 font-sans text-xs">
                {L === 'TH' ? 'ต้อง 1–3 หรือ 4–6 คน' : 'Must be 1–3 or 4–6 guests'}
              </span>
            )}
          </div>
        )}
        {quote?.valid && tour && (
          <p className="font-mono text-[color:var(--teal)] text-xs pt-1">
            {formatAUD(quote.perPersonAud)} / {L === 'TH' ? 'คน' : 'pax'} · {L === 'TH' ? 'รวม' : 'total'}{' '}
            {formatAUD(quote.totalAud)}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
        <h3 className="font-semibold text-[color:var(--gold)] font-serif">{cancelCopy.title}</h3>
        <p className="text-neutral-300 font-sans">{cancelCopy.owner}</p>
        <ul className="list-disc list-inside text-neutral-400 font-sans space-y-1">
          {cancelCopy.customerRows.map((row) => (
            <li key={row}>{row}</li>
          ))}
        </ul>

        {tour && !compact && (
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="flex flex-wrap gap-2">
              {(['CUSTOMER', 'OWNER'] as CancellationBy[]).map((who) => (
                <button
                  key={who}
                  type="button"
                  onClick={() => setCancelledBy(who)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono border ${
                    cancelledBy === who
                      ? 'bg-[color:var(--teal)] text-[color:var(--navy)] border-transparent'
                      : 'border-white/15 text-neutral-400'
                  }`}
                >
                  {who === 'OWNER'
                    ? L === 'TH'
                      ? 'พี่แสน'
                      : 'Owner'
                    : L === 'TH'
                      ? 'ลูกค้า'
                      : 'Client'}
                </button>
              ))}
            </div>
            {refundPreview && (
              <p className="font-mono text-xs text-neutral-300">
                {formatRefundPolicyLine(cancelledBy, refundPreview.days, L)}
                {refundPreview.refund != null && (
                  <span className="text-[color:var(--teal)]"> · {formatAUD(refundPreview.refund)}</span>
                )}
              </p>
            )}
          </div>
        )}
      </section>

      {!compact && (
        <p className="text-[10px] text-neutral-600 font-sans">
          {TRIP_SIZE_TIERS.STANDARD.tierLabel} ({TRIP_SIZE_TIERS.STANDARD.paxMin}–
          {TRIP_SIZE_TIERS.STANDARD.paxMax}) · {TRIP_SIZE_TIERS.PRIVATE.tierLabel} (
          {TRIP_SIZE_TIERS.PRIVATE.paxMin}–{TRIP_SIZE_TIERS.PRIVATE.paxMax})
        </p>
      )}
    </div>
  );
}
