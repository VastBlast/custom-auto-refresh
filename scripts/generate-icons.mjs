import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { buildIconSvg } from '../src/lib/icon.ts';

const sizes = [16, 24, 32, 48, 128];
const extensionDir = 'assets/extension/icons';
const storeDir = 'assets/store/icons';
const brandFile = 'assets/brand/icon.svg';

await mkdir(`${extensionDir}/active`, { recursive: true });
await mkdir(`${extensionDir}/inactive`, { recursive: true });
await mkdir(storeDir, { recursive: true });

for (const state of ['active', 'inactive']) {
  const svg = Buffer.from(buildIconSvg(state));
  for (const size of sizes) {
    await sharp(svg).resize(size, size).png().toFile(`${extensionDir}/${state}/icon${size}.png`);
  }
}

const activeSvg = Buffer.from(buildIconSvg('active'));
await sharp(activeSvg).resize(128, 128).png().toFile(`${storeDir}/store-icon128.png`);
await sharp(activeSvg).resize(300, 300).png().toFile(`${storeDir}/store-icon300.png`);
await writeFile(brandFile, `${buildIconSvg('active')}\n`);

console.log(`Generated ${sizes.length * 2} extension icons, 2 store icons, and ${brandFile}`);
