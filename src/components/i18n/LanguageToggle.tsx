import { useI18n } from '../../lib/i18n';

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div className={`inline-flex rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur ${className}`}>
      <button
        type="button"
        onClick={() => setLang('TH')}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
          lang === 'TH' ? 'bg-[color:var(--teal)] text-[color:var(--navy)]' : 'text-white/70 hover:text-white'
        }`}
        aria-pressed={lang === 'TH'}
      >
        ไทย
      </button>
      <button
        type="button"
        onClick={() => setLang('EN')}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
          lang === 'EN' ? 'bg-[color:var(--teal)] text-[color:var(--navy)]' : 'text-white/70 hover:text-white'
        }`}
        aria-pressed={lang === 'EN'}
      >
        EN
      </button>
    </div>
  );
}

