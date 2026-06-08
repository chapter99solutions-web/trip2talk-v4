import { supabase, SUPABASE_PROJECT_URL } from './supabase';
import { portfolioPublicUrl } from './portfolioUrls';

const BUCKET = 'portfolio';
const COVER_ROOT = 'Cover';

/** Root-level portfolio folder for hero, terms, landscape & season galleries. */
export const MIXED_COVER_FOLDER = 'Mixed Cover';

export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isStorageFile(
  name: string,
  id: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!name || name.startsWith('.')) return false;
  if (id) return true;
  return metadata !== null && metadata !== undefined;
}

function isImageFileName(name: string): boolean {
  return /\.(jpe?g|png|webp|gif)$/i.test(name);
}

export async function listPortfolioFolder(folder: string, limit: number): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    limit,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.warn(`[galleryStorage] list failed for ${folder}:`, error.message);
    return [];
  }

  if (!data?.length) return [];

  return data
    .filter((f) => isStorageFile(f.name, f.id, f.metadata as Record<string, unknown> | null))
    // เรียงชื่อไฟล์แบบ natural sort เพื่อให้ได้ลำดับ 1,2,3,...,10,11 (ไม่ใช่ 1,10,11,2)
    // localeCompare + { numeric: true } จัดการตัวเลขในชื่อไฟล์ได้ถูกต้อง
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
    .map((f) => {
      const path = `${folder}/${f.name}`;
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return urlData.publicUrl;
    })
    .filter(Boolean);
}

/** Recursively list image files under portfolio/Cover/ (includes subfolders e.g. Cover/Mixed/). */
export async function listPortfolioCoverImages(maxFiles = 100): Promise<string[]> {
  const urls: string[] = [];

  async function walk(folder: string): Promise<void> {
    if (urls.length >= maxFiles) return;

    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error || !data?.length) return;

    for (const entry of data) {
      if (urls.length >= maxFiles) break;
      const meta = entry.metadata as Record<string, unknown> | null;
      const relPath = `${folder}/${entry.name}`;

      if (isStorageFile(entry.name, entry.id, meta) && isImageFileName(entry.name)) {
        urls.push(portfolioPublicUrl(relPath));
        continue;
      }

      if (!isStorageFile(entry.name, entry.id, meta)) {
        await walk(relPath);
      }
    }
  }

  await walk(COVER_ROOT);
  return urls.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

export async function fetchShuffledMixedCover(maxTotal = 30): Promise<string[]> {
  const urls = await listPortfolioFolder(MIXED_COVER_FOLDER, maxTotal);
  if (!urls.length) return [];
  return shuffle(urls).slice(0, maxTotal);
}

export async function getMixedCoverPhotoAtIndex(index: number): Promise<string | null> {
  const urls = await listPortfolioFolder(MIXED_COVER_FOLDER, 20);
  if (!urls.length) return null;
  return urls[index % urls.length] ?? null;
}

export async function fetchCombinedPortfolioUrls(
  folders: readonly string[],
  perFolderLimit: number,
  maxTotal: number,
): Promise<string[]> {
  const batches = await Promise.all(
    folders.map((folder) => listPortfolioFolder(folder, perFolderLimit)),
  );
  const combined = batches.flat();
  if (!combined.length) return [];
  return shuffle(combined).slice(0, maxTotal);
}

export function getPortfolioPublicUrl(folder: string, fileName: string): string {
  const path = `${folder}/${fileName}`;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function getPortfolioPhotoUrl(
  folder: string,
  fileName?: string,
): Promise<string | null> {
  if (fileName) {
    return getPortfolioPublicUrl(folder, fileName);
  }
  const urls = await listPortfolioFolder(folder, 20);
  return urls[0] ?? null;
}

const GALLERY_BUCKET = 'gallery';
const GALLERY_PHOTOS_ROOT = 'photos';
/** Hero slideshow — `portfolio/Mixed/` on rvcwprxnqwscgjusmjvj */
export const GALLERY_MIX_PHOTOS_FOLDER = 'Mixed';

export function galleryPublicUrl(objectPath: string): string {
  const encoded = objectPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${GALLERY_BUCKET}/${encoded}`;
}

/** Public URL for a file in portfolio/Mixed/[filename] */
export function heroGalleryMixPhotoUrl(fileName: string): string {
  return portfolioPublicUrl(`${GALLERY_MIX_PHOTOS_FOLDER}/${fileName}`);
}

const HERO_MIX_PHOTO_FALLBACK_FILES = ['01.jpg', '03.jpg', '04.jpg', '05.jpg', '07.jpg', '08.jpg', '09.jpg'];

/** Used when storage list fails — matches portfolio/Mixed/[filename] URL shape */
export const HERO_GALLERY_MIX_PHOTOS_FALLBACK_URLS: string[] = HERO_MIX_PHOTO_FALLBACK_FILES.map(
  heroGalleryMixPhotoUrl,
);

/** List image files under portfolio/Mixed/ (recursive for nested folders). */
export async function listGalleryMixPhotosImages(maxFiles = 100): Promise<string[]> {
  const urls: string[] = [];

  async function walk(folder: string): Promise<void> {
    if (urls.length >= maxFiles) return;

    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.warn(`[galleryStorage] portfolio list failed for ${folder}:`, error.message);
      return;
    }
    if (!data?.length) return;

    for (const entry of data) {
      if (urls.length >= maxFiles) break;
      const meta = entry.metadata as Record<string, unknown> | null;
      const relPath = `${folder}/${entry.name}`;

      if (isStorageFile(entry.name, entry.id, meta) && isImageFileName(entry.name)) {
        urls.push(portfolioPublicUrl(relPath));
        continue;
      }

      if (!isStorageFile(entry.name, entry.id, meta)) {
        await walk(relPath);
      }
    }
  }

  await walk(GALLERY_MIX_PHOTOS_FOLDER);
  return urls.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

async function collectGalleryPhotoUrls(folder: string, urls: string[], limit: number): Promise<void> {
  if (urls.length >= limit) return;

  const { data, error } = await supabase.storage.from(GALLERY_BUCKET).list(folder, {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error || !data?.length) return;

  for (const entry of data) {
    if (urls.length >= limit) break;
    const meta = entry.metadata as Record<string, unknown> | null;
    const path = `${folder}/${entry.name}`;

    if (isStorageFile(entry.name, entry.id, meta) && isImageFileName(entry.name)) {
      const { data: urlData } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
      if (urlData.publicUrl) urls.push(urlData.publicUrl);
      continue;
    }

    if (!entry.id && !isImageFileName(entry.name)) {
      await collectGalleryPhotoUrls(path, urls, limit);
    }
  }
}

/** First N public images under `gallery/photos/` (aurora / trip gallery bucket). */
export async function fetchFirstGalleryPhotoUrls(limit = 4): Promise<string[]> {
  const urls: string[] = [];
  try {
    await collectGalleryPhotoUrls(GALLERY_PHOTOS_ROOT, urls, limit);
  } catch (e) {
    console.warn('[galleryStorage] fetchFirstGalleryPhotoUrls:', e);
  }
  return urls.slice(0, limit);
}

export type EnquiryGalleryPhoto = {
  url: string;
  fileName: string;
};

/** Unique checkout enquiry grid photos from `gallery/photos/` (no padding duplicates). */
export async function fetchEnquiryGalleryPhotos(maxUnique = 4): Promise<EnquiryGalleryPhoto[]> {
  const { data, error } = await supabase.storage.from(GALLERY_BUCKET).list(GALLERY_PHOTOS_ROOT, {
    limit: 8,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.warn('[galleryStorage] fetchEnquiryGalleryPhotos:', error.message);
    return [];
  }
  if (!data?.length) return [];

  const seen = new Set<string>();
  const photos: EnquiryGalleryPhoto[] = [];

  for (const entry of data) {
    if (photos.length >= maxUnique) break;
    const meta = entry.metadata as Record<string, unknown> | null;
    if (!isStorageFile(entry.name, entry.id, meta) || !isImageFileName(entry.name)) continue;

    const dedupeKey = entry.name.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const path = `${GALLERY_PHOTOS_ROOT}/${entry.name}`;
    const { data: urlData } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path);
    if (urlData.publicUrl) {
      photos.push({ url: urlData.publicUrl, fileName: entry.name });
    }
  }

  return photos;
}

export function splitIntoColumnPools(urls: string[], fallbacks: string[]): string[][] {
  const pools: string[][] = [[], [], []];
  urls.forEach((url, i) => {
    pools[i % 3].push(url);
  });

  for (let c = 0; c < 3; c++) {
    if (pools[c].length > 0) continue;
    const rotated = urls.filter((_, i) => i % 3 === c);
    if (rotated.length > 0) {
      pools[c] = rotated;
    } else if (urls.length > 0) {
      pools[c] = [urls[c % urls.length]];
    } else {
      pools[c] = [fallbacks[c] ?? fallbacks[0]];
    }
  }

  return pools;
}
