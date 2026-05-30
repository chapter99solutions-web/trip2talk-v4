import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'saved_trips';
// Fired in the same tab when the saved set changes (the native `storage`
// event only fires in *other* tabs), keeping every mounted component in sync.
const SYNC_EVENT = 'saved_trips:changed';

function readSavedTrips(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((code): code is string => typeof code === 'string');
  } catch {
    return [];
  }
}

function writeSavedTrips(codes: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  } catch {
    // Ignore quota/availability errors — saving is a best-effort convenience.
  }
  window.dispatchEvent(new Event(SYNC_EVENT));
}

export function useSavedTrips() {
  const [saved, setSaved] = useState<Set<string>>(() => new Set(readSavedTrips()));

  useEffect(() => {
    const sync = () => setSaved(new Set(readSavedTrips()));
    // `storage` covers other tabs/windows; the custom event covers this tab.
    window.addEventListener('storage', sync);
    window.addEventListener(SYNC_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(SYNC_EVENT, sync);
    };
  }, []);

  const isSaved = useCallback((tourCode: string) => saved.has(tourCode), [saved]);

  const toggle = useCallback((tourCode: string) => {
    if (!tourCode) return;
    const next = new Set(readSavedTrips());
    if (next.has(tourCode)) next.delete(tourCode);
    else next.add(tourCode);
    writeSavedTrips([...next]);
    setSaved(next);
  }, []);

  const remove = useCallback((tourCode: string) => {
    const next = new Set(readSavedTrips());
    if (!next.delete(tourCode)) return;
    writeSavedTrips([...next]);
    setSaved(next);
  }, []);

  return { saved, isSaved, toggle, remove };
}
