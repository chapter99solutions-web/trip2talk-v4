/**
 * Seed 3 test bookings (BK-001..003) to Customer_Bookings via GAS.
 * Usage: node scripts/seed-test-booking.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

if (!gasUrl) {
  console.error('Missing VITE_GAS_WEBAPP_URL');
  process.exit(1);
}

function isHealthPing(json) {
  const data = json?.data;
  return (
    json?.status === 'ok' &&
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    String(data.status || '').toLowerCase().includes('gas running')
  );
}

const res = await fetch(`${gasUrl}?action=seedTestBookings`);
const json = await res.json();
console.log('seedTestBookings:', json);
if (json.status !== 'ok' || isHealthPing(json)) {
  console.error('Deploy gas/Code.gs v2.3+ with seedTestBookings, then retry.');
  process.exit(1);
}

const verify = await fetch(`${gasUrl}?action=getBookings`);
const verifyJson = await verify.json();
const list = verifyJson.bookings ?? verifyJson.data ?? [];
console.log('getBookings count:', Array.isArray(list) ? list.length : 0);
if (Array.isArray(list)) {
  list.forEach((b) => console.log(' -', b.bookingId, b.customerName, b.tourCode, b.tourName));
}
if (isHealthPing(verifyJson)) {
  console.error('getBookings not on live GAS yet — redeploy Code.gs');
  process.exit(1);
}
