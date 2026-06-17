import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const appDir = 'dist/app';
const targets = ['chrome', 'edge', 'firefox'];
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));

await assertFile(join(appDir, 'index.html'));
await assertFile(join(appDir, 'assets/background.js'));

for (const target of targets) {
  const outDir = join('dist', target);
  await mkdir(outDir, { recursive: true });
  await cp(appDir, outDir, { recursive: true, force: true });
  await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(createManifest(target), null, 2)}\n`);
}

function createManifest(target) {
  const manifest = {
    manifest_version: 3,
    name: '__MSG_extensionName__',
    short_name: '__MSG_extensionShortName__',
    version: packageJson.version,
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    homepage_url: 'https://github.com/VastBlast/ChromeAutoRefresh',
    icons: {
      16: 'icons/inactive/icon16.png',
      32: 'icons/inactive/icon32.png',
      48: 'icons/inactive/icon48.png',
      128: 'icons/inactive/icon128.png'
    },
    action: {
      default_title: '__MSG_actionTitle__',
      default_popup: 'index.html',
      default_icon: {
        16: 'icons/inactive/icon16.png',
        24: 'icons/inactive/icon24.png',
        32: 'icons/inactive/icon32.png'
      }
    },
    background: {
      service_worker: 'assets/background.js',
      type: 'module'
    },
    permissions: ['activeTab', 'scripting', 'storage', 'tabs'],
    host_permissions: ['http://*/*', 'https://*/*'],
    content_security_policy: {
      extension_pages: "default-src 'self'; script-src 'self'; object-src 'none'; img-src 'self' data:; style-src 'self'"
    }
  };

  if (target === 'firefox') {
    manifest.browser_specific_settings = {
      gecko: {
        id: 'custom-auto-refresh@example.local',
        strict_min_version: '126.0',
        data_collection_permissions: {
          required: ['none']
        }
      }
    };
    manifest.background = {
      scripts: ['assets/background.js'],
      type: 'module'
    };
  }

  return manifest;
}

async function assertFile(path) {
  const info = await stat(path).catch(() => undefined);
  if (!info?.isFile()) {
    throw new Error(`Missing build file: ${path}`);
  }
}
