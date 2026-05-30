import { supabase } from '../lib/supabase';

const PORTFOLIO_BUCKET = 'portfolio';

export const TOUR_COVER_MAP: Record<string, { folder: string; file?: string }> = {
  'MEL-4D3N': { folder: 'Melbourne', file: '01.jpg' },
  'ULU-4D3N': { folder: 'Ulruru', file: '1.jpg' },
  'NZ-6D5N': { folder: 'New Zealand/Spring', file: 'T2T-10.JPG' },
  'TAS-3D2N': { folder: 'Tasmania' },
  'TAS-LH-4D3N': { folder: 'Tasmania' },
  'KIA-1DAY': { folder: 'One day trip SYD' },
  'CAN-2D1N': { folder: 'Cowra' },
  'SYD-1DAY': { folder: 'One day trip SYD' },
};

function isListableFile(
  name: string,
  id: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!name || name.startsWith('.')) return false;
  if (id) return true;
  return metadata !== null && metadata !== undefined;
}

/** Resolves storage path for a tour cover (logs `[TourCard] code -> path`). */
export async function resolveTourCoverPath(tourCode: string): Promise<string | null> {
  const code = tourCode.trim().toUpperCase();
  const mapping = TOUR_COVER_MAP[code];

  if (!mapping) {
    console.log('[TourCard]', code, '->', '(no mapping)');
    return null;
  }

  let path: string;

  if (mapping.file) {
    path = `${mapping.folder}/${mapping.file}`;
  } else {
    const { data, error } = await supabase.storage.from(PORTFOLIO_BUCKET).list(mapping.folder, {
      limit: 20,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error || !data?.length) {
      console.log('[TourCard]', code, '->', '(list failed)', mapping.folder);
      return null;
    }

    const file = data.find((f) =>
      isListableFile(f.name, f.id, f.metadata as Record<string, unknown> | null),
    );

    if (!file?.name) {
      console.log('[TourCard]', code, '->', '(no file)', mapping.folder);
      return null;
    }

    path = `${mapping.folder}/${file.name}`;
  }

  console.log('[TourCard]', code, '->', path);
  return path;
}

export async function getTourCoverUrl(tourCode: string): Promise<string | null> {
  const path = await resolveTourCoverPath(tourCode);
  if (!path) return null;
  return supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path).data.publicUrl || null;
}

/** Prefer portfolio folder mapping; optional CMS URL only if portfolio resolve fails. */
export async function resolveTourCoverUrl(
  tourCode: string,
  existingUrl?: string | null,
): Promise<string | null> {
  const fromPortfolio = await getTourCoverUrl(tourCode);
  if (fromPortfolio) return fromPortfolio;
  const trimmed = existingUrl?.trim();
  return trimmed || null;
}
