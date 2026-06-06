import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePortfolioCoverVideos } from '../../hooks/usePortfolioCoverVideos';
import { splitIntoColumnPools } from '../../lib/galleryStorage';

function VideoSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map((col) => (
        <div key={col} className="flex flex-col gap-3">
          {[0, 1].map((row) => (
            <div
              key={row}
              className="aspect-[4/5] rounded-2xl bg-slate-100 animate-pulse border border-slate-200"
              aria-hidden
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type VideoCellProps = {
  url: string;
  onBroken: (url: string) => void;
};

function VideoCell({ url, onBroken }: VideoCellProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const playback = video.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => {
        /* autoplay may be blocked until interaction */
      });
    }
  }, [url]);

  return (
    <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-[#1a1a1a]">
      <video
        ref={videoRef}
        src={url}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
        onError={() => onBroken(url)}
      />
    </div>
  );
}

export default function GalleryVideoGrid() {
  const { urls, loading } = usePortfolioCoverVideos();
  const [broken, setBroken] = useState<Set<string>>(() => new Set());

  const onBroken = useCallback((url: string) => {
    setBroken((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  const activeUrls = useMemo(
    () => urls.filter((url) => url && !broken.has(url)),
    [urls, broken],
  );

  const columns = useMemo(() => {
    if (!activeUrls.length) return [];
    return splitIntoColumnPools(activeUrls, ['', '', '']).map((pool) =>
      pool.filter((url) => url && !broken.has(url)),
    );
  }, [activeUrls, broken]);

  if (loading) {
    return <VideoSkeleton />;
  }

  if (!activeUrls.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {columns.map((pool, col) => (
        <div key={col} className="flex flex-col gap-3">
          {pool.slice(0, 2).map((url) => (
            <VideoCell key={url} url={url} onBroken={onBroken} />
          ))}
        </div>
      ))}
    </div>
  );
}
