import { Link } from 'react-router-dom';
import LiveClock from '../cyber/LiveClock';

type Lang = 'TH' | 'EN';

export default function OpsDashboardHeader({
  title,
  subtitle,
  lang,
  onToggleLang,
  onLogout,
  cmsLink = false,
}: {
  title: string;
  subtitle: string;
  lang?: Lang;
  onToggleLang?: () => void;
  onLogout: () => void;
  cmsLink?: boolean;
}) {
  return (
    <header className="flex flex-wrap justify-between items-start gap-4">
      <div>
        <h1 className="text-gold font-serif text-2xl font-semibold tracking-wide">{title}</h1>
        <p className="text-neutral-400 text-sm mt-1 font-sans">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {onToggleLang && lang && (
          <button
            type="button"
            onClick={onToggleLang}
            className="text-xs px-3 py-1 rounded-full border border-white/20 text-neutral-300 hover:text-white"
          >
            {lang === 'TH' ? 'EN' : 'ไทย'}
          </button>
        )}
        <LiveClock />
        {cmsLink && (
          <Link to="/cms" className="cyber-btn-gold text-xs">
            CMS
          </Link>
        )}
        <button type="button" onClick={onLogout} className="cyber-btn-exit">
          [ EXIT ]
        </button>
      </div>
    </header>
  );
}
