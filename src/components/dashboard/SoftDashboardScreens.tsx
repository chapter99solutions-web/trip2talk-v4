import { useMemo, useState } from 'react';

type PillTag = { icon: string; label: string };

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

// Premium AU travel placeholders (avoid black/empty cards)
const FALLBACK_HERO_AU =
  'https://images.unsplash.com/photo-1506973035872-a4f23f7a5a4b?w=900&q=80&auto=format&fit=crop';
const FALLBACK_CARD_AU_1 =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80&auto=format&fit=crop';
const FALLBACK_CARD_AU_2 =
  'https://images.unsplash.com/photo-1469854523086-cc02afe5c88?w=900&q=80&auto=format&fit=crop';
const FALLBACK_CARD_AU_3 =
  'https://images.unsplash.com/photo-1459478309853-2c33a60058e7?w=900&q=80&auto=format&fit=crop';

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
  guestsLabel,
  pickupLabel,
  departLabel,
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
  guestsLabel?: string;
  pickupLabel?: string;
  departLabel?: string;
  onStartTrip?: () => void;
}) {
  const heroSrc = heroImageUrl?.trim() || FALLBACK_HERO_AU;
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
            <img src={heroSrc} alt={tripTitle} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
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

              <div className="flex flex-wrap items-center justify-between gap-2">
                {guestsLabel ? (
                  <MetaChip icon="👥" text={guestsLabel} />
                ) : (
                  <MetaChip icon="👥" text={capacityLabel} />
                )}
                {pickupLabel ? <MetaChip icon="📍" text={pickupLabel} /> : <MetaChip icon="🗺️" text={distanceLabel} />}
                {departLabel ? <MetaChip icon="🕐" text={departLabel} /> : <MetaChip icon="📅" text={durationLabel} />}
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
            const imgFallback = depth === 0 ? FALLBACK_CARD_AU_1 : depth === 1 ? FALLBACK_CARD_AU_2 : FALLBACK_CARD_AU_3;
            const cardSrc = card.imageUrl?.trim() || imgFallback;
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
                    <img src={cardSrc} alt={card.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
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
  const bannerSrc = bannerUrl?.trim() || FALLBACK_CARD_AU_2;

  return (
    <div className="min-h-screen bg-sage-50 text-[#1C1C1E] font-sans pb-24">
      <div className="relative">
        <div className="h-[40vh] w-full rounded-b-[32px] overflow-hidden">
          <img src={bannerSrc} alt="" className="w-full h-full object-cover" loading="lazy" />
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
              <p className="mt-2 font-semibold text-[#1C1C1E]">Cradle Mountain Lodge</p>
              <div className="mt-1 space-y-1 text-sm text-[#6B6B6B] leading-relaxed">
                <p className="inline-flex items-center gap-2">
                  <span aria-hidden>📍</span> Tasmania, AU · 4038 Cradle Mountain Rd, Cradle Mountain TAS
                </p>
                <p className="inline-flex items-center gap-2">
                  <span aria-hidden>🗓️</span> Check-in: 27 Mar · Check-out: 7 Apr
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckRow({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input type="checkbox" checked={checked} readOnly className="mt-1 accent-black" />
      <span className="text-sm text-[#1C1C1E] leading-relaxed">
        {label}{' '}
        {checked ? <span className="text-[#6B6B6B] font-semibold">(signed)</span> : null}
      </span>
    </label>
  );
}

export function PassConsentScreen({
  bookingId = 'BK-PREVIEW',
  tripName = 'The Sounds of Nature',
  dateLabel = 'Fri 8 May 2026 · 08:00–Evening',
  paxLabel = '4 guests',
  emergencyName = 'Ploy (Trip Staff)',
  emergencyPhone = '+61 4XX XXX XXX',
}: {
  bookingId?: string;
  tripName?: string;
  dateLabel?: string;
  paxLabel?: string;
  emergencyName?: string;
  emergencyPhone?: string;
}) {
  return (
    <div className="min-h-screen bg-sage-50 text-[#1C1C1E] font-sans pb-24">
      <div className="max-w-md mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#6B6B6B] font-medium">Digital Pass</p>
            <h1 className="text-2xl font-semibold tracking-tight">Pass &amp; Consent</h1>
          </div>
          <div className="rounded-full border border-sage-100 bg-white/80 backdrop-blur px-3 py-2 shadow-sm">
            <span className="text-xs font-semibold text-[#1C1C1E]">🎟️ Active</span>
          </div>
        </div>

        {/* Digital pass card */}
        <div className="rounded-[32px] border border-sage-100 bg-white shadow-xl overflow-hidden">
          <div className="p-6">
            <p className="text-[11px] font-semibold tracking-[0.25em] text-[#9A9A9A] uppercase">Trip2Talk</p>
            <p className="mt-2 font-serif text-2xl font-semibold leading-tight">{tripName}</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-sage-100 bg-sage-50 p-3">
                <p className="text-[11px] text-[#6B6B6B] font-semibold">Booking ID</p>
                <p className="mt-1 font-mono text-sm font-semibold">{bookingId}</p>
              </div>
              <div className="rounded-2xl border border-sage-100 bg-sage-50 p-3">
                <p className="text-[11px] text-[#6B6B6B] font-semibold">Guests</p>
                <p className="mt-1 text-sm font-semibold">{paxLabel}</p>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-sage-100 bg-sage-50 p-3">
              <p className="text-[11px] text-[#6B6B6B] font-semibold">Date</p>
              <p className="mt-1 text-sm font-semibold">{dateLabel}</p>
            </div>
          </div>

          <div className="border-t border-sage-100 p-6">
            <p className="text-[11px] font-semibold tracking-[0.25em] text-[#9A9A9A] uppercase">Consent &amp; waiver</p>
            <div className="mt-3 space-y-3">
              <CheckRow label="I accept the travel photo package terms." checked />
              <CheckRow label="I agree to follow staff safety instructions." checked />
              <CheckRow label="I consent to photo/video capture during the trip." checked />
            </div>
          </div>

          <div className="border-t border-sage-100 p-6">
            <p className="text-[11px] font-semibold tracking-[0.25em] text-[#9A9A9A] uppercase">Emergency contact</p>
            <div className="mt-3 rounded-2xl border border-sage-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#1C1C1E]">{emergencyName}</p>
                <a className="text-sm font-semibold text-sage-700 hover:underline" href={`tel:${emergencyPhone}`}>
                  {emergencyPhone}
                </a>
              </div>
              <p className="mt-1 text-xs text-[#6B6B6B] leading-relaxed">
                If you feel unwell or separated from the group, call immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom action */}
        <div className="pt-1">
          <button
            type="button"
            className="w-full rounded-full bg-black text-white py-3.5 font-semibold tracking-wide shadow-lg shadow-black/20 hover:-translate-y-0.5 transition-all"
            onClick={() => {
              const text = `Trip2Talk Pass\\n${tripName}\\nBooking: ${bookingId}\\n${dateLabel}\\nGuests: ${paxLabel}`;
              if (navigator.share) {
                void navigator.share({ title: 'Trip2Talk Pass', text });
              } else {
                void navigator.clipboard?.writeText(text);
              }
            }}
          >
            Download / Share pass
          </button>
          <p className="mt-2 text-[11px] text-[#9A9A9A] text-center">
            Tip: if Share isn’t available, the pass text will be copied to clipboard.
          </p>
        </div>
      </div>
    </div>
  );
}

