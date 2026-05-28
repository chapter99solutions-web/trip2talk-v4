/** Booking reference: BK-YYYYMMDD-NNN (e.g. BK-20260528-047). */
export function generateBookingRef(date = new Date()): string {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 900) + 100;
  return `BK-${ymd}-${rand}`;
}
