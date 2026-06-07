import { formatAUD } from '../../lib/payidCalc';
import type { CheckoutTripSummary } from '../../lib/checkoutTripSummary';
import SeatUrgencyDisplay from './SeatUrgencyDisplay';

type Props = {
  summary: CheckoutTripSummary;
};

export default function CheckoutTripSummaryCard({ summary }: Props) {
  const seatsRemaining = summary.seatsLeft;
  const soldOut = seatsRemaining === 0;

  return (
    <article className="rounded-2xl border border-sage-200 bg-sage-50 overflow-hidden shadow-sm">
      <div className="flex gap-4 p-4 sm:p-5">
        {summary.coverImageUrl ? (
          <img
            src={summary.coverImageUrl}
            alt=""
            loading="eager"
            decoding="async"
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover shrink-0 border border-sage-200 bg-white"
          />
        ) : null}

        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-lg sm:text-xl font-semibold text-slate-900 leading-snug">
            {summary.tourName}
          </h2>
          <p className="mt-1 font-mono text-xs text-slate-500">{summary.tripCode}</p>
          <p className="mt-2 text-sm text-slate-600 line-clamp-2">
            <span className="font-medium text-slate-800">{summary.destination}</span>
            <span className="text-slate-400 mx-1.5" aria-hidden>
              ·
            </span>
            {summary.durationLabel}
          </p>
          <p className="mt-2 text-base sm:text-lg font-bold text-teal-dark">
            {formatAUD(summary.priceAud)}
            <span className="text-sm font-medium text-slate-500"> / person</span>
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 sm:px-5 pb-4 sm:pb-5 text-sm border-t border-sage-200/80 pt-4">
        <div className="rounded-xl bg-white/70 border border-sage-100 px-3 py-2.5">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Departure
          </dt>
          <dd className="mt-0.5 font-medium text-slate-800">{summary.departureLabel}</dd>
        </div>
        <div
          className={`rounded-xl bg-white/70 border px-3 py-2.5 ${
            soldOut ? 'border-red-200 sm:col-span-2' : 'border-sage-100'
          }`}
        >
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Seats
          </dt>
          <dd className="mt-1">
            <SeatUrgencyDisplay
              seatsRemaining={seatsRemaining}
              maxPax={summary.maxPax}
            />
          </dd>
        </div>
      </dl>
    </article>
  );
}
