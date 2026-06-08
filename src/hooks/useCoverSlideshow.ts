import { useEffect, useState } from 'react';
import {
  HERO_GALLERY_MIX_PHOTOS_FALLBACK_URLS,
  listGalleryMixPhotosImages,
} from '../lib/galleryStorage';

const PER_FOLDER_LIMIT = 100;

let cachedUrls: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

async function fetchCoverUrls(): Promise<string[]> {
  const urls = await listGalleryMixPhotosImages(PER_FOLDER_LIMIT);
  console.log('[useCoverSlideshow] portfolio/Mixed images:', urls.length);
  return urls.length > 0 ? urls : HERO_GALLERY_MIX_PHOTOS_FALLBACK_URLS;
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
        cachedUrls = HERO_GALLERY_MIX_PHOTOS_FALLBACK_URLS;
        return HERO_GALLERY_MIX_PHOTOS_FALLBACK_URLS;
      })
      .finally(() => {
        fetchPromise = null;
      });
  }
  return fetchPromise;
}

/** Hero slideshow: portfolio bucket → Mixed/ */
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
