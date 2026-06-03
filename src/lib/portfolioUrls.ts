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

/** Card / sheet cover — Tasmania/Hobart */
export const TAS_3D2N_COVER_URL = portfolioPublicUrl('Tasmania/Hobart/1.jpg');

/** Card / sheet cover — Tasmania/Launceston */
export const TAS_LH_4D3N_COVER_URL = portfolioPublicUrl(
  'Tasmania/Launceston/594961969_1428638085927955_7817067387013979508_n.jpg',
);

/** Hero video poster + fallback when Hobart object is missing */
export const TAS_3D2N_HERO_POSTER_URL = portfolioPublicUrl('Tasmania/Hobart/1.jpg');
