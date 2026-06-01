import { supabase } from '../lib/supabase';
import {
  TAS_3D2N_COVER_URL,
  TAS_3D2N_HERO_POSTER_URL,
  TAS_LH_4D3N_COVER_URL,
  portfolioPublicUrl,
} from '../lib/portfolioUrls';

const PORTFOLIO_BUCKET = 'portfolio';

type TourCoverMapping = {
  folder: string;
  file?: string;
  /** Fixed public URL — used when path is known (skips storage list). */
  publicUrl?: string;
};

export const TOUR_COVER_MAP: Record<string, TourCoverMapping> = {
  'MEL-4D3N': { folder: 'Melbourne', file: '01.jpg' },
  'ULU-4D3N': { folder: 'Ulruru', file: '183586793_10225492427447732_8846903205565554038_n.jpg' },
  'NZ-6D5N': { folder: 'New Zealand/Spring', file: 'T2T-10.JPG' },
  'TAS-3D2N': {
    folder: 'Tasmania 02/Launceston',
    file: '596873932_1428638042594626_8987722411601397177_n.jpg',
    publicUrl: TAS_3D2N_COVER_URL,
  },
  'TAS-LH-4D3N': {
    folder: 'Tasmania 02/Launceston',
    file: '596811714_1428639069261190_2753284779604496226_n.jpg',
    publicUrl: TAS_LH_4D3N_COVER_URL,
  },
  'KIA-1DAY': { folder: 'One day trip SYD', file: '705320467_10242162489108855_3820285517745745334_n.jpg' },
  'CAN-2D1N': { folder: 'Cowra', file: '12 (1).jpg' },
  'SYD-1DAY': { folder: 'SYDNEY', file: '506861557_10236863821565478_6038697174671264606_n.jpg' },
};

/** Extra card fallbacks when primary portfolio object is missing (404). */
export const TOUR_COVER_FALLBACK_URLS: Record<string, string[]> = {
  'TAS-3D2N': [
    TAS_3D2N_HERO_POSTER_URL,
    'https://images.unsplash.com/photo-1483347756197-71ef7742304b?w=1200&q=80',
  ],
  'TAS-LH-4D3N': [
    portfolioPublicUrl('Tasmania/596371362_1428639202594510_8709278754225773992_n.jpg'),
    'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1200&q=80',
  ],
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

  if (mapping.file) {
    const path = `${mapping.folder}/${mapping.file}`;
    console.log('[TourCard]', code, '->', path);
    return path;
  }

  const { data, error } = await supabase.storage.from(PORTFOLIO_BUCKET).list(mapping.folder, {
    limit: 20,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error || !data?.length) {
    console.log('[TourCard]', code, '->', '(list failed)', mapping.folder, error?.message);
    return null;
  }

  const file = data.find((f) =>
    isListableFile(f.name, f.id, f.metadata as Record<string, unknown> | null),
  );

  if (!file?.name) {
    console.log('[TourCard]', code, '->', '(no file)', mapping.folder);
    return null;
  }

  const path = `${mapping.folder}/${file.name}`;
  console.log('[TourCard]', code, '->', path);
  return path;
}

export async function getTourCoverUrl(tourCode: string): Promise<string | null> {
  const code = tourCode.trim().toUpperCase();
  const mapping = TOUR_COVER_MAP[code];
  if (mapping?.publicUrl) return mapping.publicUrl;

  const path = await resolveTourCoverPath(code);
  if (!path) return null;
  return supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path).data.publicUrl || null;
}

/** Ordered cover candidates: portfolio map → sheet/fallback URLs → legacy paths. */
export function buildTourCoverCandidates(
  tourCode: string,
  extraUrls: Array<string | null | undefined> = [],
): string[] {
  const code = tourCode.trim().toUpperCase();
  const mapping = TOUR_COVER_MAP[code];
  const out: string[] = [];

  const push = (url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed || out.includes(trimmed)) return;
    out.push(trimmed);
  };

  if (mapping?.publicUrl) push(mapping.publicUrl);
  if (mapping?.file) push(portfolioPublicUrl(`${mapping.folder}/${mapping.file}`));

  for (const url of extraUrls) push(url);
  for (const url of TOUR_COVER_FALLBACK_URLS[code] ?? []) push(url);

  return out;
}

/** Prefer portfolio folder mapping; optional CMS URL only if portfolio resolve fails. */
export async function resolveTourCoverUrl(
  tourCode: string,
  existingUrl?: string | null,
): Promise<string | null> {
  const candidates = buildTourCoverCandidates(tourCode, [existingUrl]);
  return candidates[0] ?? null;
}
