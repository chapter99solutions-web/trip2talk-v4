/**
 * Mirror GAS test bookings into Supabase `bookings` table.
 * Usage: node scripts/seed-supabase-bookings.mjs
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
const gasUrl = env.VITE_GAS_WEBAPP_URL;
const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function parseMoney(v) {
  const n = Number(String(v || '').replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function mapStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (/confirm|deposit|paid|full/.test(s)) return 'confirmed';
  if (/cancel/.test(s)) return 'cancelled';
  return 'pending';
}

function mapIntake(raw) {
  const s = String(raw || '').trim().toLowerCase();
  return s === 'complete' || s === 'completed' ? 'complete' : 'pending';
}

async function loadFromGas() {
  if (!gasUrl) {
    console.warn('No VITE_GAS_WEBAPP_URL — using built-in test rows');
    return [
      {
        bookingId: 'BK-001',
        customerName: 'Test Client One',
        tourCode: 'MEL-4D3N',
        tourName: 'Secret Southern Coast (4D3N)',
        tourDate: '2026-06-15',
        totalAmount: 6200,
        bookingStatus: 'Deposit Paid',
        intakeStatus: 'Pending',
        email: 'client1@example.com',
      },
      {
        bookingId: 'BK-002',
        customerName: 'Test Client Two',
        tourCode: 'ULU-4D3N',
        tourName: 'The Red Desert Odyssey (4D3N)',
        tourDate: '2026-07-01',
        totalAmount: 3380,
        bookingStatus: 'Confirmed',
        intakeStatus: 'Complete',
        email: 'client2@example.com',
      },
      {
        bookingId: 'BK-003',
        customerName: 'Test Client Three',
        tourCode: 'NZ-6D5N',
        tourName: 'The Alpine Kingdom (6D5N)',
        tourDate: '2026-08-10',
        totalAmount: 4600,
        bookingStatus: 'Deposit Paid',
        intakeStatus: 'Pending',
        email: 'client3@example.com',
      },
    ];
  }

  const res = await fetch(`${gasUrl}?action=getBookings`, { cache: 'no-store' });
  const json = await res.json();
  const list = json.bookings ?? json.data ?? [];
  if (!Array.isArray(list)) return [];
  return list;
}

async function main() {
  const rows = await loadFromGas();
  console.log('Upserting', rows.length, 'bookings to Supabase…');

  for (const r of rows) {
    const external_id = String(r.bookingId || r.booking_id || r['Booking ID'] || '').trim();
    if (!external_id) continue;

    const payload = {
      external_id,
      client_name: String(r.customerName || r.customer_name || r['Customer Name'] || 'Guest').trim(),
      email: String(r.email || r['Email'] || '').trim() || null,
      trip_id: String(r.tourCode || r.tour_code || r['Tour Code'] || '').trim() || null,
      trip_name: String(r.tourName || r.tour_name || r['Tour Name'] || '').trim() || null,
      departure_date: String(r.tourDate || r.tour_date || r['Tour Date'] || '').slice(0, 10) || null,
      intake_status: mapIntake(r.intakeStatus || r['Intake Status']),
      total_amount: parseMoney(r.totalAmount || r.total_amount || r['Total Amount']),
      status: mapStatus(r.bookingStatus || r['Booking Status']),
    };

    const { error } = await supabase.from('bookings').upsert(payload, { onConflict: 'external_id' });
    if (error) {
      console.error('Failed', external_id, error.message);
      process.exit(1);
    }
    console.log('  ✓', external_id, payload.client_name, payload.status);
  }

  const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
  console.log('Supabase bookings count:', count ?? 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
