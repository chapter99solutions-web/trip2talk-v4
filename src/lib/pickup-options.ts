import type { PickupOptionId, TripType } from './bookingRules';

export const ONE_DAY_PICKUP_OPTIONS: Array<{
  id: PickupOptionId;
  labelTh: string;
  labelEn: string;
  descriptionTh: string;
}> = [
  {
    id: 'thaitown_main',
    labelTh: 'ไทยทาวน์ ซิดนีย์ (Dixon St)',
    labelEn: 'Thai Town, Sydney (Dixon St)',
    descriptionTh: 'จุดนัดรับมาตรฐานสำหรับทริปวันเดียว',
  },
  {
    id: 'route_waypoint',
    labelTh: 'จุดแวะตามเส้นทาง (ย่านชานเมือง)',
    labelEn: 'Route waypoint (suburb on main route)',
    descriptionTh: 'ต้องเป็นย่านที่เป็นทางผ่านหลักเท่านั้น — รอทีมงานคอนเฟิร์มหลังไมค์',
  },
];

export const OVERNIGHT_PICKUP_LOCKED = {
  id: 'airport_terminal' as const,
  labelTh: 'สนามบินซิดนีย์ (เทอร์มินัล) — ล็อกสำหรับทริปค้างคืน',
  labelEn: 'Sydney Airport Terminal — locked for overnight trips',
};

export function pickupOptionsForTripType(tripType: TripType) {
  if (tripType === 'overnight') {
    return [OVERNIGHT_PICKUP_LOCKED];
  }
  return ONE_DAY_PICKUP_OPTIONS;
}

/** @deprecated use pickupOptionsForTripType */
export const sydneyPickupPoints = ONE_DAY_PICKUP_OPTIONS.map((p) => ({
  id: p.id,
  label: p.labelEn,
  description: p.descriptionTh,
}));

export type PickupId = PickupOptionId;

export function pickupEmoji(pickupId: string | null | undefined): string {
  switch (pickupId) {
    case 'airport_terminal':
      return '✈️';
    case 'route_waypoint':
      return '🛣️';
    default:
      return '📍';
  }
}

export function pickupShortLabel(pickupId: string | null | undefined, lang: 'TH' | 'EN' = 'EN'): string {
  if (pickupId === 'airport_terminal') {
    return lang === 'TH' ? OVERNIGHT_PICKUP_LOCKED.labelTh : OVERNIGHT_PICKUP_LOCKED.labelEn;
  }
  const point = ONE_DAY_PICKUP_OPTIONS.find((p) => p.id === pickupId);
  if (!point) return pickupId ?? '—';
  return lang === 'TH' ? point.labelTh : point.labelEn;
}
