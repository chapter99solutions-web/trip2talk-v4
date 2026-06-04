import { createClient } from '@supabase/supabase-js';

const GALLERY_PROJECT_URL = 'https://rvcwprxnqwscgjusmjvj.supabase.co';
const gallerySupabase = createClient(
  GALLERY_PROJECT_URL,
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || 'public-anon',
);

/** Public gallery bucket on rvcwprxnqwscgjusmjvj */
export const MIX_GALLERY_STORAGE_BASE =
  'https://rvcwprxnqwscgjusmjvj.supabase.co/storage/v1/object/public/gallery/photos/Mix%20photos/gallary/';

const STORAGE_FOLDER = 'photos/Mix photos/gallary';

/** Slide order — simple numbered files plus Facebook-style names (prefix before “…”). */
export const MIX_GALLERY_SLIDE_ENTRIES = [
  '01.jpg',
  '03.jpg',
  '04.jpg',
  '05.jpg',
  '07.jpg',
  '08.jpg',
  '09.jpg',
  '648506789_102409438892',
  '655833695_102412614855',
  '656052262_102412614859',
  '688446075_102419012481',
  '711566479_102422650764',
] as const;

export function mixGalleryPublicUrl(fileName: string): string {
  const encoded = encodeURIComponent(fileName).replace(/%2F/g, '/');
  return `${MIX_GALLERY_STORAGE_BASE}${encoded}`;
}

/** Immediate URLs for numbered slides; Facebook-style slides use prefix + `_n.jpg` until resolved. */
export const MIX_GALLERY_FALLBACK_URLS: string[] = MIX_GALLERY_SLIDE_ENTRIES.map((entry) =>
  isSimpleFileName(entry) ? mixGalleryPublicUrl(entry) : mixGalleryPublicUrl(`${entry}_n.jpg`),
);

function isSimpleFileName(entry: string): boolean {
  return /^\d+\.jpg$/i.test(entry);
}

/** Resolve hardcoded slide list to public URLs (prefix entries matched to full storage names). */
export async function resolveMixGallerySlideUrls(): Promise<string[]> {
  const prefixEntries = MIX_GALLERY_SLIDE_ENTRIES.filter((e) => !isSimpleFileName(e));
  const prefixToFile = new Map<string, string>();

  if (prefixEntries.length > 0) {
    const { data, error } = await gallerySupabase.storage.from('gallery').list(STORAGE_FOLDER, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (!error && data?.length) {
      for (const prefix of prefixEntries) {
        const match = data.find(
          (f) =>
            f.name.startsWith(prefix) &&
            /\.(jpe?g|png|webp)$/i.test(f.name) &&
            Boolean(f.id ?? f.metadata),
        );
        if (match) prefixToFile.set(prefix, match.name);
      }
    }
  }

  return MIX_GALLERY_SLIDE_ENTRIES.map((entry) => {
    if (isSimpleFileName(entry)) return mixGalleryPublicUrl(entry);
    const fileName = prefixToFile.get(entry);
    return fileName ? mixGalleryPublicUrl(fileName) : mixGalleryPublicUrl(`${entry}_n.jpg`);
  });
}
