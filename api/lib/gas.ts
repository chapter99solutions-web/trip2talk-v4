// Vercel serverless TS build does not always include Node types.
declare const process: { env: Record<string, string | undefined> };

export function siteOrigin(): string {
  const fromNext = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromNext) return fromNext.replace(/\/$/, '');
  const fromSite = process.env.SITE_URL?.trim();
  if (fromSite) return fromSite.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://www.trip2talk.com.au';
}

export function gasWebAppUrl(): string | null {
  const url = (process.env.GAS_WEBAPP_URL || process.env.VITE_GAS_WEBAPP_URL || '').trim();
  return url || null;
}

export type VercelRequest = {
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string | string[] | undefined>;
};

export type VercelResponse = {
  status: (code: number) => {
    json: (body: unknown) => void;
    end: () => void;
  };
};

export function queryParam(query: VercelRequest['query'], key: string): string {
  const raw = query?.[key];
  if (Array.isArray(raw)) return String(raw[0] || '').trim();
  return String(raw || '').trim();
}
