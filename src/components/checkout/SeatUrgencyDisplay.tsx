type Props = {
  seatsRemaining: number | null;
  maxPax: number;
  /** Larger padding when used as a page-level banner. */
  variant?: 'card' | 'banner';
};

export function isTripSoldOut(seatsRemaining: number | null): boolean {
  return seatsRemaining === 0;
}

export default function SeatUrgencyDisplay({
  seatsRemaining,
  maxPax,
  variant = 'card',
}: Props) {
  const banner = variant === 'banner';
  const urgent1Class = banner ? 'text-amber-300' : 'text-amber-600';
  const urgent2Class = banner ? 'text-amber-200' : 'text-amber-500';
  const calmClass = banner ? 'text-white/95' : 'text-slate-800';

  if (seatsRemaining === 0) {
    return (
      <div
        className={`rounded-2xl border-2 border-red-400 bg-red-50 text-center ${
          banner ? 'px-5 py-4' : 'px-3 py-3'
        }`}
        role="status"
      >
        <p
          className={`font-bold leading-snug text-red-700 ${
            banner ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
          }`}
        >
          🔴 เต็มแล้ว! ทริปนี้ปิดรับจองแล้ว
        </p>
      </div>
    );
  }

  if (seatsRemaining === 1) {
    return (
      <p
        className={`font-bold leading-snug ${urgent1Class} ${
          banner ? 'text-xl sm:text-2xl text-center' : 'text-lg sm:text-xl'
        }`}
        role="status"
      >
        🔥 เหลือ 1 ที่สุดท้าย! จองก่อนหมด
      </p>
    );
  }

  if (seatsRemaining === 2) {
    return (
      <p
        className={`font-bold leading-snug ${urgent2Class} ${
          banner ? 'text-lg sm:text-xl text-center' : 'text-base sm:text-lg'
        }`}
        role="status"
      >
        ⚡ เหลือแค่ 2 ที่เท่านั้น!
      </p>
    );
  }

  if (seatsRemaining != null && seatsRemaining >= 3) {
    return (
      <p
        className={`font-semibold ${calmClass} ${banner ? 'text-base sm:text-lg text-center' : 'text-base'}`}
        role="status"
      >
        เหลือ {seatsRemaining} ที่ · max {maxPax}
      </p>
    );
  }

  return (
    <p className="font-medium text-slate-800" role="status">
      Max {maxPax} pax
    </p>
  );
}
