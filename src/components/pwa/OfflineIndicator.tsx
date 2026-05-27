import { useEffect, useState } from 'react';
import { useI18n } from '../../lib/i18n';

type BannerMode = 'hidden' | 'offline' | 'online';

export default function OfflineIndicator() {
  const { t } = useI18n();
  const [mode, setMode] = useState<BannerMode>(() =>
    navigator.onLine ? 'hidden' : 'offline'
  );

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const goOffline = () => {
      if (hideTimer) clearTimeout(hideTimer);
      setMode('offline');
    };

    const goOnline = () => {
      setMode('online');
      hideTimer = setTimeout(() => setMode('hidden'), 3000);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (mode === 'hidden') return null;

  const isOffline = mode === 'offline';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[70] h-8 flex items-center justify-center px-4 border-b animate-slide-down ${
        isOffline
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-emerald-500/10 border-emerald-500/30'
      }`}
      role="status"
    >
      <p
        className={`font-mono text-xs tracking-wide ${
          isOffline ? 'text-amber-400' : 'text-emerald-400'
        }`}
      >
        {isOffline ? `⚡ ${t('offlineMode')}` : `✓ ${t('connectedSyncing')}`}
      </p>
    </div>
  );
}
