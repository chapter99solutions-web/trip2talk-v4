import { useEffect, useState } from 'react';
import { listPortfolioFolder, MIXED_COVER_FOLDER } from '../lib/galleryStorage';

const STRIP_LIMIT = 12;

let cachedUrls: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

async function fetchStripUrls(): Promise<string[]> {
  return listPortfolioFolder(MIXED_COVER_FOLDER, STRIP_LIMIT);
}

function loadStripUrls(): Promise<string[]> {
  if (cachedUrls) return Promise.resolve(cachedUrls);
  if (!fetchPromise) {
    fetchPromise = fetchStripUrls()
      .then((urls) => {
        cachedUrls = urls;
        return urls;
      })
      .catch(() => {
        cachedUrls = [];
        return [];
      });
  }
  return fetchPromise;
}

export function useTermsPhotoStrip() {
  const [urls, setUrls] = useState<string[]>(() => cachedUrls ?? []);
  const [loading, setLoading] = useState(() => cachedUrls === null);

  useEffect(() => {
    if (cachedUrls) {
      setUrls(cachedUrls);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void loadStripUrls().then((list) => {
      if (cancelled) return;
      setUrls(list);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { urls, loading };
}
