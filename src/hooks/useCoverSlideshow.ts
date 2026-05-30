import { useEffect, useState } from 'react';
import { listPortfolioFolder, MIXED_COVER_FOLDER } from '../lib/galleryStorage';

const COVER_FOLDER = 'Cover';
const PER_FOLDER_LIMIT = 50;

const SUPABASE_PORTFOLIO_BASE =
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/';

/**
 * Guaranteed real cover images for the hero. Used only if Supabase Storage
 * listing returns nothing, so the slideshow never falls back to a static/empty
 * background. ("Mixed Cover" → %20 for the space in the public URL.)
 */
const FALLBACK_URLS: string[] = ['01.jpg', '02.jpg', '03.jpg', '04.jpg', '05.png', '06.jpg', '07.jpg'].map(
  (file) => `${SUPABASE_PORTFOLIO_BASE}Mixed%20Cover/${file}`
);

let cachedUrls: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

/** Combine every image in portfolio/Cover/ and portfolio/Mixed Cover/. */
async function fetchCoverUrls(): Promise<string[]> {
  const [cover, mixed] = await Promise.all([
    listPortfolioFolder(COVER_FOLDER, PER_FOLDER_LIMIT),
    listPortfolioFolder(MIXED_COVER_FOLDER, PER_FOLDER_LIMIT),
  ]);

  const combined = [...cover, ...mixed].filter((url, i, arr) => arr.indexOf(url) === i);
  console.log('[useCoverSlideshow] Cover:', cover.length, 'Mixed Cover:', mixed.length, 'combined:', combined.length);

  return combined.length > 0 ? combined : FALLBACK_URLS;
}

function loadCoverUrls(): Promise<string[]> {
  if (cachedUrls !== null) {
    return Promise.resolve(cachedUrls);
  }
  if (!fetchPromise) {
    fetchPromise = fetchCoverUrls()
      .then((urls) => {
        cachedUrls = urls;
        return urls;
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

/**
 * Hero slideshow source: all images from portfolio/Cover/ + portfolio/Mixed Cover/.
 * Params are kept for backwards compatibility but ignored — the combined cover
 * set is always returned (callers slice with their own `maxPhotos`).
 */
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
