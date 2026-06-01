import { gasWebAppUrl, type VercelRequest, type VercelResponse } from '../lib/gas';

/** True when GAS appendBookingRow_ succeeded (not a health/stub payload). */
function isSettlementAppendOk(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const o = payload as Record<string, unknown>;
  if (o.status === 'error' || o.ok === false) return false;
  const msg = String(o.message ?? '').toLowerCase();
  if (msg.includes('appended') && msg.includes('settlements')) return true;
  if (o.status === 'ok' && msg.includes('booking row appended')) return true;
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const gasUrl = gasWebAppUrl();
  if (!gasUrl) {
    return res.status(500).json({ error: 'GAS_WEBAPP_URL is not configured on the server' });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const amount = Number(body.amount ?? body.revenue ?? 0) || 0;
  const payload = {
    ...body,
    action: 'addBooking',
    tour_code: body.tour_code ?? body.tourCode,
    amount,
    revenue: amount,
    created_at: body.created_at ?? new Date().toISOString(),
  };

  try {
    const gasRes = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await gasRes.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      return res.status(502).json({ success: false, error: 'Invalid JSON from GAS', raw: text.slice(0, 500) });
    }

    if (!gasRes.ok) {
      return res.status(502).json({ success: false, error: `GAS HTTP ${gasRes.status}`, response: parsed });
    }

    if (!isSettlementAppendOk(parsed)) {
      const o = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      const hint =
        typeof o.data === 'object' && o.data && !Array.isArray(o.data)
          ? 'Deploy gas/Code.gs v2.8 and use ?action=getTrips to verify'
          : 'Unexpected GAS response — settlement row was not appended';
      return res.status(502).json({ success: false, error: hint, response: parsed });
    }

    return res.status(200).json({ success: true, response: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ success: false, error: msg });
  }
}
