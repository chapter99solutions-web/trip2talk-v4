/** Public object base for the `portfolio` storage bucket (bucket must be public). */
export const PORTFOLIO_PUBLIC_BASE =
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio';

/** Build a public portfolio URL from a storage object path (e.g. `Tasmania 02/Hobart/1.jpg`). */
export function portfolioPublicUrl(objectPath: string): string {
  const encoded = objectPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${PORTFOLIO_PUBLIC_BASE}/${encoded}`;
}

/** Card / sheet cover — Tasmania 02/Launceston (re-upload if 404 in Storage). */
export const TAS_3D2N_COVER_URL = portfolioPublicUrl(
  'Tasmania 02/Launceston/596873932_1428638042594626_8987722411601397177_n.jpg',
);

/** Card / sheet cover — Tasmania 02/Launceston */
export const TAS_LH_4D3N_COVER_URL = portfolioPublicUrl(
  'Tasmania 02/Launceston/596811714_1428639069261190_2753284779604496226_n.jpg',
);

/** Hero video poster + fallback when Launceston object is missing */
export const TAS_3D2N_HERO_POSTER_URL = portfolioPublicUrl('Tasmania 02/Hobart/1.jpg');
