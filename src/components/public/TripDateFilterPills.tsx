import type { TripDatePill } from '../../lib/tripDisplay';

type Props = {
  pills: TripDatePill[];
  activeId: string;
  onChange: (id: string) => void;
};

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function TripDateFilterPills({ pills, activeId, onChange }: Props) {
  return (
    <div
      className="flex overflow-x-auto scrollbar-none gap-3 px-4 py-2 snap-x snap-mandatory"
      role="tablist"
      aria-label="Filter trips by date"
    >
      {pills.map((pill) => {
        const active = pill.id === activeId;
        return (
          <button
            key={pill.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(pill.id)}
            className={`shrink-0 snap-start inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-300 ${
              active
                ? 'bg-neutral-950 text-white shadow-md'
                : 'bg-[#F5F5F4] text-neutral-800 border border-neutral-200/80 hover:bg-white'
            }`}
          >
            <CalendarIcon className={active ? 'text-white/80' : 'text-neutral-500'} />
            <span className="whitespace-nowrap">{pill.label}</span>
          </button>
        );
      })}
    </div>
  );
}
