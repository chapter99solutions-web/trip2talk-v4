/** Public object base for the `portfolio` storage bucket (bucket must be public). */
export const PORTFOLIO_PUBLIC_BASE =
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio';

/** Build a public portfolio URL from a storage object path (e.g. `Tasmania/Hobart/1.jpg`). */
export function portfolioPublicUrl(objectPath: string): string {
  const encoded = objectPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${PORTFOLIO_PUBLIC_BASE}/${encoded}`;
}

/** Card / sheet cover — portfolio/Tasmania/Launceston */
export const TAS_3D2N_COVER_URL =
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Tasmania/Launceston/596811714_1428639069261190_2753284779604496226_n.jpg';

/** Card / sheet cover — portfolio/Tasmania/Launceston */
export const TAS_LH_4D3N_COVER_URL =
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Tasmania/Launceston/596371362_1428639202594510_8709278754225773992_n.jpg';

/** Hero video poster + fallback when Hobart object is missing */
export const TAS_3D2N_HERO_POSTER_URL = TAS_3D2N_COVER_URL;
