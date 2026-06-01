import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  images: string[];
  /** autoplay interval (ms) */
  intervalMs?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function HobartTripSlideshow({ images, intervalMs = 4500 }: Props) {
  const list = useMemo(() => images.filter(Boolean), [images]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(0);
  }, [list.length]);

  useEffect(() => {
    if (paused || list.length < 2) return;
    const id = window.setInterval(() => {
      setCurrent((c) => (c + 1) % list.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [paused, list.length, intervalMs]);

  const go = useCallback(
    (idx: number) => {
      const next = clamp(idx, 0, Math.max(0, list.length - 1));
      setCurrent(next);
      // keep selected thumb in view
      const el = thumbsRef.current?.querySelector<HTMLButtonElement>(`button[data-idx="${next}"]`);
      el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    },
    [list.length]
  );

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + list.length) % list.length);
  }, [list.length]);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % list.length);
  }, [list.length]);

  if (list.length === 0) return null;

  return (
    <div className="space-y-3">
      <div
        className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-slate-900 shadow-xl shadow-black/10 select-none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {list.map((src, idx) => (
          <img
            key={src}
            src={src}
            alt=""
            loading={idx === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
            style={{ opacity: idx === current ? 1 : 0 }}
          />
        ))}

        {list.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-white/85 hover:bg-white text-slate-900 shadow-md transition-colors"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full bg-white/85 hover:bg-white text-slate-900 shadow-md transition-colors"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-slate-900/80 text-white text-xs font-semibold tracking-wide">
              {current + 1} / {list.length}
            </div>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div
          ref={thumbsRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {list.map((src, idx) => {
            const active = idx === current;
            return (
              <button
                key={`${src}-thumb`}
                type="button"
                data-idx={idx}
                onClick={() => go(idx)}
                aria-label={`View photo ${idx + 1}`}
                className={`relative shrink-0 rounded-xl overflow-hidden border transition-colors ${
                  active ? 'border-emerald-400' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-16 h-12 sm:w-20 sm:h-14 object-cover"
                  style={{ opacity: active ? 1 : 0.85 }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

