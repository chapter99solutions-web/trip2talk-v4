import { useState } from 'react';
import { usePublicStrings } from '../../lib/publicI18n';
import PortraitGalleryGrid from './PortraitGalleryGrid';
import LandscapeGalleryGrid from './LandscapeGalleryGrid';
import FashionGalleryGrid from './FashionGalleryGrid';

type GalleryTab = 'portrait' | 'landscape' | 'fashion';

const STYLE_TABS: { id: GalleryTab; labelKey: 'Portrait' | 'Landscape' | 'gallery_fashion' }[] = [
  { id: 'portrait', labelKey: 'Portrait' },
  { id: 'landscape', labelKey: 'Landscape' },
  { id: 'fashion', labelKey: 'gallery_fashion' },
];

export default function PortfolioGallery({ title }: { title: string }) {
  const t = usePublicStrings();
  const [tab, setTab] = useState<GalleryTab>('portrait');

  const tabLabel = (id: GalleryTab, labelKey: (typeof STYLE_TABS)[number]['labelKey']) => {
    if (labelKey === 'gallery_fashion') return t.gallery_fashion;
    return labelKey;
  };

  return (
    <section id="portfolio" className="max-w-6xl mx-auto px-4 py-14 border-t border-slate-100">
      <div className="text-center mb-8">
        <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase">Gallery</p>
        <h2 className="font-serif text-3xl font-semibold text-slate-900 mt-2">{title}</h2>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {STYLE_TABS.map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => setTab(st.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === st.id ? 'bg-neutral-950 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {tabLabel(st.id, st.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'portrait' ? (
        <PortraitGalleryGrid />
      ) : tab === 'landscape' ? (
        <LandscapeGalleryGrid />
      ) : (
        <FashionGalleryGrid />
      )}
    </section>
  );
}
