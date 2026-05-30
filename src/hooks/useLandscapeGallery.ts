import { useEffect, useState } from 'react';
import { listPortfolioFolder, shuffle } from '../lib/galleryStorage';

const MAX_PHOTOS = 30;

// Folder name is space-sensitive in Supabase Storage. Pass the raw 'show off'
// to .list(); getPublicUrl() will encode the space as %20 in the public URL.
const LANDSCAPE_FOLDER = 'show off';

let cachedUrls: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

async function fetchLandscapeUrls(): Promise<string[]> {
  const urls = await listPortfolioFolder(LANDSCAPE_FOLDER, MAX_PHOTOS);
  if (!urls.length) return [];
  return shuffle(urls).slice(0, MAX_PHOTOS);
}

function loadLandscapeUrls(): Promise<string[]> {
  if (cachedUrls) return Promise.resolve(cachedUrls);
  if (!fetchPromise) {
    fetchPromise = fetchLandscapeUrls()
      .then((urls) => {
        cachedUrls = urls;
        return urls;
      })
      .catch((e) => {
        console.warn('[useLandscapeGallery] fetch error:', e);
        cachedUrls = [];
        return [];
      });
  }
  return fetchPromise;
}

export function useLandscapeGallery() {
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

    void loadLandscapeUrls().then((list) => {
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
