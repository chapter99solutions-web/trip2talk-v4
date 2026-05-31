/**
 * test-seat-limit.mjs — ทดสอบ "ด่านจอง 2 ชั้น" ที่ระดับฐานข้อมูล (atomic):
 *   ด่าน 1 (DATE GATE) : ทริปที่ไม่มี departure_start ต้องถูกปฏิเสธ ("TRIP_NOT_OPEN")
 *   ด่าน 2 (SEAT GATE) : ทริปที่เต็มต้องถูกปฏิเสธ ("TRIP_FULL")
 *   CONCURRENCY        : จองพร้อมกัน 2 ครั้งบน "ที่นั่งสุดท้าย" → สำเร็จได้แค่ 1 เท่านั้น
 *
 * ทดสอบฟังก์ชัน Postgres claim_seat_and_book จาก supabase/16-schema-seat-limit-date-gate.sql
 * (ต้องรัน migration 16 ใน Supabase SQL Editor ก่อน).
 *
 * Usage: node scripts/test-seat-limit.mjs
 * ต้องมี VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ใน .env / .env.local / env.
 *
 * Expected output (เมื่อผ่านทั้งหมด):
 *   ✓ [DATE GATE] ทริปไม่มีวันออกเดินทาง ถูกปฏิเสธด้วย TRIP_NOT_OPEN
 *   ✓ [SEAT GATE] ทริปเต็ม ถูกปฏิเสธด้วย TRIP_FULL
 *   ✓ [CONCURRENCY] จองพร้อมกัน 2 ครั้งบนที่นั่งสุดท้าย → สำเร็จ 1 / ปฏิเสธ 1 (TRIP_FULL)
 *   ALL GOOD ✓ seat-limit + date-gate enforced atomically
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

/** วันสุ่มในอนาคตไกล ๆ (กันชนกฎ "หนึ่งทริปต่อวัน" กับข้อมูลจริง) */
function randomFutureDate(offset = 0) {
  const day = String(1 + ((Math.floor(Math.random() * 27) + offset) % 27) + 1).padStart(2, '0');
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  return `2099-${month}-${day}`;
}

/** สร้างทริปทดสอบหนึ่งแถวในตาราง tours แล้วคืน { id, tourCode } */
async function createTestTour(tenantId, { slotsMax, slotsBooked, departureStart }) {
  const tourCode = `T2T-SEATTEST-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const { data, error } = await supabase
    .from('tours')
    .insert({
      tenant_id: tenantId,
      trip_code: tourCode,
      destination: 'SEATTEST',
      start_date: '2099-01-01',
      end_date: '2099-01-02',
      price_aud: 100,
      max_pax: slotsMax ?? 6,
      slots_max: slotsMax,
      slots_booked: slotsBooked,
      departure_start: departureStart,
    })
    .select('id, trip_code')
    .single();
  if (error) {
    console.error('สร้างทริปทดสอบไม่สำเร็จ:', error.message);
    console.error('→ ตรวจว่ารัน migration supabase/16-schema-seat-limit-date-gate.sql แล้วหรือยัง');
    process.exit(1);
  }
  return { id: data.id, tourCode: data.trip_code };
}

/** เรียก RPC จอง 1 ที่นั่ง — คืน { ok, error } */
async function claim(tenantId, tourCode, tripDate) {
  const { data, error } = await supabase.rpc('claim_seat_and_book', {
    p_tenant_id: tenantId,
    p_tour_code: tourCode,
    p_client_id: null,
    p_amount_paid_aud: 100,
    p_reference_number: `T2T-SEATTEST-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    p_party_pax: 1,
    p_trip_size_tier: null,
    p_pickup: 'test_pickup',
    p_payment_method: 'PAYID',
    p_trip_date: tripDate,
  });
  return { ok: !error, bookingId: data ?? null, error: error?.message ?? null };
}

async function cleanup(tourIds) {
  for (const id of tourIds) {
    await supabase.from('tour_bookings').delete().eq('tour_id', id);
    await supabase.from('tours').delete().eq('id', id);
  }
}

async function main() {
  const { data: tenant } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
  if (!tenant?.id) {
    console.error('ต้องมีอย่างน้อย 1 tenant ในฐานข้อมูลก่อนทดสอบ');
    process.exit(1);
  }
  const tenantId = tenant.id;
  const createdTourIds = [];
  let allPass = true;

  try {
    // ───────── CASE A: DATE GATE (ไม่มีวันออกเดินทาง) ─────────
    const noDate = await createTestTour(tenantId, {
      slotsMax: 5,
      slotsBooked: 0,
      departureStart: null,
    });
    createdTourIds.push(noDate.id);
    const aRes = await claim(tenantId, noDate.tourCode, randomFutureDate());
    if (!aRes.ok && /TRIP_NOT_OPEN/.test(aRes.error || '')) {
      console.log('✓ [DATE GATE] ทริปไม่มีวันออกเดินทาง ถูกปฏิเสธด้วย TRIP_NOT_OPEN');
    } else {
      allPass = false;
      console.error('FAIL [DATE GATE]: คาดว่าโดน TRIP_NOT_OPEN แต่ได้:', aRes);
    }

    // ───────── CASE B: SEAT GATE (เต็มแล้ว) ─────────
    const fullTour = await createTestTour(tenantId, {
      slotsMax: 2,
      slotsBooked: 2,
      departureStart: '2099-05-05',
    });
    createdTourIds.push(fullTour.id);
    const bRes = await claim(tenantId, fullTour.tourCode, randomFutureDate());
    if (!bRes.ok && /TRIP_FULL/.test(bRes.error || '')) {
      console.log('✓ [SEAT GATE] ทริปเต็ม ถูกปฏิเสธด้วย TRIP_FULL');
    } else {
      allPass = false;
      console.error('FAIL [SEAT GATE]: คาดว่าโดน TRIP_FULL แต่ได้:', bRes);
    }

    // ───────── CASE C: CONCURRENCY (ที่นั่งสุดท้าย) ─────────
    // slots_max=3, slots_booked=2 → เหลือ 1 ที่นั่ง. ยิงพร้อมกัน 2 คำขอ
    // (คนละ trip_date เพื่อไม่ให้กฎ "หนึ่งทริปต่อวัน" มาแทรก) → ต้องสำเร็จแค่ 1.
    const lastSeat = await createTestTour(tenantId, {
      slotsMax: 3,
      slotsBooked: 2,
      departureStart: '2099-06-06',
    });
    createdTourIds.push(lastSeat.id);
    const [c1, c2] = await Promise.all([
      claim(tenantId, lastSeat.tourCode, randomFutureDate(1)),
      claim(tenantId, lastSeat.tourCode, randomFutureDate(14)),
    ]);
    const successes = [c1, c2].filter((r) => r.ok).length;
    const fulls = [c1, c2].filter((r) => !r.ok && /TRIP_FULL/.test(r.error || '')).length;
    if (successes === 1 && fulls === 1) {
      console.log(
        '✓ [CONCURRENCY] จองพร้อมกัน 2 ครั้งบนที่นั่งสุดท้าย → สำเร็จ 1 / ปฏิเสธ 1 (TRIP_FULL)'
      );
    } else {
      allPass = false;
      console.error('FAIL [CONCURRENCY]: คาดว่าสำเร็จ 1 / TRIP_FULL 1 แต่ได้:', { c1, c2 });
    }

    // ยืนยัน slots_booked ไม่เกิน slots_max หลังการแข่งกัน (ต้อง = 3)
    const { data: finalTour } = await supabase
      .from('tours')
      .select('slots_booked, slots_max')
      .eq('id', lastSeat.id)
      .single();
    if (finalTour && finalTour.slots_booked <= finalTour.slots_max) {
      console.log(
        `✓ [INVARIANT] slots_booked (${finalTour.slots_booked}) <= slots_max (${finalTour.slots_max}) — ไม่ overbook`
      );
    } else {
      allPass = false;
      console.error('FAIL [INVARIANT]: slots_booked เกิน slots_max!', finalTour);
    }
  } finally {
    await cleanup(createdTourIds);
    console.log('cleaned up test tours:', createdTourIds.length);
  }

  if (!allPass) process.exit(1);
  console.log('\nALL GOOD ✓ seat-limit + date-gate enforced atomically');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
