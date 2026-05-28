import type { TripItineraryDay } from '../../lib/tripsSheetApi';

function Slot({
  icon,
  label,
  text,
}: {
  icon: string;
  label: string;
  text: string;
}) {
  if (!text?.trim()) return null;
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-9 h-9 rounded-2xl bg-white border border-sage-100 flex items-center justify-center">
        <span aria-hidden className="text-lg">
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-[#9A9A9A] font-semibold">{label}</p>
        <p className="text-[14px] leading-[1.7] text-[#1C1C1E] whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

export default function ItineraryTimeline({
  days,
  title = 'Travel Timeline',
}: {
  days: TripItineraryDay[];
  title?: string;
}) {
  if (!days?.length) return null;

  return (
    <section className="mt-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.25em] text-[#9A9A9A] uppercase">Itinerary</p>
          <h2 className="text-[18px] font-bold text-[#1C1C1E] mt-1">{title}</h2>
        </div>
      </div>

      <div className="relative pl-4 space-y-4">
        <div className="absolute left-[10px] top-0 bottom-0 w-px bg-sage-100" aria-hidden />

        {days.map((d) => (
          <div key={d.dayNumber} className="relative">
            <div
              className="absolute left-[2px] top-6 w-4 h-4 rounded-full bg-white border border-sage-200 shadow-sm"
              aria-hidden
            />

            <div className="bg-white rounded-[28px] border border-sage-100 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <p className="text-[12px] font-bold tracking-wide text-[#1C1C1E]">
                    Day {d.dayNumber}
                  </p>
                  <span className="text-[11px] font-semibold text-slate-500 bg-sage-50 border border-sage-100 px-3 py-1 rounded-full">
                    Road Trip
                  </span>
                </div>

                <div className="space-y-4">
                  <Slot icon="🌤️" label="Morning" text={d.morning} />
                  <Slot icon="🚗" label="Afternoon" text={d.afternoon} />
                  <Slot icon="📸" label="Evening" text={d.evening} />
                  <Slot icon="🌌" label="Night" text={d.night} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

