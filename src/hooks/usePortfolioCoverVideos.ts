import { useEffect, useState } from 'react';
import { listPortfolioFolder } from '../lib/galleryStorage';

const VDO_COVER_FOLDER = 'VDO/cover';

/** Verified public portfolio cover clips — used when storage list is empty. */
const KNOWN_COVER_VIDEOS = [
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/VDO/cover/videomp_.mp4',
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/VDO/cover/Copy%20of%202026%20t2t%20tripLandscape.mp4',
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/VDO/cover/make_this_come_alive_sec.mp4',
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/VDO/cover/0606%20(2).mp4',
] as const;

const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

let cachedUrls: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

async function fetchCoverVideos(): Promise<string[]> {
  const listed = await listPortfolioFolder(VDO_COVER_FOLDER, 30);
  const videos = listed.filter(isVideoUrl);
  return videos.length > 0 ? videos : [...KNOWN_COVER_VIDEOS];
}

function loadCoverVideos(): Promise<string[]> {
  if (cachedUrls) return Promise.resolve(cachedUrls);
  if (!fetchPromise) {
    fetchPromise = fetchCoverVideos()
      .then((urls) => {
        cachedUrls = urls;
        return urls;
      })
      .catch((e) => {
        console.warn('[usePortfolioCoverVideos] fetch error:', e);
        cachedUrls = [...KNOWN_COVER_VIDEOS];
        return cachedUrls;
      });
  }
  return fetchPromise;
}

export function usePortfolioCoverVideos() {
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

    void loadCoverVideos().then((list) => {
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
