import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CROSSFADE_MS = 700;
const AUTO_MS = 4000;
const SWIPE_THRESHOLD_PX = 48;

type Props = {
  images: string[];
  title?: string;
  subtitle?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function CinematicGallerySlideshow({
  images,
  title = 'Gallery',
  subtitle = 'Moments from the road',
}: Props) {
  const list = images.filter(Boolean);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setCurrent(0);
  }, [list.length]);

  useEffect(() => {
    if (paused || list.length < 2) return;
    const id = window.setInterval(() => {
      setCurrent((c) => (c + 1) % list.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, list.length]);

  const go = useCallback(
    (idx: number) => {
      if (!list.length) return;
      setCurrent(clamp(idx, 0, list.length - 1));
    },
    [list.length],
  );

  const prev = useCallback(() => {
    if (!list.length) return;
    setCurrent((c) => (c - 1 + list.length) % list.length);
  }, [list.length]);

  const next = useCallback(() => {
    if (!list.length) return;
    setCurrent((c) => (c + 1) % list.length);
  }, [list.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    setPaused(true);
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    const endX = e.changedTouches[0]?.clientX;
    if (start == null || endX == null) {
      window.setTimeout(() => setPaused(false), 1200);
      return;
    }
    const delta = endX - start;
    if (delta > SWIPE_THRESHOLD_PX) prev();
    else if (delta < -SWIPE_THRESHOLD_PX) next();
    window.setTimeout(() => setPaused(false), 1200);
  };

  if (!list.length) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#0a0a0c] text-white/50 font-serif">
        No gallery images configured.
      </div>
    );
  }

  return (
    <section
      className="relative w-full min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] bg-[#0a0a0c] text-white overflow-hidden select-none"
      aria-roledescription="carousel"
      aria-label="Cinematic photo gallery"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute inset-0">
        {list.map((src, idx) => (
          <img
            key={src}
            src={src}
            alt=""
            loading={idx <= 1 ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
            style={{
              opacity: idx === current ? 1 : 0,
              transitionDuration: `${CROSSFADE_MS}ms`,
            }}
          />
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" aria-hidden />

      <div className="absolute inset-x-0 top-0 z-20 px-5 pt-6 sm:pt-10 text-center">
        <p className="font-serif text-[11px] sm:text-xs tracking-[0.35em] uppercase text-white/45">
          Trip2Talk
        </p>
        <h1 className="mt-2 font-serif text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-2 font-serif text-sm sm:text-base italic text-white/55">{subtitle}</p>
      </div>

      {list.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={prev}
            className="absolute left-3 sm:left-6 top-1/2 z-30 -translate-y-1/2 grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition hover:bg-black/55 hover:border-white/30"
          >
            <ChevronLeft size={22} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={next}
            className="absolute right-3 sm:right-6 top-1/2 z-30 -translate-y-1/2 grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-md transition hover:bg-black/55 hover:border-white/30"
          >
            <ChevronRight size={22} strokeWidth={1.75} aria-hidden />
          </button>
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 z-30 px-5 pb-8 sm:pb-10 pt-16 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <div className="flex flex-col items-center gap-4">
          {list.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2" role="tablist" aria-label="Slide indicators">
              {list.map((_, idx) => {
                const active = idx === current;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`Go to photo ${idx + 1}`}
                    onClick={() => go(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      active ? 'w-8 bg-white' : 'w-2 bg-white/35 hover:bg-white/55'
                    }`}
                  />
                );
              })}
            </div>
          )}

          <p
            className="font-serif text-sm sm:text-base tracking-wide text-white/90 tabular-nums"
            aria-live="polite"
          >
            {current + 1} / {list.length}
          </p>
        </div>
      </div>
    </section>
  );
}
