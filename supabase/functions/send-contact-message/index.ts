import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const CONTACT_TO = 'trip2talksyd@gmail.com';
// Preferred branded sender once the domain is verified in Resend.
const PREFERRED_FROM = 'Trip2Talk <noreply@trip2talk.com.au>';
// Resend's shared sender works without domain verification as a reliable fallback.
const FALLBACK_FROM = 'Trip2Talk <onboarding@resend.dev>';

interface ContactPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  if (!RESEND_API_KEY) {
    return json({ success: false, error: 'Email service is not configured' }, 500);
  }

  let payload: ContactPayload;
  try {
    payload = (await req.json()) as ContactPayload;
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const firstName = String(payload.firstName ?? '').trim();
  const lastName = String(payload.lastName ?? '').trim();
  const email = String(payload.email ?? '').trim();
  const message = String(payload.message ?? '').trim();

  if (!firstName || !lastName || !email || !message) {
    return json(
      { success: false, error: 'Missing required fields: firstName, lastName, email, message' },
      400
    );
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return json({ success: false, error: 'Invalid email address' }, 400);
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const subject = `New Contact Form Message — ${fullName}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; color: #111; background: #f5f5f5; margin: 0; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 28px;">
        <h2 style="margin: 0 0 16px; color: #0a0a0a;">New Contact Form Message</h2>
        <p style="margin: 4px 0;"><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin: 16px 0 4px;"><strong>Message:</strong></p>
        <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(message)}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">Sent from the Trip2Talk website contact form.</p>
      </div>
    </body>
    </html>
  `;

  const emailText = `New Contact Form Message\n\nName: ${fullName}\nEmail: ${email}\n\nMessage:\n${message}`;

  async function sendVia(from: string): Promise<{ ok: boolean; body: string }> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [CONTACT_TO],
        reply_to: email,
        subject,
        html: emailHtml,
        text: emailText,
      }),
    });
    return { ok: res.ok, body: await res.text() };
  }

  try {
    let result = await sendVia(PREFERRED_FROM);

    // If the branded domain isn't verified yet, retry with Resend's shared sender.
    if (!result.ok && /not verified|domain/i.test(result.body)) {
      result = await sendVia(FALLBACK_FROM);
    }

    if (!result.ok) {
      return json({ success: false, error: `Email failed: ${result.body}` }, 502);
    }

    return json({ success: true });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    return json({ success: false, error: errMessage }, 500);
  }
});
