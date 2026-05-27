/// <reference types="jsr:@supabase/functions-js/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';

type WaiverLanguage = 'EN' | 'TH';

function getClientIp(req: Request): string | null {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() ?? null;
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase env' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json();

  const ip = getClientIp(req);

  const waiverType = (body.waiver_type as string) ?? 'core';

  const insertRow: Record<string, unknown> = {
    client_id: body.client_id as string,
    tour_id: body.tour_id as string,
    agreed_terms: Boolean(body.agreed_terms),
    agreed_risk: Boolean(body.agreed_risk),
    agreed_medical: Boolean(body.agreed_medical),
    agreed_media: Boolean(body.agreed_media),
    agreed_privacy: Boolean(body.agreed_privacy),
    digital_signature: body.digital_signature as string,
    language: body.language as WaiverLanguage,
    signed_at: body.signed_at as string,
    content_hash: body.content_hash as string,
    ip_address: ip,
    waiver_type: waiverType,
    agreed_transport: Boolean(body.agreed_transport),
  };

  const { error } = await client.from('client_waivers').insert(insertRow);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  });
});

