import { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import { SEASON_PREP_CARDS } from '../../lib/seasonPrepGuide';
import PortraitGalleryGrid from './PortraitGalleryGrid';
import LandscapeGalleryGrid from './LandscapeGalleryGrid';
import SeasonGalleryGrid from './SeasonGalleryGrid';
import SeasonPrepInfoCard from './SeasonPrepInfoCard';

type GalleryTab = 'portrait' | 'landscape' | 'season';
type SeasonTab = 'autumn' | 'winter' | 'spring' | 'summer';

const STYLE_TABS: { id: GalleryTab; label: string }[] = [
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'season', label: 'By Season' },
];

const SEASON_TABS: { id: SeasonTab; label: string; emoji: string }[] = [
  { id: 'autumn', label: 'Autumn', emoji: '🍂' },
  { id: 'winter', label: 'Winter', emoji: '❄️' },
  { id: 'spring', label: 'Spring', emoji: '🌸' },
  { id: 'summer', label: 'Summer', emoji: '☀️' },
];

export default function PortfolioGallery({ title }: { title: string }) {
  const { lang } = useI18n();
  const isTh = lang === 'TH';
  const [tab, setTab] = useState<GalleryTab>('portrait');
  const [seasonTab, setSeasonTab] = useState<SeasonTab>('autumn');

  const activeSeason = SEASON_PREP_CARDS.find((c) => c.id === seasonTab);

  return (
    <section id="portfolio" className="max-w-6xl mx-auto px-4 py-14 border-t border-slate-100">
      <div className="text-center mb-8">
        <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase">Gallery</p>
        <h2 className="font-serif text-3xl font-semibold text-slate-900 mt-2">{title}</h2>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {STYLE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-neutral-950 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {t.id === 'season' ? (isTh ? 'เตรียมตัวตามฤดู' : 'By Season') : t.label}
          </button>
        ))}
      </div>

      {tab === 'season' && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {SEASON_TABS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSeasonTab(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                seasonTab === s.id
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'portrait' ? (
        <PortraitGalleryGrid />
      ) : tab === 'landscape' ? (
        <LandscapeGalleryGrid />
      ) : (
        <>
          <SeasonGalleryGrid />
          {activeSeason ? <SeasonPrepInfoCard card={activeSeason} /> : null}
        </>
      )}
    </section>
  );
}
