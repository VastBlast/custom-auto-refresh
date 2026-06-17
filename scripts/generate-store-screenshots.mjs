import { mkdir, readFile, rm } from 'node:fs/promises';
import sharp from 'sharp';

const screenshotDir = 'assets/store/screenshots';
const promoDir = 'assets/store/promotional';
const screenshotSize = { width: 1280, height: 800 };

const palette = {
  paper: '#f7f8f2',
  paperAlt: '#edf2ea',
  surface: '#ffffff',
  ink: '#17211c',
  muted: '#5b6861',
  faint: '#dbe4da',
  green: '#187246',
  greenDark: '#0f3f2e',
  greenSoft: '#dcefe2',
  amber: '#c47537',
  amberSoft: '#f1dfca',
  red: '#bd4b42',
  redSoft: '#f1d7d2',
  blue: '#456179'
};

const icons = {
  active: await pngDataUri('assets/extension/icons/active/icon128.png'),
  inactive: await pngDataUri('assets/extension/icons/inactive/icon128.png')
};

const screenshots = [
  {
    id: '01-precise-control',
    headline: ['Set the interval.', 'Start the tab.'],
    body: ['A compact popup for exact refresh timing', 'without page clutter.'],
    active: false,
    interval: '5',
    remaining: '--',
    badge: '',
    pageTitle: 'Documentation preview',
    stat: '5 sec'
  },
  {
    id: '02-active-badge',
    headline: ['Active icon.', 'Live badge.'],
    body: ['The toolbar changes color and counts down', 'while refresh is running.'],
    active: true,
    interval: '15',
    remaining: '12s',
    badge: '12',
    pageTitle: 'Development preview',
    stat: '12s'
  },
  {
    id: '03-fast-refresh',
    headline: ['Fast refresh', 'stays simple.'],
    body: ['Use zero or short intervals, stop instantly,', 'and keep each tab separate.'],
    active: true,
    interval: '0',
    remaining: '0s',
    badge: '0',
    pageTitle: 'Live dashboard',
    stat: '0s'
  }
];

await rm(screenshotDir, { recursive: true, force: true });
await rm(promoDir, { recursive: true, force: true });
await mkdir(screenshotDir, { recursive: true });
await mkdir(promoDir, { recursive: true });

for (const screenshot of screenshots) {
  const output = `${screenshotDir}/${screenshot.id}.png`;
  await sharp(Buffer.from(renderScreenshot(screenshot))).png().toFile(output);
  await assertImageSize(output, screenshotSize);
  console.log(`Created ${output}`);
}

await writeImage('small-promo-tile', renderSmallPromo(), { width: 440, height: 280 });
await writeImage('marquee-promo-tile', renderMarqueePromo(), { width: 1400, height: 560 });

async function writeImage(id, svg, size) {
  const output = `${promoDir}/${id}.png`;
  await sharp(Buffer.from(svg)).png().toFile(output);
  await assertImageSize(output, size);
  console.log(`Created ${output}`);
}

function renderScreenshot(scenario) {
  return svg(screenshotSize, `
    ${backgroundBands(screenshotSize.width, screenshotSize.height)}
    <g transform="translate(72 104)">
      ${headline(scenario.headline, 0, 0, 58)}
      ${bodyText(scenario.body, 0, 178, 25)}
      <g transform="translate(0 310)">
        ${metricCard('Interval', scenario.interval === '0' ? '0 sec' : scenario.stat, 0)}
        ${metricCard('Badge', scenario.badge || 'Idle', 166)}
        ${metricCard('Mode', scenario.active ? 'Active' : 'Ready', 332)}
      </g>
    </g>
    <g transform="translate(612 92)">
      ${browserFrame(scenario)}
    </g>
  `);
}

function renderSmallPromo() {
  const scenario = screenshots[1];
  return svg({ width: 440, height: 280 }, `
    <rect width="440" height="280" fill="${palette.greenDark}"/>
    <path d="M0 196h440v84H0z" fill="${palette.green}"/>
    <path d="M0 230h440v50H0z" fill="${palette.amber}" opacity="0.2"/>
    <image href="${icons.active}" x="32" y="38" width="72" height="72"/>
    <text x="124" y="62" fill="#fff" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="850">Custom</text>
    <text x="124" y="101" fill="#fff" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="850">Auto Refresh</text>
    <text x="34" y="150" fill="#d6e3dc" font-family="Inter,Arial,sans-serif" font-size="16" font-weight="650">Precise tab refresh controls.</text>
    <g transform="translate(274 126) scale(0.42)">
      ${popupShot(scenario, { shadow: false })}
    </g>
  `);
}

function renderMarqueePromo() {
  const scenario = screenshots[1];
  return svg({ width: 1400, height: 560 }, `
    <rect width="1400" height="560" fill="${palette.paper}"/>
    <path d="M0 0h1400v560H0z" fill="${palette.paper}"/>
    <path d="M840 0h560v560H690z" fill="${palette.greenDark}"/>
    <path d="M802 0h64l-188 560h-64z" fill="${palette.amber}" opacity="0.32"/>
    <g transform="translate(80 108)">
      <image href="${icons.active}" x="0" y="0" width="86" height="86"/>
      <text x="0" y="146" fill="${palette.ink}" font-family="Inter,Arial,sans-serif" font-size="64" font-weight="880">Custom Auto Refresh</text>
      <text x="2" y="196" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="650">Small popup. Clear badge. Fast per-tab refresh.</text>
      <g transform="translate(2 250)">
        ${featurePill('No tracking', 0, true)}
        ${featurePill('Active icon', 154, true)}
        ${featurePill('Zero interval', 322, true)}
      </g>
    </g>
    <g transform="translate(878 88)">
      <rect x="0" y="0" width="414" height="384" rx="34" fill="#ffffff" opacity="0.13"/>
      <g transform="translate(38 44) scale(1.08)">
        ${popupShot(scenario, { shadow: true })}
      </g>
      <g transform="translate(252 12)">
        ${toolbarIcon(scenario, 1.2)}
      </g>
    </g>
  `);
}

function browserFrame(scenario) {
  return `<g>
    <rect x="0" y="0" width="560" height="520" rx="30" fill="${palette.surface}" filter="url(#shadow)"/>
    <rect x="0" y="0" width="560" height="72" rx="30" fill="${palette.paperAlt}"/>
    <rect x="0" y="42" width="560" height="30" fill="${palette.paperAlt}"/>
    <circle cx="34" cy="35" r="8" fill="#df6051"/>
    <circle cx="62" cy="35" r="8" fill="#d8a846"/>
    <circle cx="90" cy="35" r="8" fill="#4d9a67"/>
    <rect x="132" y="21" width="214" height="28" rx="14" fill="${palette.surface}"/>
    <text x="152" y="39" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="700">${escapeXml(scenario.pageTitle)}</text>
    <g transform="translate(448 18)">
      ${toolbarIcon(scenario, 1)}
    </g>
    <g transform="translate(42 112)">
      ${pagePreview(scenario)}
    </g>
    <g transform="translate(206 222)">
      ${popupShot(scenario, { shadow: true })}
    </g>
  </g>`;
}

function pagePreview(scenario) {
  return `<g opacity="0.95">
    <rect width="210" height="34" rx="9" fill="${palette.paperAlt}"/>
    <rect y="52" width="300" height="16" rx="8" fill="${palette.faint}"/>
    <rect y="82" width="250" height="16" rx="8" fill="${palette.faint}"/>
    <rect y="132" width="136" height="70" rx="16" fill="${scenario.active ? palette.greenSoft : palette.paperAlt}"/>
    <rect x="154" y="132" width="136" height="70" rx="16" fill="${palette.amberSoft}"/>
    <text x="20" y="174" fill="${palette.greenDark}" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="850">${escapeXml(scenario.stat)}</text>
    <text x="174" y="174" fill="#70431f" font-family="Inter,Arial,sans-serif" font-size="22" font-weight="850">Local</text>
  </g>`;
}

function popupShot(scenario, options = {}) {
  const active = scenario.active;
  const status = active ? 'Refreshing' : 'Idle';
  const statusColor = active ? palette.green : palette.muted;
  const startOpacity = active ? '0.45' : '1';
  const stopOpacity = active ? '1' : '0.45';
  const footerLabel = active ? 'Next refresh' : 'Interval';
  const footerValue = active ? scenario.remaining : `${scenario.interval} sec`;
  const filter = options.shadow ? ' filter="url(#shadow)"' : '';

  return `<g${filter}>
    <rect width="312" height="198" rx="18" fill="#fbfcf8" stroke="${palette.faint}"/>
    <g transform="translate(12 12)">
      <image href="${active ? icons.active : icons.inactive}" x="0" y="0" width="32" height="32"/>
      <text x="42" y="13" fill="${palette.ink}" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="850">Custom Auto Refresh</text>
      <rect x="42" y="20" width="${active ? 78 : 45}" height="18" rx="9" fill="${active ? palette.greenSoft : '#e7ece6'}"/>
      <circle cx="52" cy="29" r="3" fill="${statusColor}"/>
      <text x="60" y="33" fill="${statusColor}" font-family="Inter,Arial,sans-serif" font-size="10" font-weight="850">${status}</text>
      <rect x="226" y="0" width="62" height="30" rx="9" fill="${palette.paperAlt}"/>
      <text x="257" y="19" text-anchor="middle" fill="${palette.ink}" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="850">Source</text>
      <text x="0" y="64" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="750">Interval</text>
      <rect x="0" y="72" width="288" height="34" rx="9" fill="${palette.surface}" stroke="${palette.faint}"/>
      <text x="16" y="95" fill="${palette.ink}" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="860">${escapeXml(scenario.interval)}</text>
      <text x="252" y="93" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="800">sec</text>
      <rect x="0" y="118" width="140" height="34" rx="9" fill="${palette.green}" opacity="${startOpacity}"/>
      <text x="70" y="140" text-anchor="middle" fill="#ffffff" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="850">Start</text>
      <rect x="148" y="118" width="140" height="34" rx="9" fill="${palette.red}" opacity="${stopOpacity}"/>
      <text x="218" y="140" text-anchor="middle" fill="#ffffff" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="850">Stop</text>
      <rect x="0" y="164" width="288" height="24" rx="8" fill="${palette.paperAlt}"/>
      <text x="12" y="180" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="750">${footerLabel}</text>
      <text x="276" y="180" text-anchor="end" fill="${palette.ink}" font-family="Inter,Arial,sans-serif" font-size="12" font-weight="860">${escapeXml(footerValue)}</text>
    </g>
  </g>`;
}

function toolbarIcon(scenario, scale = 1) {
  const badge = scenario.badge
    ? `<g transform="translate(25 -8)">
        <rect width="35" height="25" rx="12.5" fill="${palette.green}"/>
        <text x="17.5" y="18" text-anchor="middle" fill="#fff" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="850">${escapeXml(scenario.badge)}</text>
      </g>`
    : '';
  return `<g transform="scale(${scale})">
    <image href="${scenario.active ? icons.active : icons.inactive}" x="0" y="0" width="38" height="38"/>
    ${badge}
  </g>`;
}

function metricCard(label, value, x) {
  return `<g transform="translate(${x} 0)">
    <rect width="140" height="74" rx="18" fill="${palette.surface}" stroke="${palette.faint}"/>
    <text x="18" y="28" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="750">${escapeXml(label)}</text>
    <text x="18" y="56" fill="${palette.ink}" font-family="Inter,Arial,sans-serif" font-size="23" font-weight="870">${escapeXml(value)}</text>
  </g>`;
}

function featurePill(text, x, dark = false) {
  const fill = dark ? '#ffffff' : palette.surface;
  const stroke = dark ? 'none' : palette.faint;
  return `<g transform="translate(${x} 0)">
    <rect width="${text.length * 11 + 34}" height="38" rx="19" fill="${fill}" stroke="${stroke}" opacity="${dark ? '0.96' : '1'}"/>
    <text x="17" y="25" fill="${palette.ink}" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="820">${escapeXml(text)}</text>
  </g>`;
}

function headline(lines, x, y, size) {
  return `<text x="${x}" y="${y}" fill="${palette.ink}" font-family="Inter,Arial,sans-serif" font-size="${size}" font-weight="880">
    ${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : Math.round(size * 1.08)}">${escapeXml(line)}</tspan>`).join('')}
  </text>`;
}

function bodyText(lines, x, y, size) {
  return `<text x="${x}" y="${y}" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="${size}" font-weight="650">
    ${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : Math.round(size * 1.38)}">${escapeXml(line)}</tspan>`).join('')}
  </text>`;
}

function backgroundBands(width, height) {
  return `<defs>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#243029" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="${palette.paper}"/>
  <path d="M766 0h514v800H626z" fill="${palette.greenDark}"/>
  <path d="M724 0h58L602 800h-58z" fill="${palette.amber}" opacity="0.28"/>
  <path d="M666 0h32L518 800h-32z" fill="${palette.paperAlt}" opacity="0.9"/>`;
}

function svg(size, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
  ${content}
</svg>`;
}

async function pngDataUri(path) {
  return `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
}

async function assertImageSize(file, expected) {
  const metadata = await sharp(file).metadata();
  if (metadata.width !== expected.width || metadata.height !== expected.height) {
    throw new Error(`${file} is ${metadata.width}x${metadata.height}; expected ${expected.width}x${expected.height}`);
  }
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
