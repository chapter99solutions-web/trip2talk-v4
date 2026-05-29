import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getStoredRole,
  PIN_ROLE_MAP,
  ROLE_DASHBOARD_PATH,
  setStoredRole,
  type SessionRole,
} from '../lib/sessionRole';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30_000;

type PinLang = 'TH' | 'EN';

const COPY = {
  enterPin: { TH: 'กรอกรหัส 4 หลัก', EN: 'Enter 4-digit PIN' },
  operatorAccess: { TH: 'สำหรับทีมงาน', EN: 'Staff access' },
  locked: { TH: 'ล็อกชั่วคราว', EN: 'Locked' },
  invalidLeft: { TH: 'รหัสไม่ถูกต้อง — เหลืออีก {n} ครั้ง', EN: 'Invalid PIN — {n} attempts left' },
  biometric: { TH: 'ไบโอเมตริก', EN: 'BIOMETRIC' },
  demo: { TH: 'โหมดสาธิต', EN: 'DEMO MODE' },
  publicSite: { TH: '← เว็บไซต์', EN: '← Public site' },
} as const;

function formatLockTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function grantAccess(role: SessionRole, navigate: ReturnType<typeof useNavigate>) {
  setStoredRole(role);
  navigate(ROLE_DASHBOARD_PATH[role], { replace: true });
}

export default function PINGate() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<PinLang>(() =>
    localStorage.getItem('trip2talk_language') === 'EN' ? 'EN' : 'TH'
  );
  const [pinBuffer, setPinBuffer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [shake, setShake] = useState(false);
  const [scanning, setScanning] = useState(false);

  const locked = lockedUntil !== null && Date.now() < lockedUntil;
  const t = (key: keyof typeof COPY, vars?: { n: number }): string => {
    let text: string = COPY[key][lang];
    if (vars) text = text.replace('{n}', String(vars.n));
    return text;
  };

  useEffect(() => {
    const existing = getStoredRole();
    if (existing) {
      navigate(ROLE_DASHBOARD_PATH[existing], { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (lockedUntil === null) return;
    const interval = window.setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setLockSeconds(0);
        setPinBuffer('');
      } else {
        setLockSeconds(remaining);
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [lockedUntil]);

  const triggerShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
  };

  const submitPin = useCallback(
    (pin: string) => {
      const role = PIN_ROLE_MAP[pin];
      if (role) {
        grantAccess(role, navigate);
        return;
      }
      triggerShake();
      setPinBuffer('');
      setAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_MS);
          setLockSeconds(Math.ceil(LOCKOUT_MS / 1000));
          return 0;
        }
        return next;
      });
    },
    [navigate]
  );

  const appendDigit = useCallback(
    (digit: string) => {
      if (locked || scanning) return;
      setPinBuffer((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;
        if (next.length === 4) submitPin(next);
        return next;
      });
    },
    [locked, scanning, submitPin]
  );

  const handleClear = () => {
    if (locked || scanning) return;
    setPinBuffer('');
  };

  const handleBackspace = () => {
    if (locked || scanning) return;
    setPinBuffer((p) => p.slice(0, -1));
  };

  const handleBiometric = () => {
    if (locked || scanning) return;
    setScanning(true);
    window.setTimeout(() => {
      grantAccess('owner', navigate);
      setScanning(false);
    }, 1500);
  };

  const setLanguage = (next: PinLang) => {
    setLang(next);
    localStorage.setItem('trip2talk_language', next);
    document.documentElement.lang = next === 'TH' ? 'th' : 'en';
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

  return (
    <div className="min-h-screen min-w-80 bg-navy font-sans text-white flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <Link to="/" className="text-sm text-neutral-400 hover:text-teal transition-colors">
          {t('publicSite')}
        </Link>
        <div className="inline-flex rounded-full border border-neutral-700 bg-navy-light p-1">
          <button
            type="button"
            onClick={() => setLanguage('TH')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              lang === 'TH' ? 'bg-teal text-navy' : 'text-neutral-400 hover:text-white'
            }`}
            aria-pressed={lang === 'TH'}
          >
            ไทย
          </button>
          <button
            type="button"
            onClick={() => setLanguage('EN')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              lang === 'EN' ? 'bg-teal text-navy' : 'text-neutral-400 hover:text-white'
            }`}
            aria-pressed={lang === 'EN'}
          >
            EN
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <header className="text-center mb-10">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-wide text-gold">
            TRIP2TALK
          </h1>
          <p className="text-neutral-400 text-sm mt-2">{t('operatorAccess')}</p>
        </header>

        <div
          className={`flex flex-col items-center mb-8 w-full max-w-xs ${shake ? 'animate-shake' : ''} ${
            locked ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          <div
            className="flex justify-center gap-4 mb-4"
            aria-label={`PIN entry, ${pinBuffer.length} of 4 digits`}
          >
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-colors ${
                  pinBuffer.length > i
                    ? 'bg-teal border-teal'
                    : 'bg-transparent border-neutral-600'
                }`}
              />
            ))}
          </div>

          {locked ? (
            <p className="font-mono text-sm text-red-400">
              {t('locked')} — {formatLockTime(lockSeconds)}
            </p>
          ) : attempts > 0 ? (
            <p className="text-sm text-gold font-medium">
              {t('invalidLeft', { n: MAX_ATTEMPTS - attempts })}
            </p>
          ) : (
            <p className="font-mono text-sm text-neutral-400">{t('enterPin')}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-8 w-full max-w-md justify-center">
          <div className="grid grid-cols-3 gap-3">
            {digits.map((d) => (
              <button
                key={d}
                type="button"
                disabled={locked || scanning}
                onClick={() => appendDigit(d)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-neutral-700 bg-navy-light text-xl font-semibold text-white hover:border-teal hover:text-teal focus:outline-none focus:ring-2 focus:ring-teal active:bg-teal active:text-navy disabled:opacity-40 transition-colors"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              disabled={locked || scanning}
              onClick={handleClear}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-neutral-700 bg-navy-light text-sm font-medium text-neutral-500 hover:border-teal focus:outline-none focus:ring-2 focus:ring-teal disabled:opacity-40 transition-colors"
            >
              CLR
            </button>
            <button
              type="button"
              disabled={locked || scanning}
              onClick={() => appendDigit('0')}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-neutral-700 bg-navy-light text-xl font-semibold text-white hover:border-teal hover:text-teal focus:outline-none focus:ring-2 focus:ring-teal active:bg-teal active:text-navy disabled:opacity-40 transition-colors"
            >
              0
            </button>
            <button
              type="button"
              disabled={locked || scanning}
              onClick={handleBackspace}
              aria-label="Backspace"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-neutral-700 bg-navy-light text-lg text-gold hover:border-teal focus:outline-none focus:ring-2 focus:ring-teal disabled:opacity-40 transition-colors"
            >
              ⌫
            </button>
          </div>

          <button
            type="button"
            disabled={locked || scanning}
            onClick={handleBiometric}
            className="flex flex-col items-center justify-center gap-2 w-32 h-40 rounded-2xl border border-neutral-700 bg-navy-light hover:border-teal disabled:opacity-40 transition-colors"
          >
            <span
              className={`text-4xl ${scanning ? 'animate-pulse text-teal' : 'text-neutral-600'}`}
              aria-hidden
            >
              ◉
            </span>
            <span className="font-mono text-xs text-neutral-500">{t('biometric')}</span>
            <span className="font-mono text-xs text-neutral-600">{t('demo')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export { PIN_ROLE_MAP };
