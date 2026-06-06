import { type VercelRequest, type VercelResponse } from './lib/gas';

// Vercel serverless TS build does not always include Node types.
declare const process: { env: Record<string, string | undefined> };

const FROM_ADDRESS =
  (process.env.RESEND_FROM_EMAIL ?? '').trim() || 'Trip2Talk <trip2talk@trip2talk.com.au>';

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

function formatThaiDate(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as {
    bookingId?: string;
    bookingRef?: string;
    booking_id?: string;
    customerName?: string;
    customerEmail?: string;
    customer_email?: string;
    tripName?: string;
    trip_name?: string;
    tripCode?: string;
    trip_code?: string;
    departureDate?: string;
    trip_date?: string;
    pax?: number;
    totalAud?: number;
    total_price?: number;
    pickupPoint?: string;
    pickup_point?: string;
    payId?: string;
  };

  const RESEND_API_KEY = (process.env.RESEND_API_KEY ?? '').trim();
  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured on the server' });
  }

  const bookingId = String(body.bookingId || body.booking_id || '').trim();
  const bookingRef = String(body.bookingRef || body.booking_id || bookingId || '').trim();
  const customerEmail = String(body.customerEmail || body.customer_email || '').trim();
  const customerName = String(body.customerName || '').trim();
  const tripName = String(body.tripName || body.trip_name || '').trim();
  const tripCode = String(body.tripCode || body.trip_code || '').trim();
  const departureDate = String(body.departureDate || body.trip_date || '').trim();
  const pax = Number(body.pax || 0) || 0;
  const totalAud = Number(body.totalAud ?? body.total_price ?? 0) || 0;
  const pickupPoint = String(body.pickupPoint || body.pickup_point || '').trim();
  const payId = String(body.payId || '').trim();

  if (!bookingRef || !customerEmail || !tripName || !departureDate || !tripCode || pax <= 0 || totalAud <= 0) {
    return res.status(400).json({
      error:
        'Missing required fields: bookingRef, customerEmail, tripName, tripCode, departureDate, pax, totalAud',
    });
  }

  const tripDateLabel = formatThaiDate(departureDate);
  const subject = `ยืนยันการจอง Trip2Talk — ${tripName}`;

  const summaryRows = [
    ['เลขที่จอง', bookingRef],
    ['ทริป', tripName],
    ['รหัสทริป', tripCode],
    ['วันเดินทาง', tripDateLabel],
    ['จำนวนผู้เดินทาง', `${pax} คน`],
    ['ราคารวม', formatAud(totalAud)],
    ['จุดนัดพบ / Pick-up', pickupPoint || '—'],
  ];

  const html = `<!DOCTYPE html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#f5f5f5;margin:0;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#0d1b2a;color:#ffffff;padding:24px 28px;">
        <div style="letter-spacing:4px;font-weight:800;color:#d4af37;">TRIP2TALK</div>
        <div style="margin-top:6px;font-size:14px;opacity:0.9;">ยืนยันการจอง / Booking confirmation</div>
      </div>
      <div style="padding:24px 28px;color:#111827;">
        <p style="margin:0 0 12px 0;font-size:16px;">สวัสดี${customerName ? ` ${escapeHtml(customerName)}` : ''},</p>
        <p style="margin:0 0 16px 0;color:#4b5563;font-size:14px;line-height:1.7;">
          ขอบคุณที่จองทริปกับ Trip2Talk สรุปรายละเอียดการจองของคุณมีดังนี้
        </p>

        <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          ${summaryRows
            .map(
              ([label, value], i, arr) => `
          <div style="display:flex;justify-content:space-between;gap:12px;padding:12px 14px;${
            i < arr.length - 1 ? 'border-bottom:1px solid #e5e7eb;' : ''
          }">
            <span style="color:#6b7280;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</span>
            <span style="font-size:13px;font-weight:700;text-align:right;">${escapeHtml(value)}</span>
          </div>`
            )
            .join('')}
        </div>

        ${
          payId
            ? `<div style="margin-top:18px;padding:14px;border-radius:10px;border:1px solid #fde68a;background:#fffbeb;">
          <div style="font-size:13px;color:#92400e;font-weight:800;margin-bottom:6px;">ชำระเงินผ่าน PayID</div>
          <div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:800;color:#111827;">${escapeHtml(
            payId
          )}</div>
          <div style="margin-top:6px;font-size:12px;color:#92400e;line-height:1.6;">
            ใส่เลขอ้างอิง <strong>${escapeHtml(bookingRef)}</strong> ในข้อความโอนเงินเพื่อให้ทีมงานตรวจสอบได้เร็วขึ้น
          </div>
        </div>`
            : ''
        }

        <p style="margin:18px 0 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
          หากมีคำถาม ตอบกลับอีเมลนี้หรือทัก Messenger ที่เพจ Trip2Talk ได้เลยค่ะ/ครับ
        </p>
      </div>
      <div style="padding:16px 28px;background:#f9fafb;color:#6b7280;font-size:12px;">
        Trip2Talk · Chapter 99 Photography · อีเมลอัตโนมัติจากระบบจอง
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
        from: FROM_ADDRESS,
        to: [customerEmail],
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return res.status(502).json({ success: false, error: errText || 'Resend email failed' });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to send confirmation email';
    return res.status(500).json({ success: false, error: msg });
  }
}
