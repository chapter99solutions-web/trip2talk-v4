/**
 * test-double-booking.mjs — ทดสอบกฎ "หนึ่งทริปต่อหนึ่งวัน".
 *
 * จองสองครั้งในวันเดียวกัน: ครั้งแรกต้องสำเร็จ, ครั้งที่สองต้องถูกปฏิเสธ
 * ด้วย Postgres error code 23505 (unique_violation).
 *
 * ต้องรัน migration supabase/15-schema-one-trip-per-day.sql ก่อน.
 * Usage: node scripts/test-double-booking.mjs
 * ต้องมี VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ใน .env / .env.local / env.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile(name) {
  const path = resolve(root, name);
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local'), ...process.env };
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  // ใช้วันในอนาคตแบบสุ่มเพื่อลดโอกาสชนข้อมูลจริง
  const tripDate = `2099-01-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`;

  // หา tenant + tour จริงมาใช้ (FK constraints)
  const { data: tenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
  const { data: tour } = await supabase.from('tours').select('id').limit(1).maybeSingle();
  if (!tenant?.id || !tour?.id) {
    console.error('ต้องมีอย่างน้อย 1 tenant และ 1 tour ในฐานข้อมูลก่อนทดสอบ');
    process.exit(1);
  }

  const base = {
    tenant_id: tenant.id,
    tour_id: tour.id,
    amount_paid_aud: 100,
    status: 'PENDING',
    payment_method: 'PAYID',
    trip_date: tripDate,
  };

  console.log('Trip date under test:', tripDate);

  // ครั้งแรก: ต้องสำเร็จ
  const first = await supabase
    .from('tour_bookings')
    .insert({ ...base, reference_number: `T2T-TEST-A-${Date.now()}` })
    .select('id')
    .maybeSingle();

  if (first.error) {
    console.error('FAIL: การจองครั้งแรกควรสำเร็จ แต่ error:', first.error.message);
    process.exit(1);
  }
  console.log('✓ การจองครั้งแรกสำเร็จ:', first.data?.id);

  // ครั้งที่สอง (วันเดียวกัน): ต้องถูกปฏิเสธด้วย 23505
  const second = await supabase
    .from('tour_bookings')
    .insert({ ...base, reference_number: `T2T-TEST-B-${Date.now()}` })
    .select('id')
    .maybeSingle();

  let pass = false;
  if (second.error && second.error.code === '23505') {
    console.log('✓ การจองครั้งที่สองถูกปฏิเสธอย่างถูกต้อง (23505 unique_violation)');
    pass = true;
  } else if (second.error) {
    console.error('FAIL: ถูกปฏิเสธแต่ code ไม่ใช่ 23505:', second.error.code, second.error.message);
  } else {
    console.error('FAIL: การจองครั้งที่สองไม่ควรสำเร็จ แต่กลับสำเร็จ:', second.data?.id);
  }

  // ล้างข้อมูลทดสอบ
  await supabase.from('tour_bookings').delete().eq('trip_date', tripDate);
  console.log('cleaned up test rows for', tripDate);

  if (!pass) process.exit(1);
  console.log('\nALL GOOD ✓ one-trip-per-day enforced');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
