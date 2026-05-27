import { Tour } from '../types/tour';

/** Tier 2 Private (1–3 pax, incl. solo) is priced above list (Tier 1 Standard 4–6). */
export const PRIVATE_PRICE_MULTIPLIER = 1.3;

export type TripSizeTier = 'STANDARD' | 'PRIVATE';
export type CancellationBy = 'OWNER' | 'CUSTOMER';

export const TRIP_SIZE_TIERS = {
  STANDARD: {
    id: 'STANDARD' as const,
    tierLabel: 'Tier 1 Standard',
    paxMin: 4,
    paxMax: 6,
    pricingNoteTh: 'ราคาปกติ',
    pricingNoteEn: 'Standard list pricing',
  },
  PRIVATE: {
    id: 'PRIVATE' as const,
    tierLabel: 'Tier 2 Private',
    paxMin: 1,
    paxMax: 3,
    pricingNoteTh: 'Guaranteed Departure (ราคาสูงกว่า)',
    pricingNoteEn: 'Guaranteed Departure (premium pricing)',
  },
} as const;

export function resolveTripSizeTier(pax: number): TripSizeTier | null {
  if (pax >= TRIP_SIZE_TIERS.STANDARD.paxMin && pax <= TRIP_SIZE_TIERS.STANDARD.paxMax) {
    return 'STANDARD';
  }
  if (pax >= TRIP_SIZE_TIERS.PRIVATE.paxMin && pax <= TRIP_SIZE_TIERS.PRIVATE.paxMax) {
    return 'PRIVATE';
  }
  return null;
}

export function quoteTripTotal(basePricePerPersonAud: number, pax: number) {
  const tier = resolveTripSizeTier(pax);
  if (!tier) {
    return { tier: null as TripSizeTier | null, pax, perPersonAud: 0, totalAud: 0, valid: false };
  }
  const multiplier = tier === 'PRIVATE' ? PRIVATE_PRICE_MULTIPLIER : 1;
  const perPersonAud = Math.round(basePricePerPersonAud * multiplier * 100) / 100;
  const totalAud = Math.round(perPersonAud * pax * 100) / 100;
  return { tier, pax, perPersonAud, totalAud, valid: true };
}

export function daysUntilTripStart(tripStartDate: string, from = new Date()): number {
  const start = new Date(tripStartDate);
  start.setHours(0, 0, 0, 0);
  const ref = new Date(from);
  ref.setHours(0, 0, 0, 0);
  return Math.ceil((start.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
}

/** Refund percent of amount paid (0–100). */
export function calcRefundPercent(cancelledBy: CancellationBy, daysBeforeStart: number): number {
  if (cancelledBy === 'OWNER') {
    // ยกเลิกโดยพี่แสน: < 45 วัน → คืน 100%
    if (daysBeforeStart < 45) return 100;
    return 100;
  }
  // ยกเลิกโดยลูกค้า
  if (daysBeforeStart <= 30) return 0;
  if (daysBeforeStart <= 60) return 50;
  if (daysBeforeStart <= 90) return 70;
  return 90;
}

export function calcRefundAmount(paidAud: number, refundPercent: number): number {
  return Math.round(paidAud * (refundPercent / 100) * 100) / 100;
}

export function formatRefundPolicyLine(
  cancelledBy: CancellationBy,
  daysBeforeStart: number,
  lang: 'TH' | 'EN'
): string {
  const pct = calcRefundPercent(cancelledBy, daysBeforeStart);
  if (lang === 'TH') {
    const who = cancelledBy === 'OWNER' ? 'ยกเลิกโดยพี่แสน' : 'ยกเลิกโดยลูกค้า';
    return `${who} · เหลือ ${daysBeforeStart} วันก่อนออกทริป → คืน ${pct}%`;
  }
  const who = cancelledBy === 'OWNER' ? 'Cancelled by owner' : 'Cancelled by client';
  return `${who} · ${daysBeforeStart} days before trip → ${pct}% refund`;
}

export const CANCELLATION_POLICY = {
  EN: {
    title: 'Cancellation & Refund Policy',
    owner: 'Cancelled by Trip2Talk (Saen): if less than 45 days before departure — 100% refund.',
    customerRows: [
      'More than 90 days before departure: 10% fee (90% refund)',
      '61–90 days: 30% fee (70% refund)',
      '31–60 days: 50% fee (50% refund)',
      '30 days or less: no refund',
    ],
  },
  TH: {
    title: 'นโยบายยกเลิกและคืนเงิน',
    owner: 'ยกเลิกโดยพี่แสน (Trip2Talk): น้อยกว่า 45 วันก่อนออกทริป — คืน 100%',
    customerRows: [
      'มากกว่า 90 วันก่อนออกทริป: หัก 10% (คืน 90%)',
      '61–90 วัน: หัก 30% (คืน 70%)',
      '31–60 วัน: หัก 50% (คืน 50%)',
      '30 วันหรือน้อยกว่า: ไม่คืนเงิน',
    ],
  },
} as const;

export const TRIP_TIER_POLICY = {
  EN: {
    title: 'Trip size tiers',
    standard: 'Tier 1 Standard: 4–6 guests — standard list price per person.',
    private: 'Tier 2 Private: 1–3 guests — Guaranteed Departure (premium price per person; solo = this tier).',
  },
  TH: {
    title: 'ระดับขนาดทริป',
    standard: 'Tier 1 Standard: 4–6 คน — ราคาปกติต่อคน',
    private: 'Tier 2 Private: 1–3 คน — Guaranteed Departure (ราคาสูงกว่าต่อคน; เดินคนเดียวใช้ tier นี้)',
  },
} as const;

export function tripRefundPreview(tour: Tour, cancelledBy: CancellationBy, from = new Date()) {
  const days = daysUntilTripStart(tour.start_date, from);
  const refundPercent = calcRefundPercent(cancelledBy, days);
  return { daysBeforeStart: days, refundPercent };
}
