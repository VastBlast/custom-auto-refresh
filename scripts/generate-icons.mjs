import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const sizes = [16, 24, 32, 48, 128];
const extensionDir = 'assets/extension/icons';
const storeDir = 'assets/store/icons';

await mkdir(`${extensionDir}/active`, { recursive: true });
await mkdir(`${extensionDir}/inactive`, { recursive: true });
await mkdir(storeDir, { recursive: true });

for (const state of ['active', 'inactive']) {
  for (const size of sizes) {
    await sharp(Buffer.from(iconSvg(state)))
      .resize(size, size)
      .png()
      .toFile(`${extensionDir}/${state}/icon${size}.png`);
  }
}

await sharp(Buffer.from(iconSvg('active'))).resize(128, 128).png().toFile(`${storeDir}/store-icon128.png`);
await sharp(Buffer.from(iconSvg('active'))).resize(300, 300).png().toFile(`${storeDir}/store-icon300.png`);

console.log(`Generated ${sizes.length * 2} extension icons and 2 store icons`);

function iconSvg(state) {
  const active = state === 'active';
  const start = active ? '#0f766e' : '#25312b';
  const end = active ? '#22a95d' : '#50605a';
  const panel = active ? '#f6fff9' : '#eef3f0';
  const accent = active ? '#0f8f54' : '#7a8a83';
  const arrow = active ? '#10392e' : '#26342f';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="94" y1="56" x2="420" y2="458" gradientUnits="userSpaceOnUse">
      <stop stop-color="${start}"/>
      <stop offset="1" stop-color="${end}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <path d="M132 118h248c26 0 47 21 47 47v207c0 26-21 47-47 47H132c-26 0-47-21-47-47V165c0-26 21-47 47-47Z" fill="${panel}" opacity=".97"/>
  <path d="M85 195h342" stroke="${accent}" stroke-width="26" stroke-linecap="round" opacity=".34"/>
  <circle cx="142" cy="156" r="15" fill="${accent}" opacity=".9"/>
  <circle cx="190" cy="156" r="15" fill="${accent}" opacity=".55"/>
  <path d="M325 225h67v-67" fill="none" stroke="${arrow}" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M337 184a104 104 0 1 0 27 108" fill="none" stroke="${arrow}" stroke-width="42" stroke-linecap="round"/>
  <path d="M252 237v63l48 30" fill="none" stroke="${accent}" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}
