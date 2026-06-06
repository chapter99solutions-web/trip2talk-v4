import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const BUCKET = 'portfolio';
const AUTO_MS = 4000;
const CROSSFADE_MS = 700;
const SWIPE_THRESHOLD_PX = 48;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

type Props = {
  /** Portfolio bucket folder, e.g. "Tasmania 02/Hobart" */
  folder: string;
  /** Fallback folder if primary list is empty */
  fallbackFolder?: string;
};

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function isStorageFile(
  name: string,
  id: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!name || name.startsWith('.')) return false;
  if (id) return true;
  return metadata !== null && metadata !== undefined;
}

async function listFolderImages(folder: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error || !data?.length) return [];

  return data
    .filter((f) => {
      const meta = f.metadata as Record<string, unknown> | null;
      return isStorageFile(f.name, f.id, meta) && IMAGE_EXT.test(f.name);
    })
    .sort((a, b) => naturalSort(a.name, b.name))
    .map((f) => {
      const path = `${folder}/${f.name}`;
      return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    })
    .filter(Boolean);
}

export default function HobartTripSlideshow({ folder, fallbackFolder }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      let urls = await listFolderImages(folder);
      if (!urls.length && fallbackFolder) {
        urls = await listFolderImages(fallbackFolder);
      }
      if (!cancelled) {
        setImages(urls);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [folder, fallbackFolder]);

  useEffect(() => {
    setCurrent(0);
  }, [images.length]);

  useEffect(() => {
    if (paused || images.length < 2) return;
    const id = window.setInterval(() => {
      setCurrent((c) => (c + 1) % images.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, images.length]);

  const prev = useCallback(() => {
    if (!images.length) return;
    setCurrent((c) => (c - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    if (!images.length) return;
    setCurrent((c) => (c + 1) % images.length);
  }, [images.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    setPaused(true);
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    const endX = e.changedTouches[0]?.clientX;
    if (start != null && endX != null) {
      const delta = endX - start;
      if (delta > SWIPE_THRESHOLD_PX) prev();
      else if (delta < -SWIPE_THRESHOLD_PX) next();
    }
    window.setTimeout(() => setPaused(false), 1200);
  };

  if (loading) {
    return (
      <section
        aria-label="Trip photo gallery loading"
        className="w-full aspect-[16/9] min-h-[220px] sm:min-h-[320px] bg-slate-900 animate-pulse"
      />
    );
  }

  if (!images.length) return null;

  return (
    <section
      className="relative w-full aspect-[16/9] min-h-[220px] sm:min-h-[360px] max-h-[72vh] bg-slate-950 overflow-hidden select-none"
      aria-roledescription="carousel"
      aria-label="Hobart trip photo slideshow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {images.map((src, idx) => {
        const active = idx === current;
        return (
          <div
            key={src}
            className="absolute inset-0 transition-opacity ease-in-out"
            style={{
              opacity: active ? 1 : 0,
              transitionDuration: `${CROSSFADE_MS}ms`,
              pointerEvents: active ? 'auto' : 'none',
            }}
            aria-hidden={!active}
          >
            <img
              key={active ? `active-${current}` : src}
              src={src}
              alt=""
              loading={idx <= 1 ? 'eager' : 'lazy'}
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover ${
                active ? 'animate-hobart-ken-burns' : ''
              }`}
            />
          </div>
        );
      })}

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20"
        aria-hidden
      />

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={prev}
            className="absolute left-3 sm:left-5 top-1/2 z-20 -translate-y-1/2 grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
          >
            <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={next}
            className="absolute right-3 sm:right-5 top-1/2 z-20 -translate-y-1/2 grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
          >
            <ChevronRight size={20} strokeWidth={2} aria-hidden />
          </button>
        </>
      )}

      <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 z-20 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-md text-white text-xs sm:text-sm font-semibold tabular-nums tracking-wide">
        {current + 1} / {images.length}
      </div>
    </section>
  );
}
