import { useEffect, useState } from 'react';
import { getTourCoverUrl } from '../../utils/supabaseImages';

const coverUrlCache = new Map<string, string | null>();

type Props = {
  tourCode: string;
  alt: string;
  imgClassName?: string;
  aspectClassName?: string;
};

export default function TourCardCover({
  tourCode,
  alt,
  imgClassName = 'w-full h-full object-cover',
  aspectClassName = 'aspect-video',
}: Props) {
  const code = tourCode.trim().toUpperCase();
  const [url, setUrl] = useState<string | null>(() => coverUrlCache.get(code) ?? null);
  const [loading, setLoading] = useState(() => !coverUrlCache.has(code));
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (coverUrlCache.has(code)) {
      setUrl(coverUrlCache.get(code) ?? null);
      setLoading(false);
      setImgError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setImgError(false);

    void getTourCoverUrl(code).then((resolved) => {
      if (cancelled) return;
      coverUrlCache.set(code, resolved);
      setUrl(resolved);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [code]);

  const showGradient = !loading && (imgError || !url);
  const showImage = Boolean(url) && !imgError && !loading;

  return (
    <div className={`relative overflow-hidden bg-[#0d1b2a] ${aspectClassName}`}>
      {loading ? (
        <div className="absolute inset-0 bg-slate-200 animate-pulse" aria-hidden />
      ) : null}

      {showGradient ? (
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] to-[#1a3a4a]"
          aria-hidden
        />
      ) : null}

      {showImage ? (
        <img
          src={url!}
          alt={alt}
          className={imgClassName}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      ) : null}
    </div>
  );
}
