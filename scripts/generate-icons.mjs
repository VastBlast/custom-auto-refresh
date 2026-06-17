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
  const background = active ? '#e74c3c' : '#344e5d';
  const arrow = '#ffffff';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="16" fill="${background}"/>
  <g transform="translate(4 4)" fill="none" stroke="${arrow}" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
    <path d="M16 16h5v5"/>
  </g>
</svg>`;
}
