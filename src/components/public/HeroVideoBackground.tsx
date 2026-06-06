import { useCallback, useEffect, useRef, useState } from 'react';

const HERO_VIDEO_URL =
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/VDO/cover/0606%20(2).mp4';

export default function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const pauseAtStart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setPlaying(false);
  }, []);

  const playFast = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = 2;
    void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  useEffect(() => {
    pauseAtStart();
  }, [pauseAtStart]);

  return (
    <div
      className="absolute inset-0 bg-[#0d1b2a] overflow-hidden"
      onMouseEnter={playFast}
      onMouseLeave={pauseAtStart}
      onTouchStart={playFast}
      onTouchEnd={pauseAtStart}
      onTouchCancel={pauseAtStart}
    >
      <video
        ref={videoRef}
        src={HERO_VIDEO_URL}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
          playing ? 'opacity-100' : 'opacity-[0.88]'
        }`}
      />
    </div>
  );
}
