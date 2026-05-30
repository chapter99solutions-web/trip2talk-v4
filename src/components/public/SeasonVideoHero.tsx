import { useEffect, useRef, useState } from 'react';

// Two cover videos played back-to-back in a seamless loop.
const VIDEOS = [
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/VDO/cover/videomp_.mp4',
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/VDO/cover/Copy%20of%202026%20t2t%20tripLandscape.mp4',
];

export default function SeasonVideoHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [current, setCurrent] = useState(0);

  // Reload + play whenever we switch to the next clip.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    const playback = v.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => {
        /* autoplay can be blocked until user interaction — ignore */
      });
    }
  }, [current]);

  return (
    <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden bg-slate-900 mb-6 shadow-lg shadow-black/10">
      <video
        ref={videoRef}
        src={VIDEOS[current]}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setCurrent((c) => (c + 1) % VIDEOS.length)}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark gradient at the bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

      {/* Caption */}
      <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8">
        <p className="text-white font-serif text-2xl sm:text-3xl font-semibold drop-shadow-lg">
          สไตล์ที่ใช่ สำหรับทริปที่ชอบ
        </p>
      </div>
    </div>
  );
}
