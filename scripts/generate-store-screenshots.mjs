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
    unit: 'sec',
    remaining: '--',
    badge: '',
    stat: '5s'
  },
  {
    id: '02-active-badge',
    headline: ['Active icon.', 'Live badge.'],
    body: ['The toolbar changes color and counts down', 'while refresh is running.'],
    active: true,
    interval: '15',
    unit: 'sec',
    remaining: '12s',
    badge: '12',
    stat: '12s'
  },
  {
    id: '03-fast-refresh',
    headline: ['Fast refresh', 'stays simple.'],
    body: ['Use zero or short intervals, stop instantly,', 'and keep each tab separate.'],
    active: true,
    interval: '0',
    unit: 'ms',
    remaining: '0s',
    badge: '0',
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
        ${metricCard('Interval', intervalMetric(scenario), 0)}
        ${metricCard('Badge', scenario.badge || 'Idle', 166)}
        ${metricCard('Mode', scenario.active ? 'Active' : 'Ready', 332)}
      </g>
    </g>
    <g transform="translate(612 92)">
      ${browserFrame(scenario)}
    </g>
  `);
}

function intervalMetric(scenario) {
  return durationLabel(scenario);
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
  const footerLabel = active ? 'Next refresh' : 'Interval';
  const unit = scenario.unit ?? 'sec';
  const unitLabel = unit.toUpperCase();
  const footerValue = active ? scenario.remaining : durationLabel(scenario);
  const filter = options.shadow ? ' filter="url(#shadow)"' : '';

  return `<g${filter}>
    <rect width="326" height="202" rx="18" fill="#fbfcf8" stroke="${palette.faint}"/>
    <g transform="translate(14 14)">
      <image href="${active ? icons.active : icons.inactive}" x="0" y="0" width="32" height="32"/>
      <text x="42" y="13" fill="${palette.ink}" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="850">Custom Auto Refresh</text>
      <rect x="42" y="20" width="${active ? 70 : 34}" height="15" rx="7.5" fill="${active ? palette.greenSoft : '#e7ece6'}"/>
      <text x="${active ? 77 : 59}" y="31" text-anchor="middle" fill="${statusColor}" font-family="Inter,Arial,sans-serif" font-size="9.5" font-weight="820">${status}</text>
      <g transform="translate(204 2)">
        ${githubMark(0, 0, 14, palette.ink)}
        <text x="20" y="12" fill="${palette.ink}" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="850">Source Co...</text>
      </g>
      <text x="0" y="66" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="750">Interval</text>
      <rect x="0" y="74" width="298" height="40" rx="8" fill="${palette.surface}" stroke="${palette.faint}"/>
      ${timerIcon(14, 90, 12, palette.muted)}
      <text x="32" y="99" fill="${palette.ink}" font-family="Inter,Arial,sans-serif" font-size="17" font-weight="860">${escapeXml(scenario.interval)}</text>
      <text x="280" y="99" text-anchor="end" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="900">${unitLabel}</text>
      <rect x="0" y="126" width="145" height="40" rx="8" fill="${active ? '#dfe4dc' : palette.green}"/>
      ${playIcon(52, 139, 13, active ? '#a8b3aa' : '#ffffff')}
      <text x="82" y="151" text-anchor="middle" fill="${active ? '#a8b3aa' : '#ffffff'}" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="850">Start</text>
      <rect x="153" y="126" width="145" height="40" rx="8" fill="${active ? palette.redSoft : '#dfe4dc'}"/>
      ${stopIcon(202, 140, 11, active ? palette.red : '#a8b3aa')}
      <text x="235" y="151" text-anchor="middle" fill="${active ? palette.red : '#a8b3aa'}" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="850">Stop</text>
      <rect x="0" y="176" width="298" height="28" rx="8" fill="${palette.paperAlt}"/>
      <text x="12" y="194" fill="${palette.muted}" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="750">${footerLabel}</text>
      <text x="286" y="194" text-anchor="end" fill="${palette.ink}" font-family="Inter,Arial,sans-serif" font-size="12" font-weight="860">${escapeXml(footerValue)}</text>
    </g>
  </g>`;
}

function githubMark(x, y, size, color) {
  const scale = size / 98;
  return `<path transform="translate(${x} ${y}) scale(${scale})" fill="${color}" fill-rule="evenodd" clip-rule="evenodd" d="M48.9 0C21.9 0 0 21.9 0 48.9c0 21.6 14 39.9 33.4 46.4 2.4.4 3.3-1.1 3.3-2.4v-8.4c-13.6 3-16.5-6.6-16.5-6.6-2.2-5.7-5.4-7.2-5.4-7.2-4.4-3 .3-2.9.3-2.9 4.9.3 7.5 5 7.5 5 4.4 7.5 11.5 5.3 14.3 4.1.4-3.2 1.7-5.3 3.1-6.6-10.9-1.2-22.3-5.4-22.3-24.2 0-5.3 1.9-9.7 5-13.1-.5-1.2-2.2-6.2.5-12.9 0 0 4.1-1.3 13.4 5 3.9-1.1 8-1.6 12.2-1.6s8.3.5 12.2 1.6c9.3-6.3 13.4-5 13.4-5 2.7 6.7 1 11.7.5 12.9 3.1 3.4 5 7.8 5 13.1 0 18.8-11.4 23-22.3 24.2 1.8 1.5 3.4 4.5 3.4 9.1v13.5c0 1.3.9 2.8 3.4 2.4 19.4-6.5 33.4-24.8 33.4-46.4C97.8 21.9 75.9 0 48.9 0Z"/>`;
}

function timerIcon(x, y, size, color) {
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="${size / 2}" cy="${size / 2 + 1}" r="${size / 2 - 2}"/>
    <path d="M${size / 2} ${size / 2 + 1}v-${size / 4}"/>
    <path d="M${size / 2} ${size / 2 + 1}l${size / 5}-${size / 7}"/>
    <path d="M${size / 2 - 2} 0h4"/>
  </g>`;
}

function playIcon(x, y, size, color) {
  return `<path d="M${x} ${y}v${size}l${Math.round(size * 0.82)}-${size / 2}Z" fill="${color}"/>`;
}

function stopIcon(x, y, size, color) {
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="2" fill="${color}"/>`;
}

function durationLabel(scenario) {
  const value = Number(scenario.interval);
  const unit = scenario.unit ?? 'sec';
  const seconds = unit === 'ms' ? value / 1000 : unit === 'min' ? value * 60 : unit === 'hr' ? value * 3600 : value;
  return formatDurationMs(seconds * 1000);
}

function formatDurationMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0s';
  }
  if (ms < 100) {
    return `${Math.max(1, Math.round(ms))}ms`;
  }
  if (ms < 1000) {
    return `${formatDecimal(ms / 1000, 1)}s`;
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatDecimal(value, digits) {
  return value.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
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
