import { type VercelRequest, type VercelResponse } from './lib/gas';

// Vercel serverless TS build does not always include Node types.
declare const process: { env: Record<string, string | undefined> };

function formatAud(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as {
    bookingId?: string;
    bookingRef?: string;
    customerName?: string;
    customerEmail?: string;
    tripName?: string;
    tripCode?: string;
    departureDate?: string;
    pax?: number;
    totalAud?: number;
    payId?: string;
  };

  const RESEND_API_KEY = (process.env.RESEND_API_KEY ?? '').trim();
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured on the server' });
  }

  const bookingId = String(body.bookingId || '').trim();
  const bookingRef = String(body.bookingRef || '').trim();
  const customerEmail = String(body.customerEmail || '').trim();
  const customerName = String(body.customerName || '').trim();
  const tripName = String(body.tripName || '').trim();
  const tripCode = String(body.tripCode || '').trim();
  const departureDate = String(body.departureDate || '').trim();
  const pax = Number(body.pax || 0) || 0;
  const totalAud = Number(body.totalAud || 0) || 0;
  const payId = String(body.payId || '').trim();

  if (!bookingId || !bookingRef || !customerEmail || !tripName || !departureDate || !tripCode || pax <= 0 || totalAud <= 0) {
    return res.status(400).json({
      error:
        'Missing required fields: bookingId, bookingRef, customerEmail, tripName, tripCode, departureDate, pax, totalAud',
    });
  }

  const subject = `ยืนยันการจอง Trip2Talk – ${tripName}`;
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;margin:0;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#0d1b2a;color:#ffffff;padding:24px 28px;">
        <div style="letter-spacing:4px;font-weight:800;color:#d4af37;">TRIP2TALK</div>
        <div style="margin-top:6px;font-size:14px;opacity:0.9;">Booking confirmation</div>
      </div>
      <div style="padding:24px 28px;color:#111827;">
        <p style="margin:0 0 12px 0;font-size:16px;">สวัสดี${customerName ? ` ${escapeHtml(customerName)}` : ''},</p>
        <p style="margin:0 0 16px 0;color:#4b5563;font-size:14px;line-height:1.6;">
          ขอบคุณสำหรับการจองกับ Trip2Talk — รายละเอียดการจองของคุณอยู่ด้านล่าง
        </p>

        <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <div style="display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:13px;">Booking ref</span>
            <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;">${escapeHtml(
              bookingRef
            )}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:13px;">Trip</span>
            <span style="font-weight:700;">${escapeHtml(tripName)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:13px;">Trip code</span>
            <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(tripCode)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:13px;">Departure date</span>
            <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(
              departureDate
            )}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:13px;">Guests</span>
            <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${pax}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:12px 14px;">
            <span style="color:#6b7280;font-size:13px;">Total price</span>
            <span style="font-weight:800;color:#0d1b2a;">${formatAud(totalAud)}</span>
          </div>
        </div>

        <div style="margin-top:18px;padding:14px 14px;border-radius:10px;border:1px solid #fde68a;background:#fffbeb;">
          <div style="font-size:13px;color:#92400e;font-weight:800;margin-bottom:6px;">PayID</div>
          <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:15px;font-weight:800;color:#111827;">
            ${escapeHtml(payId || '—')}
          </div>
          <div style="margin-top:6px;font-size:12px;color:#92400e;line-height:1.6;">
            ใส่เลขอ้างอิง (Ref) เป็น <strong>${escapeHtml(bookingRef)}</strong> เพื่อให้ทีมงานตรวจสอบได้เร็วขึ้น
          </div>
        </div>

        <p style="margin:18px 0 0 0;color:#6b7280;font-size:12px;">
          Booking ID: <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(
            bookingId
          )}</span>
        </p>
      </div>
      <div style="padding:16px 28px;background:#f9fafb;color:#6b7280;font-size:12px;">
        Trip2Talk · Chapter 99 Photography · This is an automated email.
      </div>
    </div>
  </body>
</html>`;

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Trip2Talk <receipts@trip2talk.com.au>',
        to: [customerEmail, 'trip2talksyd@gmail.com'],
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return res.status(502).json({ error: errText || 'Resend email failed' });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send confirmation email';
    return res.status(500).json({ error: msg });
  }
}

