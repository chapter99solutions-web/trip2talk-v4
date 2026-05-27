import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../../lib/i18n';

const DISMISS_KEY = 'pwa_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

export default function InstallPrompt() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(isStandalone());
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandalone());
    setIsIOSDevice(isIOS());

    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) {
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    if (isIOS() && !isStandalone()) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShowBanner(false);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] p-4 animate-slide-up"
      role="dialog"
      aria-label="Install Trip2Talk app"
    >
      <div className="max-w-lg mx-auto cyber-card border-[color:var(--gold-border)] shadow-[0_0_24px_var(--gold-glow)] p-4 flex gap-3 items-start">
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 shrink-0 mt-0.5 text-[color:var(--gold)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M12 3v12" strokeLinecap="round" />
          <path d="M8 11l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 19h16" strokeLinecap="round" />
        </svg>

        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm font-semibold text-neutral-100">{t('installTitle')}</p>
          {isIOSDevice && !deferredPrompt ? (
            <p className="font-sans text-xs text-neutral-400 mt-1 leading-relaxed">
              {t('installIOSHint')}
            </p>
          ) : (
            <p className="font-sans text-xs text-neutral-400 mt-1">
              {t('installHint')}
            </p>
          )}

          {deferredPrompt && (
            <button
              type="button"
              onClick={handleInstall}
              className="mt-3 w-full py-2.5 rounded-xl font-sans text-sm font-semibold bg-[color:var(--gold)] text-[color:var(--navy)] hover:brightness-110 transition-[filter]"
            >
              {t('installButton')}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="text-neutral-600 hover:text-neutral-400 font-mono text-lg leading-none px-1"
          aria-label="Dismiss install prompt"
        >
          ×
        </button>
      </div>
    </div>
  );
}
