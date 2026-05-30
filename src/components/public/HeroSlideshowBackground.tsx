import { useEffect, useState } from 'react';

const SLIDE_MS = 5000;
const FADE_MS = 1000;

// Hardcoded hero media — no Supabase storage.list() / async fetching.
const HERO_MEDIA = [
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Mixed%20Cover/01.jpg',
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Mixed%20Cover/02.jpg',
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Mixed%20Cover/03.jpg',
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Mixed%20Cover/04.jpg',
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Mixed%20Cover/05.png',
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Mixed%20Cover/06.jpg',
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Mixed%20Cover/07.jpg',
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Cover/AD/Copy%20of%202026%20t2t%20tripLandscape.mp4',
];

const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

type Props = {
  maxPhotos?: number;
  pauseOnHover?: boolean;
};

export default function HeroSlideshowBackground({
  maxPhotos = 20,
  pauseOnHover = true,
}: Props) {
  const media = maxPhotos ? HERO_MEDIA.slice(0, maxPhotos) : HERO_MEDIA;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const isPaused = pauseOnHover && paused;

  useEffect(() => {
    if (media.length < 2 || isPaused) return;
    const id = window.setInterval(() => {
      setCurrentIndex((i) => (i + 1) % media.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [isPaused, media.length]);

  // Preload the next image so the crossfade is smooth.
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
      className="absolute inset-0 bg-[#0d1b2a]"
      onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setPaused(false) : undefined}
    >
      {media.map((url, i) => {
        const active = i === currentIndex;
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
                loading={i < 3 ? 'eager' : 'lazy'}
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
