import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { zipSync } from 'fflate';

const allTargets = ['chrome', 'edge', 'firefox'];
const selectedTargets = process.argv.slice(2);
const targets = selectedTargets.length ? selectedTargets : allTargets;
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const tagName = process.env.TAG_NAME ?? `v${packageJson.version}`;
const outputDir = process.env.ARTIFACT_DIR ?? 'artifacts';

await mkdir(outputDir, { recursive: true });

for (const target of targets) {
  if (!allTargets.includes(target)) {
    throw new Error(`Unknown extension target: ${target}`);
  }

  const outputFile = join(outputDir, `custom-auto-refresh-${target}-${tagName}.zip`);
  await createZip(join('dist', target), outputFile);
  console.log(`Created ${outputFile}`);
}

async function createZip(sourceDir, outputFile) {
  const files = (await listFiles(sourceDir))
    .map((file) => ({
      path: file,
      name: relative(sourceDir, file).replaceAll('\\', '/')
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const entries = {};

  for (const file of files) {
    entries[file.name] = await readFile(file.path);
  }

  await writeFile(outputFile, zipSync(entries, { level: 6 }));
}

async function listFiles(dir) {
  const entries = await readdir(dir);
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else {
      files.push(path);
    }
  }

  return files;
}
