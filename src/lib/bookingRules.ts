/** Trip2Talk V4 booking + pickup business rules */

export type TripType = 'one_day' | 'overnight';
export type PickupOptionId =
  | 'thaitown_main'
  | 'route_waypoint'
  | 'airport_terminal'
  | 'custom_accommodation';

export const PRICING = {
  sharedPerPerson: 260,
  sharedMaxPax: 8,
  sharedMinPax: 6,
  privatePerPerson: 390,
  privatePax: 4,
  bufferDays: 45,
} as const;

export const MARGIN_TABLE = {
  shared8: {
    label: { th: 'ทริปแชร์ 8 คน', en: 'Shared 8 pax' },
    revenue: 2080,
    cohost: 400,
    van: 550,
    photographer: 300,
    snacks: 30,
    net: 800,
  },
  private4: {
    label: { th: 'ทริปไพรเวท 4 คน', en: 'Private 4 pax' },
    revenue: 1560,
    cohost: 200,
    van: 450,
    photographer: 300,
    snacks: 10,
    net: 600,
  },
} as const;

export function handlePickupValidation(
  tripType: TripType,
  selectedOption: string
): void {
  if (tripType === 'overnight' && selectedOption !== 'airport_terminal') {
    throw new Error('Overnight trips are strictly locked to Sydney Airport Terminal.');
  }
}

export function daysUntilTrip(tripDateIso: string): number {
  const trip = new Date(tripDateIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  trip.setHours(0, 0, 0, 0);
  return Math.ceil((trip.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Shared group, pax &lt; 4, within 45 days → block + suggest private upgrade */
export function shouldBlockSharedLowPaxNearDate(
  isSharedGroup: boolean,
  pax: number,
  tripDateIso: string
): boolean {
  if (!isSharedGroup || pax !== 4) return false;
  const days = daysUntilTrip(tripDateIso);
  return days >= 0 && days <= PRICING.bufferDays;
}

export function isUuidV4(token: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
}

export async function sha256ComplianceHash(
  bookingId: string,
  ip: string,
  timestamp: string
): Promise<string> {
  const message = `${bookingId}-${ip}-${timestamp}-ACL-Compliance-V4`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateAtoReceiptFilename(tripId: string, amountAud: number, date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const amt = Math.round(amountAud);
  return `${tripId}_${yyyy}-${mm}-${dd}_${amt}_Receipt.jpg`;
}
