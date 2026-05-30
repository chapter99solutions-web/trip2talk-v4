import { useEffect, useState } from 'react';
import { listPortfolioFolder, MIXED_COVER_FOLDER } from '../lib/galleryStorage';

let cachedUrls: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

async function fetchCoverUrls(
  folder: string = MIXED_COVER_FOLDER,
  listLimit = 20,
): Promise<string[]> {
  const urls = await listPortfolioFolder(folder, listLimit);
  console.log('[useCoverSlideshow] folder:', folder, 'fetched', urls.length, 'urls:', urls);
  return urls;
}

function loadCoverUrls(folder: string = MIXED_COVER_FOLDER, listLimit = 20): Promise<string[]> {
  if (cachedUrls !== null) {
    return Promise.resolve(cachedUrls);
  }
  if (!fetchPromise) {
    fetchPromise = fetchCoverUrls(folder, listLimit)
      .then((urls) => {
        cachedUrls = urls;
        return urls;
      })
      .catch((e) => {
        console.warn('[useCoverSlideshow] fetch error:', e);
        cachedUrls = [];
        return [];
      })
      .finally(() => {
        fetchPromise = null;
      });
  }
  return fetchPromise;
}

export function useCoverSlideshow(
  folder: string = MIXED_COVER_FOLDER,
  listLimit = 20,
) {
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

    void loadCoverUrls(folder, listLimit).then((list) => {
      if (cancelled) return;
      setUrls(list);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [folder, listLimit]);

  return { urls, loading };
}
