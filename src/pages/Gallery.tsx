import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CinematicGallerySlideshow from '../components/gallery/CinematicGallerySlideshow';
import PublicBottomNav from '../components/public/PublicBottomNav';
import { MIX_GALLERY_FALLBACK_URLS, resolveMixGallerySlideUrls } from '../lib/mixGallerySlides';

export default function Gallery() {
  const [urls, setUrls] = useState<string[]>(MIX_GALLERY_FALLBACK_URLS);

  useEffect(() => {
    let cancelled = false;
    void resolveMixGallerySlideUrls().then((resolved) => {
      if (!cancelled && resolved.length) setUrls(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans antialiased pb-20">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-gradient-to-b from-black/70 to-transparent">
        <Link
          to="/"
          className="font-serif text-sm sm:text-base text-white/90 hover:text-white transition-colors"
        >
          ← Home
        </Link>
        <span className="font-serif text-xs tracking-[0.2em] uppercase text-white/40">Gallery</span>
        <Link to="/contact" className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
          Contact
        </Link>
      </header>

      <main className="pt-14">
        <CinematicGallerySlideshow
          images={urls}
          title="Gallery"
          subtitle="Light, landscape, and the quiet in-between"
        />
      </main>

      <PublicBottomNav />
    </div>
  );
}
