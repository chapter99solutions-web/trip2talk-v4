import { useMemo, useState } from 'react';

type PillTag = { icon: string; label: string };

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function GlassWeatherPill({
  label = 'Weather',
  tempC,
}: {
  label?: string;
  tempC: number;
}) {
  return (
    <div className="rounded-full border border-white/25 bg-white/15 backdrop-blur-md px-3 py-1.5 shadow-sm text-white">
      <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide">
        <span aria-hidden>☀️</span>
        {label} {tempC}°C
      </span>
    </div>
  );
}

function SoftTag({ tag }: { tag: PillTag }) {
  return (
    <button
      type="button"
      className="shrink-0 inline-flex items-center gap-2 rounded-full border border-sage-100 bg-white px-3 py-2 text-xs font-semibold text-[#1C1C1E] shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
    >
      <span aria-hidden>{tag.icon}</span>
      <span className="whitespace-nowrap">{tag.label}</span>
    </button>
  );
}

function MetaChip({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-white/85">
      <span aria-hidden>{icon}</span>
      {text}
    </span>
  );
}

function PrimaryPillButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full bg-black text-white px-6 py-3 text-sm font-semibold tracking-wide shadow-lg shadow-black/20 hover:-translate-y-0.5 hover:bg-neutral-900 transition-all"
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="w-10 h-10 rounded-full border border-sage-100 bg-white shadow-sm flex items-center justify-center text-[#1C1C1E] hover:-translate-y-0.5 transition-all"
    >
      {children}
    </button>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ActiveTripHomeScreen({
  name,
  tempC,
  tags,
  heroImageUrl,
  tripTitle,
  tripSubtitle,
  durationLabel,
  distanceLabel,
  capacityLabel,
  onStartTrip,
}: {
  name: string;
  tempC: number;
  tags: PillTag[];
  heroImageUrl: string;
  tripTitle: string;
  tripSubtitle: string;
  durationLabel: string;
  distanceLabel: string;
  capacityLabel: string;
  onStartTrip?: () => void;
}) {
  return (
    <div className="min-h-screen bg-sage-50 text-[#1C1C1E] font-sans pb-24">
      <div className="max-w-md mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[#6B6B6B] font-medium">Hi,</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {name} <span aria-hidden>👋</span>
            </h1>
          </div>
          <div className="rounded-full border border-sage-100 bg-white/80 backdrop-blur px-3 py-2 shadow-sm">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#1C1C1E]">
              <span aria-hidden>☀️</span> Weather {tempC}°C
            </span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {tags.map((t) => (
            <SoftTag key={t.label} tag={t} />
          ))}
        </div>

        <div className="relative rounded-[32px] overflow-hidden shadow-xl bg-neutral-900">
          <div className="relative aspect-[4/5]">
            <img src={heroImageUrl} alt={tripTitle} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

            <div className="absolute top-4 left-4 right-4 flex justify-between items-start gap-4">
              <GlassWeatherPill tempC={tempC} />
              <button
                type="button"
                aria-label="Favorite"
                className="backdrop-blur-md bg-white/20 rounded-full p-2 text-white shadow-sm hover:bg-white/30 transition-colors"
              >
                ☆
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 text-white space-y-3">
              <div>
                <h2 className="font-serif text-2xl font-semibold leading-tight">{tripTitle}</h2>
                <p className="text-sm text-white/80 leading-relaxed mt-1">{tripSubtitle}</p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <MetaChip icon="📅" text={durationLabel} />
                <MetaChip icon="🗺️" text={distanceLabel} />
                <MetaChip icon="👥" text={capacityLabel} />
              </div>

              <div className="pt-2 flex justify-center">
                <PrimaryPillButton onClick={onStartTrip}>Start Trip</PrimaryPillButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TripExplorerStackScreen({
  heading = 'Popular',
  datePills,
  heroCards,
}: {
  heading?: string;
  datePills: Array<{ id: string; label: string }>;
  heroCards: Array<{ id: string; imageUrl: string; badge: string; title: string; meta: string }>;
}) {
  const [activePill, setActivePill] = useState(datePills[0]?.id ?? '');
  const [activeCard, setActiveCard] = useState(0);

  const filtered = useMemo(() => {
    if (!heroCards.length) return [];
    // UI-only: treat pills as selector but keep same list unless wired by caller
    return heroCards;
  }, [heroCards, activePill]);

  const layers = useMemo(() => {
    const n = Math.min(3, filtered.length);
    return Array.from({ length: n }, (_, i) => {
      const idx = (activeCard + i) % filtered.length;
      return { card: filtered[idx], depth: i, idx };
    });
  }, [filtered, activeCard]);

  return (
    <div className="min-h-screen bg-sage-50 text-[#1C1C1E] font-sans pb-24">
      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <IconButton label="Back">{'←'}</IconButton>
          <IconButton label="Filters">{'⚙'}</IconButton>
        </div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight">{heading}</h1>
        </div>

        <div className="flex overflow-x-auto scrollbar-none gap-3 px-1 py-2">
          {datePills.map((p) => {
            const active = p.id === activePill;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePill(p.id)}
                className={cn(
                  'shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold tracking-wide transition-all',
                  active
                    ? 'bg-black text-white shadow-md'
                    : 'bg-white text-[#1C1C1E] border border-sage-100 hover:-translate-y-0.5'
                )}
              >
                <CalendarIcon className={active ? 'text-white/80' : 'text-[#9A9A9A]'} />
                <span className="whitespace-nowrap">{p.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative h-[min(70vh,520px)]">
          {layers.map(({ card, depth, idx }) => {
            const scale = depth === 0 ? 1 : depth === 1 ? 0.95 : 0.9;
            const translateY = depth === 0 ? 0 : depth === 1 ? -14 : -26;
            const opacity = depth === 0 ? 1 : depth === 1 ? 0.92 : 0.78;
            const interactive = depth === 0;
            return (
              <button
                key={`${card.id}-${depth}`}
                type="button"
                onClick={() => setActiveCard(idx)}
                className="absolute inset-x-0 top-0 text-left"
                style={{
                  zIndex: 30 - depth,
                  transform: `translateY(${translateY}px) scale(${scale})`,
                  opacity,
                  pointerEvents: interactive ? 'auto' : 'none',
                }}
              >
                <div className="relative rounded-[32px] overflow-hidden shadow-xl bg-neutral-900">
                  <div className="aspect-[4/5] relative">
                    <img src={card.imageUrl} alt={card.title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
                    <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
                      <span className="inline-flex items-center rounded-full bg-black/35 backdrop-blur-md border border-white/15 px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-white uppercase">
                        {card.badge}
                      </span>
                      <span className="backdrop-blur-md bg-white/20 rounded-full p-2 text-white shadow-sm">☆</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <h3 className="font-serif text-2xl font-semibold leading-tight">{card.title}</h3>
                      <p className="mt-2 text-sm text-white/80">{card.meta}</p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5 justify-center">
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCard(i)}
              aria-label={`Go to ${c.title}`}
              className={cn('rounded-full transition-all', i === activeCard ? 'w-6 h-2 bg-black' : 'w-2 h-2 bg-neutral-300')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TripDetailGroupScreen({
  bannerUrl,
  countryTag,
  title,
  metaLeft,
  metaRight,
  hotelName,
  hotelNote,
}: {
  bannerUrl: string;
  countryTag: string;
  title: string;
  metaLeft: string;
  metaRight: string;
  hotelName: string;
  hotelNote: string;
}) {
  const avatars = useMemo(() => Array.from({ length: 5 }).map((_, i) => i), []);

  return (
    <div className="min-h-screen bg-sage-50 text-[#1C1C1E] font-sans pb-24">
      <div className="relative">
        <div className="h-[40vh] w-full rounded-b-[32px] overflow-hidden">
          <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-sage-50" />
        </div>

        <div className="absolute top-5 left-4 right-4 flex items-center justify-between">
          <IconButton label="Back">{'←'}</IconButton>
          <IconButton label="Options">{'⋯'}</IconButton>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-14">
        <div className="flex items-center justify-between mb-4">
          <div className="flex -space-x-2 items-center">
            {avatars.map((i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-full border-2 border-sage-50 bg-white shadow-sm grid place-items-center text-xs font-semibold text-[#1C1C1E]"
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
            <span className="ml-3 inline-flex items-center rounded-full border border-sage-100 bg-white px-3 py-1.5 text-xs font-semibold text-[#1C1C1E] shadow-sm">
              +22
            </span>
          </div>
        </div>

        <div className="rounded-[32px] border border-sage-100 bg-white shadow-xl overflow-hidden">
          <div className="p-6">
            <span className="inline-flex items-center rounded-full bg-sage-50 border border-sage-100 px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-[#1C1C1E] uppercase">
              {countryTag}
            </span>
            <h1 className="mt-4 font-serif text-2xl font-semibold leading-tight tracking-tight">{title}</h1>

            <div className="mt-4 flex items-center justify-between text-sm text-[#6B6B6B] font-semibold">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden>📅</span>
                {metaLeft}
              </span>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden>👥</span>
                {metaRight}
              </span>
            </div>
          </div>

          <div className="border-t border-sage-100 p-6">
            <div className="rounded-[24px] border border-sage-100 bg-sage-50 p-4">
              <p className="text-[11px] font-semibold tracking-[0.25em] text-[#9A9A9A] uppercase">Accommodation</p>
              <p className="mt-2 font-semibold text-[#1C1C1E]">{hotelName}</p>
              <p className="mt-1 text-sm text-[#6B6B6B] leading-relaxed">{hotelNote}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

