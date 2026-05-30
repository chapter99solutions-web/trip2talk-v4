import { useEffect, useState } from 'react';
import { fetchShuffledMixedCover } from '../lib/galleryStorage';

const MAX_PHOTOS = 30;

let cachedUrls: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

function loadSeasonUrls(): Promise<string[]> {
  if (cachedUrls) return Promise.resolve(cachedUrls);
  if (!fetchPromise) {
    fetchPromise = fetchShuffledMixedCover(MAX_PHOTOS)
      .then((urls) => {
        cachedUrls = urls;
        return urls;
      })
      .catch((e) => {
        console.warn('[useSeasonGallery] fetch error:', e);
        cachedUrls = [];
        return [];
      });
  }
  return fetchPromise;
}

export function useSeasonGallery() {
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

    void loadSeasonUrls().then((list) => {
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
