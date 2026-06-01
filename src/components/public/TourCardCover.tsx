import { useEffect, useMemo, useState } from 'react';
import { buildTourCoverCandidates } from '../../utils/supabaseImages';

const coverCandidatesCache = new Map<string, string[]>();

type Props = {
  tourCode: string;
  alt: string;
  /** Sheet / fallback URLs tried after the portfolio map URL (e.g. Trip info Cover column). */
  fallbackUrls?: Array<string | null | undefined>;
  imgClassName?: string;
  aspectClassName?: string;
};

export default function TourCardCover({
  tourCode,
  alt,
  fallbackUrls = [],
  imgClassName = 'w-full h-full object-cover',
  aspectClassName = 'aspect-video',
}: Props) {
  const code = tourCode.trim().toUpperCase();
  const candidates = useMemo(
    () => buildTourCoverCandidates(code, fallbackUrls),
    [code, fallbackUrls],
  );

  const cacheKey = `${code}|${candidates.join('|')}`;
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [ready, setReady] = useState(() => coverCandidatesCache.has(cacheKey));

  const activeUrl = candidates[candidateIndex] ?? null;

  useEffect(() => {
    const cached = coverCandidatesCache.get(cacheKey);
    if (cached?.length) {
      setCandidateIndex(0);
      setReady(true);
      return;
    }

    if (!candidates.length) {
      setCandidateIndex(0);
      setReady(true);
      return;
    }

    setCandidateIndex(0);
    setReady(true);
    coverCandidatesCache.set(cacheKey, candidates);
  }, [cacheKey, candidates]);

  const showGradient = ready && (!activeUrl || candidateIndex >= candidates.length);
  const showImage = ready && activeUrl && candidateIndex < candidates.length;

  return (
    <div className={`relative overflow-hidden bg-[#0d1b2a] ${aspectClassName}`}>
      {!ready ? <div className="absolute inset-0 bg-slate-200 animate-pulse" aria-hidden /> : null}

      {showGradient ? (
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] to-[#1a3a4a]"
          aria-hidden
        />
      ) : null}

      {showImage ? (
        <img
          key={`${activeUrl}-${candidateIndex}`}
          src={activeUrl}
          alt={alt}
          className={imgClassName}
          loading="lazy"
          decoding="async"
          onError={() => {
            setCandidateIndex((i) => {
              const next = i + 1;
              if (next < candidates.length) {
                console.warn('[TourCard] cover load failed, trying fallback', {
                  tourCode: code,
                  failed: activeUrl,
                  next: candidates[next],
                });
              } else {
                console.warn('[TourCard] all cover candidates failed', { tourCode: code, candidates });
              }
              return next;
            });
          }}
        />
      ) : null}
    </div>
  );
}
