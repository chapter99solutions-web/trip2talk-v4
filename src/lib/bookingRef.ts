/** Booking reference: WEB-BK-YYYYMMDD-NNN (e.g. WEB-BK-20260603-047). */
export function generateBookingRef(date = new Date()): string {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 900) + 100;
  return `WEB-BK-${ymd}-${rand}`;
}
