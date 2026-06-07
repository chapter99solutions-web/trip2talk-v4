import { useEffect, useState } from 'react';
import { listPortfolioCoverImages } from '../lib/galleryStorage';
import { portfolioPublicUrl } from '../lib/portfolioUrls';

const PER_FOLDER_LIMIT = 100;

/** Verified Cover/Mixed files — used if storage listing returns nothing. */
const FALLBACK_URLS: string[] = ['01.jpg', '02.jpg', '03.jpg', '04.jpg', '05.png', '06.jpg', '07.jpg'].map(
  (file) => portfolioPublicUrl(`Cover/Mixed/${file}`),
);

let cachedUrls: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

async function fetchCoverUrls(): Promise<string[]> {
  const urls = await listPortfolioCoverImages(PER_FOLDER_LIMIT);
  console.log('[useCoverSlideshow] portfolio/Cover images:', urls.length);
  return urls.length > 0 ? urls : FALLBACK_URLS;
}

function loadCoverUrls(): Promise<string[]> {
  if (cachedUrls !== null) {
    return Promise.resolve(cachedUrls);
  }
  if (!fetchPromise) {
    fetchPromise = fetchCoverUrls()
      .then((list) => {
        cachedUrls = list;
        return list;
      })
      .catch((e) => {
        console.warn('[useCoverSlideshow] fetch error — using fallback:', e);
        cachedUrls = FALLBACK_URLS;
        return FALLBACK_URLS;
      })
      .finally(() => {
        fetchPromise = null;
      });
  }
  return fetchPromise;
}

/** Hero slideshow: all images under portfolio/Cover/ (recursive). */
export function useCoverSlideshow(_folder?: string, _listLimit?: number) {
  const [urls, setUrls] = useState<string[]>(() => cachedUrls ?? []);
  const [loading, setLoading] = useState(() => cachedUrls === null);

  useEffect(() => {
    if (cachedUrls !== null) {
      setUrls(cachedUrls);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void loadCoverUrls().then((list) => {
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
