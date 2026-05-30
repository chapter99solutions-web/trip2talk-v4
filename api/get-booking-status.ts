/**
 * Vercel serverless — GET /api/get-booking-status?bookingId=BK-001
 * Proxies to GAS getBookingStatus (keeps GAS URL server-side).
 */
declare const process: { env: Record<string, string | undefined> };

type VercelRequest = {
  method?: string;
  query?: {
    bookingId?: string | string[];
  };
};

type VercelResponse = {
  status: (code: number) => {
    json: (body: unknown) => void;
    end: () => void;
  };
};

function gasWebAppUrl(): string | null {
  const url = (process.env.GAS_WEBAPP_URL || process.env.VITE_GAS_WEBAPP_URL || '').trim();
  return url || null;
}

function queryBookingId(query: VercelRequest['query']): string {
  const raw = query?.bookingId;
  if (Array.isArray(raw)) return String(raw[0] || '').trim();
  return String(raw || '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bookingId = queryBookingId(req.query);
  if (!bookingId) {
    return res.status(400).json({ error: 'Missing bookingId' });
  }

  const gasUrl = gasWebAppUrl();
  if (!gasUrl) {
    return res.status(500).json({ error: 'GAS_WEBAPP_URL is not configured on the server' });
  }

  try {
    const gasRes = await fetch(`${gasUrl.replace(/\/$/, '')}?action=getBookingStatus&bookingId=${encodeURIComponent(bookingId)}`, {
      method: 'GET',
      cache: 'no-store',
    });

    const text = await gasRes.text();
    let parsed: { status?: string; message?: string; data?: Record<string, unknown> | null };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      return res.status(502).json({ error: 'Invalid response from booking service' });
    }

    if (parsed.status === 'error') {
      return res.status(400).json({ error: parsed.message || 'Status lookup failed' });
    }

    if (!parsed.data) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    return res.status(200).json(parsed.data);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
}
