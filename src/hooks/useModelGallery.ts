import { useEffect, useState } from 'react';
import { listPortfolioFolder } from '../lib/galleryStorage';

const FOLDER = 'Model';

let cachedUrls: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

async function fetchModelUrls(): Promise<string[]> {
  return listPortfolioFolder(FOLDER, 50);
}

function loadModelUrls(): Promise<string[]> {
  if (cachedUrls) return Promise.resolve(cachedUrls);
  if (!fetchPromise) {
    fetchPromise = fetchModelUrls()
      .then((urls) => {
        cachedUrls = urls;
        return urls;
      })
      .catch((e) => {
        console.warn('[useModelGallery] fetch error:', e);
        cachedUrls = [];
        return [];
      });
  }
  return fetchPromise;
}

export function useModelGallery() {
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

    void loadModelUrls().then((list) => {
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
