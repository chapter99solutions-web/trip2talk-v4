import { useTermsPhotoStrip } from '../../hooks/useTermsPhotoStrip';

export default function TermsPhotoStrip() {
  const { urls, loading } = useTermsPhotoStrip();

  if (loading) {
    return (
      <div
        className="py-4 bg-slate-100"
        style={{
          maskImage:
            'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        }}
      >
        <div className="flex gap-3 px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[200px] h-[130px] rounded-xl bg-slate-200 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!urls.length) return null;

  const loopUrls = [...urls, ...urls];

  return (
    <div
      className="py-4 bg-white overflow-hidden"
      style={{
        maskImage:
          'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent, white 10%, white 90%, transparent)',
      }}
      aria-hidden
    >
      <div className="terms-photo-strip-track flex gap-3 w-max">
        {loopUrls.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            width={200}
            height={130}
            className="shrink-0 w-[200px] h-[130px] rounded-xl object-cover"
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>
    </div>
  );
}
