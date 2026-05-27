import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER') ?? '';

interface ReceiptPayload {
  client_name: string;
  client_email: string;
  client_phone: string;
  trip_code: string;
  amount_aud: number;
  reference_number: string;
  payment_method: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: ReceiptPayload = await req.json();
    const results = { email: false, sms: false, errors: [] as string[] };

    const amountFormatted = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(payload.amount_aud);

    const gstAmount = (payload.amount_aud / 11).toFixed(2);

    if (RESEND_API_KEY && payload.client_email) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
            .header { background: #0a0a0a; padding: 32px; text-align: center; }
            .header h1 { color: #f59e0b; font-size: 28px; margin: 0; letter-spacing: 4px; }
            .header p { color: #6b7280; font-size: 12px; margin: 4px 0 0; }
            .body { padding: 32px; }
            .receipt-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
            .receipt-row:last-child { border-bottom: none; }
            .label { color: #6b7280; font-size: 14px; }
            .value { color: #111; font-size: 14px; font-weight: 600; }
            .amount-box { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
            .amount-box .amount { font-size: 36px; font-weight: 700; color: #f59e0b; }
            .amount-box .gst { font-size: 12px; color: #6b7280; margin-top: 4px; }
            .footer { background: #f9fafb; padding: 20px 32px; text-align: center; }
            .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
            .ref { font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>TRIP2TALK</h1>
              <p>Payment Receipt — Private Photo Journey</p>
            </div>
            <div class="body">
              <p style="color:#374151;font-size:16px;">Dear <strong>${payload.client_name}</strong>,</p>
              <p style="color:#6b7280;font-size:14px;">Your payment has been successfully processed. Please keep this receipt for your records.</p>
              
              <div class="amount-box">
                <div class="amount">${amountFormatted}</div>
                <div class="gst">Includes GST: $${gstAmount} AUD</div>
              </div>

              <div class="receipt-row">
                <span class="label">Reference</span>
                <span class="value"><span class="ref">${payload.reference_number}</span></span>
              </div>
              <div class="receipt-row">
                <span class="label">Trip Code</span>
                <span class="value">${payload.trip_code}</span>
              </div>
              <div class="receipt-row">
                <span class="label">Payment Method</span>
                <span class="value">${payload.payment_method}</span>
              </div>
              <div class="receipt-row">
                <span class="label">Date</span>
                <span class="value">${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            <div class="footer">
              <p>Trip2Talk Australia — Private Photo Journey</p>
              <p>This is an automated receipt. Please do not reply to this email.</p>
              <p style="color:#f59e0b;font-size:11px;">ABN: XX XXX XXX XXX</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Trip2Talk <receipts@trip2talk.com.au>',
          to: [payload.client_email],
          subject: `Payment Receipt — ${payload.trip_code} — ${amountFormatted}`,
          html: emailHtml,
        }),
      });

      if (emailRes.ok) {
        results.email = true;
      } else {
        const err = await emailRes.text();
        results.errors.push(`Email failed: ${err}`);
      }
    }

    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && payload.client_phone) {
      const smsBody = `Trip2Talk Receipt\nRef: ${payload.reference_number}\nTrip: ${payload.trip_code}\nAmount: ${amountFormatted}\nMethod: ${payload.payment_method}\nThank you!`;

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: TWILIO_FROM_NUMBER,
            To: payload.client_phone,
            Body: smsBody,
          }),
        }
      );

      if (twilioRes.ok) {
        results.sms = true;
      } else {
        const err = await twilioRes.text();
        results.errors.push(`SMS failed: ${err}`);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
