import { useCallback, useEffect, useState } from 'react';
import CyberViewport from './layout/CyberViewport';
import { IconBackspace } from './icons/IconBackspace';
import { IconFingerprint } from './icons/IconFingerprint';
import LanguageToggle from './i18n/LanguageToggle';
import { useI18n } from '../lib/i18n';
import { AppRole, PIN_ROLE_MAP } from '../types/platform';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 30_000;

function formatLockTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export interface PINGateProps {
  onAuthenticated: (role: AppRole) => void;
}

export default function PINGate({ onAuthenticated }: PINGateProps) {
  const { t } = useI18n();
  const [pinBuffer, setPinBuffer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [shake, setShake] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [showScanOverlay, setShowScanOverlay] = useState(false);
  const [, setTick] = useState(0);

  const locked = lockedUntil !== null && Date.now() < lockedUntil;

  useEffect(() => {
    if (lockedUntil === null) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setLockSeconds(0);
        setPinBuffer('');
      } else {
        setLockSeconds(remaining);
      }
      setTick((n) => n + 1);
    }, 250);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const triggerShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
  };

  const submitPin = useCallback(
    (pin: string) => {
      const role = PIN_ROLE_MAP[pin];
      if (role) {
        onAuthenticated(role);
        setPinBuffer('');
        setAttempts(0);
        setLockedUntil(null);
        setShake(false);
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
    [onAuthenticated]
  );

  const appendDigit = useCallback(
    (digit: string) => {
      if (locked || scanning || pinBuffer.length >= 4) return;
      const next = pinBuffer + digit;
      setPinBuffer(next);
      if (next.length === 4) submitPin(next);
    },
    [locked, scanning, pinBuffer, submitPin]
  );

  const handleClear = useCallback(() => {
    if (locked || scanning) return;
    setPinBuffer('');
  }, [locked, scanning]);

  const handleBackspace = useCallback(() => {
    if (locked || scanning) return;
    setPinBuffer((p) => p.slice(0, -1));
  }, [locked, scanning]);

  const handleBiometric = useCallback(() => {
    if (locked || scanning) return;
    setScanning(true);
    setShowScanOverlay(true);
    window.setTimeout(() => {
      onAuthenticated('OWNER');
      setScanning(false);
      setShowScanOverlay(false);
    }, 1500);
  }, [locked, scanning, onAuthenticated]);

  return (
    <CyberViewport className="flex flex-col items-center justify-center p-6">
      {showScanOverlay && (
        <div className="cyber-scan-overlay" aria-hidden>
          <div className="cyber-scan-line" />
        </div>
      )}

      <header className="text-center mb-10">
        <div className="flex justify-center mb-6">
          <LanguageToggle />
        </div>
        <h1 className="text-[28px] font-semibold tracking-wide font-serif text-[color:var(--gold)]">
          TRIP2TALK
        </h1>
        <p className="text-neutral-300/70 text-sm mt-2 tracking-wide font-sans">{t('operatorAccess')}</p>
      </header>

      <div
        className={`cyber-pin-container flex flex-col items-center mb-8 ${locked ? 'locked' : ''} ${shake ? 'animate-shake' : ''}`}
      >
        <div className="flex justify-center gap-5 mb-3" aria-label={`PIN entry, ${pinBuffer.length} of 4 digits`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`cyber-pin-dot ${pinBuffer.length > i ? 'filled' : ''}`} />
          ))}
        </div>

        {locked ? (
          <p className="font-mono text-red-400 text-base tracking-wide">
            {t('locked')} — {formatLockTime(lockSeconds)}
          </p>
        ) : attempts > 0 ? (
          <p className="font-sans text-sm font-medium" style={{ color: 'var(--neon-orange)' }}>
            {t('invalidAttemptsLeft', { n: MAX_ATTEMPTS - attempts })}
          </p>
        ) : (
          <p className="font-mono text-neutral-300/60 text-sm tracking-wide">{t('enterPin')}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-8">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              disabled={locked || scanning}
              onClick={() => appendDigit(d)}
              className="cyber-numpad-btn"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            disabled={locked || scanning}
            onClick={handleClear}
            className="cyber-numpad-btn text-neutral-500 text-sm tracking-wide"
          >
            CLR
          </button>
          <button
            type="button"
            disabled={locked || scanning}
            onClick={() => appendDigit('0')}
            className="cyber-numpad-btn"
          >
            0
          </button>
          <button
            type="button"
            disabled={locked || scanning}
            onClick={handleBackspace}
            className="cyber-numpad-btn text-amber-400/80"
            aria-label="Backspace"
          >
            <IconBackspace className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          disabled={locked || scanning}
          onClick={handleBiometric}
          className="cyber-card flex flex-col items-center justify-center gap-2 p-6 min-w-[120px] hover:scale-105 transition-transform disabled:opacity-40"
        >
          <IconFingerprint
            className={`w-12 h-12 text-amber-500/40 ${scanning ? 'cyber-scanner-pulse' : ''}`}
          />
          <span className="font-mono text-sm text-neutral-500 tracking-wide">BIOMETRIC</span>
          <span className="font-mono text-xs text-neutral-600">DEMO MODE</span>
        </button>
      </div>
    </CyberViewport>
  );
}
