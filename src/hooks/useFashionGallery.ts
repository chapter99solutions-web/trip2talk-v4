import { useEffect, useState } from 'react';
import { listPortfolioFolder } from '../lib/galleryStorage';

const FASHION_FOLDER = 'Fashion';
const MODEL_FALLBACK_FOLDER = 'Model';

let cachedUrls: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

async function fetchFashionUrls(): Promise<string[]> {
  const fashion = await listPortfolioFolder(FASHION_FOLDER, 50);
  if (fashion.length) return fashion;
  return listPortfolioFolder(MODEL_FALLBACK_FOLDER, 50);
}

function loadFashionUrls(): Promise<string[]> {
  if (cachedUrls) return Promise.resolve(cachedUrls);
  if (!fetchPromise) {
    fetchPromise = fetchFashionUrls()
      .then((urls) => {
        cachedUrls = urls;
        return urls;
      })
      .catch((e) => {
        console.warn('[useFashionGallery] fetch error:', e);
        cachedUrls = [];
        return [];
      });
  }
  return fetchPromise;
}

export function useFashionGallery() {
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

    void loadFashionUrls().then((list) => {
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
