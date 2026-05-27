import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public', 'icons');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

mkdirSync(outDir, { recursive: true });

function svgIcon(size) {
  const padding = size * 0.1;
  const radius = size / 2 - padding;
  const stroke = size * 0.06;
  const fontSize = size * 0.35;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0a"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#f59e0b" stroke-width="${stroke}"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#f59e0b" font-family="Arial, sans-serif" font-weight="700" font-size="${fontSize}">T2</text>
</svg>`;
}

async function generateWithSharp() {
  const sharp = (await import('sharp')).default;
  for (const size of sizes) {
    const outPath = join(outDir, `icon-${size}.png`);
    await sharp(Buffer.from(svgIcon(size))).png().toFile(outPath);
    console.log(`Generated icon-${size}.png (sharp)`);
  }
  await sharp(Buffer.from(svgIcon(192))).png().toFile(join(root, 'public', 'apple-touch-icon.png'));
  await sharp(Buffer.from(svgIcon(32))).png().toFile(join(root, 'public', 'favicon.ico'));
  console.log('Generated apple-touch-icon.png and favicon.ico');
}

async function generateWithCanvas() {
  const { createCanvas } = await import('canvas');

  const drawIcon = (size) => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, size, size);

    const padding = size * 0.1;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - padding, 0, Math.PI * 2);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = size * 0.06;
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${size * 0.35}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T2', size / 2, size / 2);

    return canvas.toBuffer('image/png');
  };

  for (const size of sizes) {
    writeFileSync(join(outDir, `icon-${size}.png`), drawIcon(size));
    console.log(`Generated icon-${size}.png (canvas)`);
  }

  writeFileSync(join(root, 'public', 'apple-touch-icon.png'), drawIcon(192));
  writeFileSync(join(root, 'public', 'favicon.ico'), drawIcon(32));
  console.log('Generated apple-touch-icon.png and favicon.ico');
}

try {
  await generateWithCanvas();
} catch (err) {
  console.warn('canvas unavailable, using sharp fallback…', err?.message ?? err);
  await generateWithSharp();
}
