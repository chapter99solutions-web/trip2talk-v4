import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TripSheetRow } from '../../lib/tripsSheetApi';
import { getPublicTripDisplay } from '../../lib/publicTripDisplay';
import {
  buildTripDatePills,
  filterTripsByDatePill,
  type TripDatePill,
} from '../../lib/tripDisplay';
import TripDateFilterPills from './TripDateFilterPills';
import TripStackCard from './TripStackCard';

type Props = {
  trips: TripSheetRow[];
  saved: Set<string>;
  onToggleSave: (tourCode: string) => void;
};

export default function MobileTripStack({ trips, saved, onToggleSave }: Props) {
  const pills = useMemo(() => buildTripDatePills(trips), [trips]);
  const [activePillId, setActivePillId] = useState('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStart = useRef<number | null>(null);

  const activePill = useMemo(
    () => pills.find((p) => p.id === activePillId) ?? pills[0] ?? ({ id: 'all', label: 'All dates', tourCodes: [] } as TripDatePill),
    [pills, activePillId]
  );

  const filtered = useMemo(() => filterTripsByDatePill(trips, activePill), [trips, activePill]);

  useEffect(() => {
    setActiveIndex(0);
  }, [activePillId, filtered.length]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!filtered.length) return;
      setActiveIndex((i) => (i + dir + filtered.length) % filtered.length);
    },
    [filtered.length]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null || filtered.length < 2) return;
    const end = e.changedTouches[0]?.clientX ?? touchStart.current;
    const delta = end - touchStart.current;
    if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
    touchStart.current = null;
  };

  if (!trips.length) return null;

  const layerCount = Math.min(3, filtered.length);
  const stackLayers = Array.from({ length: layerCount }, (_, offset) => {
    const idx = (activeIndex + offset) % filtered.length;
    return { tour: filtered[idx], stackDepth: offset, cardIndex: idx };
  });

  return (
    <div className="md:hidden">
      <TripDateFilterPills pills={pills} activeId={activePillId} onChange={setActivePillId} />

      <div
        className="relative mx-4 mt-4 h-[min(72vh,520px)]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-16">No trips for this date window.</p>
        ) : (
          stackLayers.map(({ tour, stackDepth, cardIndex }) => (
            <TripStackCard
              key={`${tour.tourCode}-${cardIndex}-${stackDepth}`}
              tour={tour}
              saved={saved.has(tour.tourCode)}
              onToggleSave={() => onToggleSave(tour.tourCode)}
              stackDepth={stackDepth}
              isActive={stackDepth === 0}
              onActivate={() => setActiveIndex(cardIndex)}
            />
          ))
        )}
      </div>

      {filtered.length > 1 && (
        <div className="flex gap-1.5 justify-center mt-4" role="tablist" aria-label="Trip carousel">
          {filtered.map((t, i) => (
            <button
              key={t.tourCode}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Show ${getPublicTripDisplay(t).title}`}
              onClick={() => setActiveIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex ? 'w-6 h-2 bg-neutral-950' : 'w-2 h-2 bg-neutral-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
