import { useEffect, useState } from 'react';
import { useCoverSlideshow } from '../../hooks/useCoverSlideshow';

const SLIDE_MS = 4000;
const FADE_MS = 1500;

type Props = {
  maxPhotos?: number;
  pauseOnHover?: boolean;
};

export default function HeroSlideshowBackground({
  maxPhotos = 20,
  pauseOnHover = true,
}: Props) {
  const { urls: allUrls, loading } = useCoverSlideshow(undefined, maxPhotos);
  const urls = maxPhotos ? allUrls.slice(0, maxPhotos) : allUrls;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const useSlideshow = !loading && urls.length > 0;
  const isPaused = pauseOnHover && paused;

  useEffect(() => {
    if (useSlideshow) {
      console.log('[HeroSlideshow] active slideshow, slides:', urls.length);
    } else if (!loading) {
      console.warn('[HeroSlideshow] no Cover / Mixed Cover images — solid background only');
    }
  }, [useSlideshow, loading, urls.length]);

  useEffect(() => {
    if (!useSlideshow || urls.length < 2 || isPaused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % urls.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [isPaused, urls.length, useSlideshow]);

  useEffect(() => {
    if (!useSlideshow || urls.length < 2) return;
    const next = urls[(index + 1) % urls.length];
    const img = new Image();
    img.src = next;
  }, [index, urls, useSlideshow]);

  useEffect(() => {
    if (urls.length > 0 && index >= urls.length) {
      setIndex(0);
    }
  }, [index, urls.length]);

  useEffect(() => {
    if (!useSlideshow || !urls[0]) return;
    const img = new Image();
    img.src = urls[0];
  }, [useSlideshow, urls]);

  return (
    <div
      className="absolute inset-0 bg-[#0d1b2a]"
      onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setPaused(false) : undefined}
    >
      {useSlideshow
        ? urls.map((url, i) => {
            const active = i === index;
            return (
              <div
                key={`${url}-${i}`}
                className="absolute inset-0 overflow-hidden"
                style={{
                  opacity: active ? 1 : 0,
                  transition: `opacity ${FADE_MS}ms ease-in-out`,
                  willChange: 'opacity',
                  zIndex: active ? 2 : 1,
                }}
                aria-hidden={!active}
              >
                <img
                  src={url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={i < 3 ? 'eager' : 'lazy'}
                  decoding={i === 0 ? 'sync' : 'async'}
                  fetchPriority={i === 0 ? 'high' : 'low'}
                  style={{
                    willChange: 'transform',
                    animation: active ? `heroKenBurns ${SLIDE_MS}ms linear forwards` : 'none',
                    transform: active ? undefined : 'scale(1)',
                  }}
                />
              </div>
            );
          })
        : null}
    </div>
  );
}
