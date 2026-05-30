import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPortfolioPhotoUrl, MIXED_COVER_FOLDER } from '../../lib/galleryStorage';

const FB_MESSENGER = 'https://m.me/trip2talk';

export default function TermsCtaBanner() {
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getPortfolioPhotoUrl(MIXED_COVER_FOLDER).then((url) => {
      if (cancelled) return;
      setBgUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const showImage = Boolean(bgUrl && loaded);

  return (
    <section
      className="relative w-full overflow-hidden py-16 md:py-20 mt-4"
      style={{ backgroundColor: '#0d1b2a' }}
    >
      {bgUrl ? (
        <img
          src={bgUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            showImage ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      ) : null}
      <div className="absolute inset-0 bg-black/60" aria-hidden />

      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        <h2 className="font-serif text-2xl md:text-3xl font-semibold" style={{ color: '#d4af37' }}>
          พร้อมออกเดินทางแล้วใช่ไหม?
        </h2>
        <p className="font-serif text-lg md:text-xl mt-1 italic" style={{ color: '#d4af37' }}>
          Ready to start your journey?
        </p>
        <p className="mt-4 text-white/90 text-sm md:text-base">
          ดูรายการทริปทั้งหมดและเลือกวันเดินทางของคุณ
        </p>
        <p className="text-white/70 text-sm italic">
          Browse all trips and choose your departure date
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/#trips"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold text-[#0d1b2a] transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#d4af37' }}
          >
            ดูทริปทั้งหมด / View All Trips
          </Link>
          <a
            href={FB_MESSENGER}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold text-white border-2 border-white/90 hover:bg-white/10 transition-colors"
          >
            ติดต่อพี่แสน / Contact P&apos;Saen
          </a>
        </div>
      </div>
    </section>
  );
}
