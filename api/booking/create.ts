import { gasWebAppUrl, siteOrigin, type VercelRequest, type VercelResponse } from '../lib/gas';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as {
    bookingId?: string;
    tourCode?: string;
    customerName?: string;
    bookingStatus?: string;
  };

  const bookingId = String(body.bookingId || '').trim();
  const tourCode = String(body.tourCode || '').trim();
  const customerName = String(body.customerName || '').trim();
  const bookingStatus = String(body.bookingStatus || 'Deposit Paid').trim();

  if (!bookingId || !tourCode || !customerName) {
    return res.status(400).json({ error: 'Missing required fields: bookingId, tourCode, customerName' });
  }

  const gasUrl = gasWebAppUrl();
  if (!gasUrl) {
    return res.status(500).json({ error: 'GAS_WEBAPP_URL is not configured on the server' });
  }

  try {
    const gasRes = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createBooking',
        bookingId,
        tourCode,
        customerName,
        bookingStatus,
      }),
    });

    const text = await gasRes.text();
    let data: { status?: string; message?: string; intakeStatus?: string };
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      return res.status(502).json({ error: 'Invalid response from booking service' });
    }

    if (data.status === 'error') {
      return res.status(400).json({ error: data.message || 'Booking creation failed' });
    }

    const origin = siteOrigin();
    return res.status(200).json({
      success: true,
      bookingId,
      intakeStatus: data.intakeStatus || 'Pending',
      portalLink: `${origin}/portal?booking=${encodeURIComponent(bookingId)}`,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to create booking' });
  }
}
