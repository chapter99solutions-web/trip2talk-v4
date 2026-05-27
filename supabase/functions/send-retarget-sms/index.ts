import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER') ?? '';

interface RetargetPayload {
  client_name: string;
  client_phone: string;
  vip_tier: string;
  total_trips: number;
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
    const payload: RetargetPayload = await req.json();
    const tierLabel = payload.vip_tier.toUpperCase();
    const smsBody = `Trip2Talk — ขอบคุณที่ร่วมทริปกับเรา ${payload.client_name}!\nVIP: ${tierLabel} · ทริปที่แล้ว: ${payload.total_trips}\nพร้อมจองทริปถัดไป? ดูทริปที่ www.trip2talk.com.au`;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !payload.client_phone) {
      return new Response(
        JSON.stringify({ success: false, sms: false, skipped: 'Twilio or phone not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const ok = twilioRes.ok;
    const errText = ok ? '' : await twilioRes.text();

    return new Response(JSON.stringify({ success: ok, sms: ok, error: errText || undefined }), {
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
