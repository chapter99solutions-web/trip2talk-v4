/**
 * Seed all 8 master trips to Trips_Data via GAS web app.
 * Usage: node scripts/seed-trips.mjs
 * Requires VITE_GAS_WEBAPP_URL in .env or .env.local
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile(name) {
  const path = resolve(root, name);
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

const env = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local'), ...process.env };
const gasUrl = env.VITE_GAS_WEBAPP_URL;

if (!gasUrl) {
  console.error('Missing VITE_GAS_WEBAPP_URL in .env or .env.local');
  process.exit(1);
}

const trips = [
  {
    tourCode: 'MEL-4D3N',
    tourName: 'Secret Southern Coast (4D3N)',
    countryTag: 'AU-VIC',
    weather: 'Autumn 14-18°C',
    standardPrice: 1550,
    privatePrice: 2300,
    tripType: 'overnight',
    season: 'autumn',
    durationDays: 4,
    maxPax: 5,
    highlights: 'Great Ocean Road, Pink Lake, Melbourne City',
    pickupType: 'airport_terminal',
    coverUrl: 'https://images.unsplash.com/photo-1514395462725-7b8b0e7f0870?w=1200&q=80',
    messengerUrl: 'https://m.me/trip2talk.chapter99',
  },
  {
    tourCode: 'ULU-4D3N',
    tourName: 'The Red Desert Odyssey (4D3N)',
    countryTag: 'AU-NT',
    weather: 'Desert 28°C day / 8°C night',
    standardPrice: 1690,
    privatePrice: 1690,
    tripType: 'overnight',
    season: 'all',
    durationDays: 4,
    maxPax: 5,
    highlights: 'Uluru Sunrise, Field of Light, Kata Tjuta',
    pickupType: 'airport_terminal',
    coverUrl: 'https://images.unsplash.com/photo-1523482580695-1581f6760c66?w=1200&q=80',
    messengerUrl: 'https://m.me/trip2talk.chapter99',
  },
  {
    tourCode: 'NZ-6D5N',
    tourName: 'The Alpine Kingdom (6D5N)',
    countryTag: 'NZ-SI',
    weather: 'Varies by season',
    standardPrice: 2300,
    privatePrice: 2300,
    tripType: 'overnight',
    season: 'all',
    durationDays: 6,
    maxPax: 5,
    highlights: 'Lake Tekapo, Milford Sound, Wanaka, Mt Cook',
    pickupType: 'airport_terminal',
    coverUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    messengerUrl: 'https://m.me/trip2talk.chapter99',
  },
  {
    tourCode: 'TAS-3D2N',
    tourName: 'The Aurora Edge (3D2N)',
    countryTag: 'AU-TAS',
    weather: 'Winter 6-12°C',
    standardPrice: 1350,
    privatePrice: 1650,
    tripType: 'overnight',
    season: 'winter',
    durationDays: 3,
    maxPax: 6,
    highlights: 'Mt Wellington Aurora Hunt, Bruny Island, MONA',
    pickupType: 'airport_terminal',
    coverUrl: 'https://images.unsplash.com/photo-1483347756197-71ef7742304b?w=1200&q=80',
    messengerUrl: 'https://m.me/trip2talk.chapter99',
  },
  {
    tourCode: 'TAS-LH-4D3N',
    tourName: 'Lavender & Aurora Trail (4D3N)',
    countryTag: 'AU-TAS',
    weather: 'Summer 16-22°C',
    standardPrice: 1650,
    privatePrice: 1850,
    tripType: 'overnight',
    season: 'summer',
    durationDays: 4,
    maxPax: 6,
    highlights: 'Bridestowe Lavender, Cradle Mountain, MONA',
    pickupType: 'airport_terminal',
    coverUrl: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1200&q=80',
    messengerUrl: 'https://m.me/trip2talk.chapter99',
  },
  {
    tourCode: 'KIA-1DAY',
    tourName: 'The Coastal Cliffs (1 Day)',
    countryTag: 'AU-NSW',
    weather: 'Winter 12-16°C',
    standardPrice: 250,
    privatePrice: 290,
    tripType: 'one_day',
    season: 'winter',
    durationDays: 1,
    maxPax: 4,
    highlights: 'Helensburgh Station, Seacliff Bridge, Bombo Headland',
    pickupType: 'thaitown_main',
    coverUrl: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&q=80',
    messengerUrl: 'https://m.me/trip2talk.chapter99',
  },
  {
    tourCode: 'CAN-2D1N',
    tourName: 'The Golden Fields (2D1N)',
    countryTag: 'AU-NSW',
    weather: 'Spring 18-24°C',
    standardPrice: 380,
    privatePrice: 380,
    tripType: 'overnight',
    season: 'spring',
    durationDays: 2,
    maxPax: 4,
    highlights: 'Canola Fields, Cowra Old Town, Japanese Garden',
    pickupType: 'thaitown_main',
    coverUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
    messengerUrl: 'https://m.me/trip2talk.chapter99',
  },
  {
    tourCode: 'SYD-1DAY',
    tourName: 'Secret Sydney (1 Day)',
    countryTag: 'AU-NSW',
    weather: 'All seasons',
    standardPrice: 250,
    privatePrice: 680,
    tripType: 'one_day',
    season: 'all',
    durationDays: 1,
    maxPax: 4,
    highlights: 'Sydney Hidden Gems, Milky Way Hunt, Anna Bay Dunes',
    pickupType: 'thaitown_main',
    coverUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&q=80',
    messengerUrl: 'https://m.me/trip2talk.chapter99',
  },
];

async function main() {
  console.log('Seeding', trips.length, 'trips to GAS…');

  // Try bulk seed first (requires deployed Code.gs v2.1+)
  try {
    const bulk = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ sheet: 'Trips_Data', action: 'seedMasterTrips', trips }),
    });
    const bulkJson = await bulk.json();
    if (bulkJson.status === 'ok' && (bulkJson.tourCodes?.length || /seeded/i.test(String(bulkJson.message || '')))) {
      console.log('Bulk seed OK:', bulkJson);
      return;
    }
    console.warn('Bulk seed not available, falling back to per-trip POST…', bulkJson);
  } catch (e) {
    console.warn('Bulk seed failed, falling back to per-trip POST…', e.message);
  }

  for (const trip of trips) {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ sheet: 'Trips_Data', trip }),
    });
    const json = await res.json();
    if (json.status !== 'ok') {
      console.error('Failed', trip.tourCode, json);
      process.exit(1);
    }
    console.log('Saved', trip.tourCode);
  }

  const verify = await fetch(`${gasUrl}?action=getTrips`);
  const verifyJson = await verify.json();
  const count = Array.isArray(verifyJson.data)
    ? verifyJson.data.length
    : Array.isArray(verifyJson.trips)
      ? verifyJson.trips.length
      : 0;
  console.log('Verify getTrips row count:', count);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
