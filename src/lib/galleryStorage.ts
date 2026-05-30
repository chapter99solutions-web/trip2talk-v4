import { supabase } from './supabase';

const BUCKET = 'portfolio';

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
    .map((f) => {
      const path = `${folder}/${f.name}`;
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return urlData.publicUrl;
    })
    .filter(Boolean);
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
