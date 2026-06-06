import { gasWebAppUrl, type VercelRequest, type VercelResponse } from '../lib/gas';

function isPlAppendOk(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const o = payload as Record<string, unknown>;
  if (o.status === 'error' || o.ok === false) return false;
  const msg = String(o.message ?? '').toLowerCase();
  return msg.includes('p&l row appended') || msg.includes('p&l row updated');
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
  const revenue = Number(body.revenue ?? 0) || 0;
  const expenses = Number(body.expenses ?? 0) || 0;
  const commissions = Number(body.commissions ?? 0) || 0;
  const payload = {
    ...body,
    action: 'append_pl',
    trip_code: body.trip_code ?? body.tour_code,
    trip_name: body.trip_name ?? body.title ?? body.trip_code,
    revenue,
    expenses,
    commissions,
    net_profit: Number(body.net_profit ?? revenue - expenses - commissions),
    gst_collected: Number(body.gst_collected ?? (revenue > 0 ? Math.round((revenue / 11) * 100) / 100 : 0)),
    gst_claimed: Number(body.gst_claimed ?? 0),
    sync_date: body.sync_date ?? new Date().toISOString(),
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

    if (!isPlAppendOk(parsed)) {
      return res.status(502).json({
        success: false,
        error: 'Unexpected GAS response — P&L row was not written',
        response: parsed,
      });
    }

    return res.status(200).json({ success: true, response: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ success: false, error: msg });
  }
}
