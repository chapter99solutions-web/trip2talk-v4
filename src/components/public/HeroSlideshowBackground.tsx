import { useEffect, useState } from 'react';
import { useCoverSlideshow } from '../../hooks/useCoverSlideshow';

// hero slideshow v3 — portfolio/Mixed on rvcwprxnqwscgjusmjvj
const SLIDE_MS = 5000;
const FADE_MS = 1000;

const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

type Props = {
  maxPhotos?: number;
  pauseOnHover?: boolean;
};

export default function HeroSlideshowBackground({
  maxPhotos = 50,
  pauseOnHover = true,
}: Props) {
  const { urls, loading } = useCoverSlideshow();
  const media = maxPhotos ? urls.slice(0, maxPhotos) : urls;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const isPaused = pauseOnHover && paused;

  useEffect(() => {
    setCurrentIndex(0);
  }, [media.length]);

  useEffect(() => {
    if (media.length < 2 || isPaused) return;
    const id = window.setInterval(() => {
      setCurrentIndex((i) => (i + 1) % media.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [isPaused, media.length]);

  // Preload the next slide before crossfade.
  useEffect(() => {
    if (media.length < 2) return;
    const next = media[(currentIndex + 1) % media.length];
    if (next && !isVideo(next)) {
      const img = new Image();
      img.src = next;
    }
  }, [currentIndex, media]);

  return (
    <div
      className="absolute inset-0 z-[1] bg-[#0d1b2a]"
      onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setPaused(false) : undefined}
    >
      {loading && media.length === 0 ? (
        <div className="absolute inset-0 animate-pulse bg-[#0d1b2a]" aria-hidden />
      ) : null}

      {media.map((url, i) => {
        const active = i === currentIndex;
        return (
          <div
            key={url}
            className="absolute inset-0 overflow-hidden"
            style={{
              opacity: active ? 1 : 0,
              transition: `opacity ${FADE_MS}ms ease-in-out`,
              willChange: 'opacity',
              zIndex: active ? 2 : 1,
            }}
            aria-hidden={!active}
          >
            {isVideo(url) ? (
              <video
                src={url}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <img
                src={url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading={i < 2 ? 'eager' : 'lazy'}
                decoding={i === 0 ? 'sync' : 'async'}
                fetchPriority={i === 0 ? 'high' : 'low'}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
