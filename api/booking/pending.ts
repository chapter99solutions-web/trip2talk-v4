import { gasWebAppUrl, type VercelRequest, type VercelResponse } from '../lib/gas';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const gasUrl = gasWebAppUrl();
  if (!gasUrl) {
    return res.status(500).json({ error: 'GAS_WEBAPP_URL is not configured on the server' });
  }

  try {
    const gasRes = await fetch(`${gasUrl.replace(/\/$/, '')}?action=getPendingIntakes`, {
      method: 'GET',
      cache: 'no-store',
    });

    const text = await gasRes.text();
    let parsed: { status?: string; message?: string; data?: unknown[] };
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      return res.status(502).json({ error: 'Invalid response from booking service' });
    }

    if (parsed.status === 'error') {
      return res.status(400).json({ error: parsed.message || 'Failed to load pending intakes' });
    }

    return res.status(200).json(parsed.data ?? []);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch pending intakes' });
  }
}
