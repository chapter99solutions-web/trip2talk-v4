/** Public site origin for portal links and CMS copy (client-safe). */
export function getPublicSiteUrl(): string {
  const fromVite = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();
  if (fromVite) return fromVite.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin.replace(/\/$/, '');
  return 'https://www.trip2talk.com.au';
}

export function albumPrepLinkForToken(token: string): string {
  return `${getPublicSiteUrl()}/album-prep?token=${encodeURIComponent(token)}`;
}

export function portalLinkForBooking(bookingId: string): string {
  return `${getPublicSiteUrl()}/portal?booking=${encodeURIComponent(bookingId)}`;
}
