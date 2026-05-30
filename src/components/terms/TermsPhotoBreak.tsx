import { useEffect, useState } from 'react';
import { getMixedCoverPhotoAtIndex, MIXED_COVER_FOLDER } from '../../lib/galleryStorage';

type Props = {
  textTh: string;
  textEn: string;
  /** Pick nth photo from Mixed Cover (sorted by name). */
  pickIndex?: number;
};

export default function TermsPhotoBreak({ textTh, textEn, pickIndex = 0 }: Props) {
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getMixedCoverPhotoAtIndex(pickIndex).then((url) => {
      if (cancelled) return;
      setBgUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [pickIndex]);

  useEffect(() => {
    setLoaded(false);
  }, [bgUrl]);

  const showImage = Boolean(bgUrl && loaded);

  return (
    <div
      className="relative left-1/2 -translate-x-1/2 w-screen max-w-[100vw] h-[250px] overflow-hidden my-10"
      style={{ backgroundColor: '#0d1b2a' }}
      data-cover-folder={MIXED_COVER_FOLDER}
    >
      {bgUrl ? (
        <img
          src={bgUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            showImage ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      ) : null}
      <div className="absolute inset-0 bg-black/45" aria-hidden />
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
        <p className="font-serif text-xl md:text-2xl text-white font-semibold leading-snug">
          {textTh}
        </p>
        <p className="font-serif text-sm md:text-base text-white/85 mt-2 italic">
          {textEn}
        </p>
      </div>
    </div>
  );
}
