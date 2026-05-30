import { useCallback, useEffect, useMemo, useState } from 'react';
import { splitIntoColumnPools } from '../../lib/galleryStorage';

const SLIDE_MS = 3000;
const FADE_MS = 800;
const COL_DELAYS_MS = [0, 1000, 2000];

type SlideCellProps = {
  url: string;
  active: boolean;
  eager?: boolean;
  onBroken: (url: string) => void;
};

function SlideCell({ url, active, eager, onBroken }: SlideCellProps) {
  if (!url) {
    return (
      <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative bg-slate-200" />
    );
  }

  return (
    <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative bg-slate-100">
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          opacity: active ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
          willChange: 'opacity, transform',
          zIndex: active ? 2 : 1,
        }}
        aria-hidden={!active}
      >
        <img
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading={eager ? 'eager' : 'lazy'}
          decoding={eager ? 'sync' : 'async'}
          onError={() => onBroken(url)}
          style={{
            willChange: 'transform',
            animation: active ? `heroKenBurns ${SLIDE_MS}ms linear forwards` : 'none',
            transform: active ? undefined : 'scale(1)',
          }}
        />
      </div>
    </div>
  );
}

type ColumnProps = {
  pool: string[];
  fallbackUrl: string;
  delayMs: number;
  eager?: boolean;
  onBroken: (url: string) => void;
};

function GalleryColumn({ pool, fallbackUrl, delayMs, eager, onBroken }: ColumnProps) {
  const [broken, setBroken] = useState<Set<string>>(() => new Set());

  const handleBroken = useCallback(
    (url: string) => {
      setBroken((prev) => {
        if (prev.has(url)) return prev;
        const next = new Set(prev);
        next.add(url);
        return next;
      });
      onBroken(url);
    },
    [onBroken],
  );

  const effectivePool = useMemo(() => {
    const filtered = pool.filter((url) => url && !broken.has(url));
    if (filtered.length > 0) return filtered;
    if (fallbackUrl) return [fallbackUrl];
    return pool.filter(Boolean);
  }, [pool, broken, fallbackUrl]);

  const len = effectivePool.length;
  const [index, setIndex] = useState(0);
  const [activeRow, setActiveRow] = useState(0);

  useEffect(() => {
    if (index >= len && len > 0) setIndex(0);
  }, [index, len]);

  const safeIndex = len > 0 ? index % len : 0;
  const currentUrl = len > 0 ? effectivePool[safeIndex] : '';
  const prevUrl = len > 1 ? effectivePool[(safeIndex - 1 + len) % len] : currentUrl;

  const topUrl = activeRow === 0 ? currentUrl : prevUrl;
  const bottomUrl = activeRow === 1 ? currentUrl : prevUrl;

  useEffect(() => {
    if (len < 2) return;

    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setIndex((i) => (i + 1) % len);
        setActiveRow((r) => 1 - r);
      }, SLIDE_MS);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [len, delayMs]);

  useEffect(() => {
    if (len < 2) return;
    const next = effectivePool[(safeIndex + 1) % len];
    const img = new Image();
    img.src = next;
  }, [safeIndex, len, effectivePool]);

  if (!currentUrl) {
    return (
      <div className="flex flex-col gap-3">
        <div className="aspect-[4/5] rounded-2xl bg-slate-200" />
        <div className="aspect-[4/5] rounded-2xl bg-slate-200" />
      </div>
    );
  }

  const showTop = len < 2 || activeRow === 0;
  const showBottom = len >= 2 && activeRow === 1;

  return (
    <div className="flex flex-col gap-3">
      <SlideCell url={topUrl} active={showTop} eager={eager} onBroken={handleBroken} />
      <SlideCell url={bottomUrl} active={showBottom} eager={eager} onBroken={handleBroken} />
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map((col) => (
        <div key={col} className="flex flex-col gap-3">
          {[0, 1].map((row) => (
            <div
              key={row}
              className="aspect-[4/5] rounded-2xl bg-slate-200 animate-pulse"
              aria-hidden
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function StaticFallbackGrid({ fallbackImages }: { fallbackImages: string[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map((col) => (
        <div key={col} className="flex flex-col gap-3">
          {[0, 1].map((row) => (
            <div
              key={row}
              className="aspect-[4/5] rounded-2xl overflow-hidden border border-slate-100 shadow-sm"
            >
              <img
                src={fallbackImages[col] ?? fallbackImages[0]}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

type Props = {
  urls: string[];
  loading: boolean;
  fallbackImages: string[];
};

export default function GallerySlideshowGrid({ urls, loading, fallbackImages }: Props) {
  const [, setGlobalBroken] = useState<Set<string>>(() => new Set());

  const fallbacks =
    fallbackImages.length >= 3
      ? fallbackImages
      : [
          fallbackImages[0] ?? '',
          fallbackImages[1] ?? fallbackImages[0] ?? '',
          fallbackImages[2] ?? fallbackImages[0] ?? '',
        ];

  const columns = useMemo(() => {
    if (!urls.length) return null;
    return splitIntoColumnPools(urls, fallbacks);
  }, [urls, fallbacks]);

  const onBroken = useCallback((url: string) => {
    setGlobalBroken((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  if (loading) {
    return <GallerySkeleton />;
  }

  if (!columns) {
    return <StaticFallbackGrid fallbackImages={fallbacks} />;
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {columns.map((pool, col) => (
        <GalleryColumn
          key={col}
          pool={pool}
          fallbackUrl={fallbacks[col] ?? fallbacks[0]}
          delayMs={COL_DELAYS_MS[col] ?? 0}
          eager={col === 0}
          onBroken={onBroken}
        />
      ))}
    </div>
  );
}
