/** Canonical tour codes — the only trips shown on the public site. */
export const REAL_TOUR_CODES = [
  'TAS-3D2N',
  'MEL-4D3N',
  'ULU-4D3N',
  'NZ-6D5N',
  'TAS-LH-4D3N',
  'KIA-1DAY',
  'CAN-2D1N',
  'SYD-1DAY',
] as const;

export type RealTourCode = (typeof REAL_TOUR_CODES)[number];

const REAL_TOUR_CODE_SET = new Set<string>(REAL_TOUR_CODES);

export function isRealTourCode(code: string | null | undefined): boolean {
  if (!code?.trim()) return false;
  return REAL_TOUR_CODE_SET.has(code.trim().toUpperCase());
}
