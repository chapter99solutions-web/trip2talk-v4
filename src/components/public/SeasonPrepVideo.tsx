const SEASON_PREP_VIDEO_URL =
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/VDO/cover/make_this_come_alive_sec.mp4';

export default function SeasonPrepVideo() {
  return (
    <div className="w-full max-w-[800px] mx-auto">
      <video
        src={SEASON_PREP_VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-label="Seasonal trip preparation video"
        className="w-full rounded-2xl bg-slate-900 shadow-lg shadow-black/10"
      />
    </div>
  );
}
