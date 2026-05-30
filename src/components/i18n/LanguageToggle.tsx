import { useI18n } from '../../lib/i18n';

export default function LanguageToggle({
  className = '',
  variant = 'dark',
}: {
  className?: string;
  variant?: 'light' | 'dark';
}) {
  const { lang, setLang } = useI18n();

  const shell =
    variant === 'light'
      ? 'border-slate-200 bg-slate-50'
      : 'border-white/10 bg-white/5 backdrop-blur';
  const idle = variant === 'light' ? 'text-slate-500 hover:text-navy' : 'text-white/70 hover:text-white';
  const active = 'bg-teal text-navy';

  return (
    <div className={`inline-flex rounded-full border p-1 ${shell} ${className}`}>
      <button
        type="button"
        onClick={() => setLang('TH')}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
          lang === 'TH' ? active : idle
        }`}
        aria-pressed={lang === 'TH'}
      >
        ไทย
      </button>
      <button
        type="button"
        onClick={() => setLang('EN')}
        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
          lang === 'EN' ? active : idle
        }`}
        aria-pressed={lang === 'EN'}
      >
        EN
      </button>
    </div>
  );
}

