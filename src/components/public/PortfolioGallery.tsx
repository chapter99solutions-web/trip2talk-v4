import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type GalleryTab = 'portrait' | 'landscape' | 'fashion';

const TABS: { id: GalleryTab; label: string }[] = [
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'fashion', label: 'Fashion' },
];

const FALLBACK: Record<GalleryTab, string[]> = {
  portrait: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80',
  ],
  landscape: [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
  ],
  fashion: [
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80',
    'https://images.unsplash.com/photo-1483985988354-763728e3685b?w=800&q=80',
  ],
};

export default function PortfolioGallery({ title }: { title: string }) {
  const [tab, setTab] = useState<GalleryTab>('portrait');
  const [urls, setUrls] = useState<string[]>(FALLBACK.portrait);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.storage.from('portfolio').list(tab, { limit: 12 });
        if (error || !data?.length) {
          if (!cancelled) setUrls(FALLBACK[tab]);
          return;
        }
        const next = data
          .filter((f) => f.name && !f.name.endsWith('/'))
          .map((f) => supabase.storage.from('portfolio').getPublicUrl(`${tab}/${f.name}`).data.publicUrl)
          .filter(Boolean);
        if (!cancelled) setUrls(next.length ? next : FALLBACK[tab]);
      } catch {
        if (!cancelled) setUrls(FALLBACK[tab]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <section id="portfolio" className="max-w-6xl mx-auto px-4 py-14 border-t border-slate-100">
      <div className="text-center mb-8">
        <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase">Gallery</p>
        <h2 className="font-serif text-3xl font-semibold text-slate-900 mt-2">{title}</h2>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-neutral-950 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {urls.map((src) => (
            <div key={src} className="aspect-[4/5] rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
