import { mkdir, readFile, rm } from 'node:fs/promises';
import sharp from 'sharp';

const screenshotDir = 'assets/store/screenshots';
const promoDir = 'assets/store/promotional';
const screenshotSize = { width: 1280, height: 800 };
const FONT = "Inter, 'Segoe UI', system-ui, Arial, sans-serif";

// Clean slate + red/emerald palette, matched to the popup theme. No olive.
const palette = {
  bg: '#f6f7f9',
  bgDeep: '#eceef3',
  panel: '#ffffff',
  panelAlt: '#f3f4f7',
  line: '#e6e8ee',
  hairline: '#eef0f4',
  ink: '#222a37',
  muted: '#6b7480',
  faint: '#aab1bd',
  brand: '#e74c3c',
  brandSoft: '#fcebe9',
  go: '#1f9d5f',
  goSoft: '#e7f5ed',
  goInk: '#137a44',
  stop: '#e0493d',
  stopSoft: '#fce4e1',
  stopInk: '#bd3b30',
  badge: '#1a7f4b',
  traffic: ['#f0655a', '#f2b94a', '#5fc97e']
};

const icons = {
  active: await pngDataUri('assets/extension/icons/active/icon128.png'),
  inactive: await pngDataUri('assets/extension/icons/inactive/icon128.png')
};

const features = ['Per-tab control', 'Live countdown', 'No tracking'];

const screenshots = [
  {
    id: '01-precise-control',
    headline: ['Set the interval.', 'Start the tab.'],
    body: ['A compact popup for exact refresh', 'timing — without the clutter.'],
    active: false,
    interval: '5',
    unit: 'sec',
    remaining: '--',
    badge: ''
  },
  {
    id: '02-active-badge',
    headline: ['A live badge', 'on the toolbar.'],
    body: ['The icon turns active and counts down', 'while the refresh runs.'],
    active: true,
    interval: '15',
    unit: 'sec',
    remaining: '12s',
    badge: '12'
  },
  {
    id: '03-fast-refresh',
    headline: ['Fast refresh,', 'still simple.'],
    body: ['Use zero or sub-second intervals,', 'and stop instantly any time.'],
    active: true,
    interval: '0',
    unit: 'ms',
    remaining: '0s',
    badge: '0'
  },
  {
    id: '04-advanced-options',
    headline: ['Advanced options', 'full customization.'],
    body: ['Hard reload, a refresh cap, and an', 'auto-stop timer — all optional.'],
    active: false,
    interval: '5',
    unit: 'sec',
    remaining: '--',
    badge: '',
    advanced: { bypassCache: true, refreshImmediately: false, maxRefreshes: '50', stopAfter: '30' }
  }
];

await rm(screenshotDir, { recursive: true, force: true });
await rm(promoDir, { recursive: true, force: true });
await mkdir(screenshotDir, { recursive: true });
await mkdir(promoDir, { recursive: true });

for (const scenario of screenshots) {
  await writeImage(screenshotDir, scenario.id, renderScreenshot(scenario), screenshotSize);
}

await writeImage(promoDir, 'small-promo-tile', renderSmallPromo(), { width: 440, height: 280 });
await writeImage(promoDir, 'marquee-promo-tile', renderMarqueePromo(), { width: 1400, height: 560 });

async function writeImage(dir, id, markup, size) {
  const output = `${dir}/${id}.png`;
  await sharp(Buffer.from(markup)).png().toFile(output);
  await assertImageSize(output, size);
  console.log(`Created ${output}`);
}

// --- Screenshots ----------------------------------------------------------

function renderScreenshot(scenario) {
  const { width, height } = screenshotSize;
  const popup = scenario.advanced ? advancedPopupShot(scenario) : popupShot(scenario, { shadow: true });
  const frameHeight = scenario.advanced ? 600 : 500;
  return svg(screenshotSize, `
    ${defs()}
    ${pageBackground(width, height)}
    <g transform="translate(96 172)">
      ${brandLockup(0, 0, 0.92)}
      ${headline(scenario.headline, 0, 128, 54)}
      ${bodyText(scenario.body, 0, 250, 23)}
      ${chipRow(features, 0, 348)}
    </g>
    ${browserWindow(620, (height - frameHeight) / 2, 588, frameHeight, scenario, popup)}
  `);
}

function browserWindow(x, y, w, h, scenario, popup) {
  const inner = w - 28;
  return `<g transform="translate(${x} ${y})">
    <rect width="${w}" height="${h}" rx="22" fill="${palette.panel}" stroke="${palette.line}" filter="url(#cardShadow)"/>
    <path d="M0 22a22 22 0 0 1 22-22h${w - 44}a22 22 0 0 1 22 22v32H0z" fill="${palette.panelAlt}"/>
    <line x1="0" y1="54" x2="${w}" y2="54" stroke="${palette.line}"/>
    ${[0, 1, 2].map((i) => `<circle cx="${26 + i * 22}" cy="27" r="6" fill="${palette.traffic[i]}"/>`).join('')}
    <rect x="104" y="16" width="${w - 200}" height="24" rx="12" fill="${palette.panel}" stroke="${palette.line}"/>
    <circle cx="124" cy="28" r="4.5" fill="none" stroke="${palette.faint}" stroke-width="1.4"/>
    <g transform="translate(${w - 64} 9)">${toolbarIcon(scenario, 1)}</g>
    <g transform="translate(28 74)">${pageContent(inner)}</g>
    <g transform="translate(${w - 326 - 18} 66)">${popup}</g>
  </g>`;
}

function pageContent(w) {
  const card = (cx, fill) =>
    `<rect x="${cx}" y="150" width="150" height="96" rx="14" fill="${fill}"/>`;
  return `<g>
    <rect width="${Math.min(180, w)}" height="30" rx="9" fill="${palette.panelAlt}"/>
    <rect y="56" width="${Math.min(w, 300)}" height="13" rx="6.5" fill="${palette.hairline}"/>
    <rect y="84" width="${Math.min(w, 250)}" height="13" rx="6.5" fill="${palette.hairline}"/>
    <rect y="112" width="${Math.min(w, 200)}" height="13" rx="6.5" fill="${palette.hairline}"/>
    ${card(0, palette.panelAlt)}
    ${card(166, palette.hairline)}
  </g>`;
}

// --- Promotional tiles ----------------------------------------------------

function renderSmallPromo() {
  const size = { width: 440, height: 280 };
  const cx = size.width / 2;
  return svg(size, `
    ${defs()}
    <rect width="${size.width}" height="${size.height}" fill="url(#bg)"/>
    <image href="${icons.active}" x="${cx - 33}" y="66" width="66" height="66"/>
    <text x="${cx}" y="182" text-anchor="middle" fill="${palette.ink}" font-family="${FONT}" font-size="30" font-weight="800">Custom Auto Refresh</text>
    <text x="${cx}" y="212" text-anchor="middle" fill="${palette.muted}" font-family="${FONT}" font-size="15" font-weight="600">Precise refresh control for any tab.</text>
  `);
}

function renderMarqueePromo() {
  const size = { width: 1400, height: 560 };
  return svg(size, `
    ${defs()}
    ${pageBackground(size.width, size.height)}
    <g transform="translate(96 132)">
      ${brandLockup(0, 0, 1.18)}
      <text x="2" y="150" fill="${palette.ink}" font-family="${FONT}" font-size="40" font-weight="800">Refresh any tab, on your schedule.</text>
      <text x="2" y="196" fill="${palette.muted}" font-family="${FONT}" font-size="22" font-weight="550">Small popup. Clear toolbar badge. Fast per-tab refresh.</text>
      ${chipRow(features, 0, 250)}
    </g>
    <g transform="translate(902 96)">
      <rect x="0" y="0" width="404" height="368" rx="28" fill="${palette.brand}" opacity="0.06"/>
      <rect x="0" y="0" width="404" height="368" rx="28" fill="none" stroke="${palette.line}"/>
      <g transform="translate(280 30)">${toolbarIcon(screenshots[1], 1.15)}</g>
      <g transform="translate(39 92) scale(1.0)">${popupShot(screenshots[1], { shadow: true })}</g>
    </g>
  `);
}

// --- Shared building blocks ----------------------------------------------

function brandLockup(x, y, scale) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <image href="${icons.active}" x="0" y="0" width="40" height="40"/>
    <text x="52" y="28" fill="${palette.ink}" font-family="${FONT}" font-size="22" font-weight="800">Custom Auto Refresh</text>
  </g>`;
}

function chipRow(labels, x, y) {
  let offset = x;
  const chips = labels
    .map((label) => {
      const width = label.length * 8.4 + 42;
      const chip = `<g transform="translate(${offset} ${y})">
        <rect width="${width}" height="38" rx="19" fill="${palette.panel}" stroke="${palette.line}"/>
        <circle cx="20" cy="19" r="3.4" fill="${palette.go}"/>
        <text x="34" y="24" fill="${palette.ink}" font-family="${FONT}" font-size="14" font-weight="650">${escapeXml(label)}</text>
      </g>`;
      offset += width + 14;
      return chip;
    })
    .join('');
  return `<g>${chips}</g>`;
}

function toolbarIcon(scenario, scale) {
  const badge = scenario.badge
    ? `<g transform="translate(24 -7)">
        <rect width="34" height="22" rx="11" fill="${palette.badge}"/>
        <text x="17" y="16" text-anchor="middle" fill="#fff" font-family="${FONT}" font-size="13" font-weight="800">${escapeXml(scenario.badge)}</text>
      </g>`
    : '';
  return `<g transform="scale(${scale})">
    <image href="${scenario.active ? icons.active : icons.inactive}" x="0" y="0" width="38" height="38"/>
    ${badge}
  </g>`;
}

function popupShot(scenario, options = {}) {
  const filter = options.shadow ? ' filter="url(#cardShadow)"' : '';
  return `<g${filter}>
    <rect width="326" height="222" rx="16" fill="${palette.panel}" stroke="${palette.line}"/>
    <g transform="translate(14 16)">
      ${popupHeader(scenario)}
      ${intervalRow(scenario)}
      ${actionButtons(scenario.active, 118)}
      ${footerPill(scenario, 170)}
    </g>
  </g>`;
}

// Expanded popup with the Advanced panel open, for the advanced-options shot.
function advancedPopupShot(scenario) {
  return `<g filter="url(#cardShadow)">
    <rect width="326" height="466" rx="16" fill="${palette.panel}" stroke="${palette.line}"/>
    <g transform="translate(14 16)">
      ${popupHeader(scenario)}
      ${intervalRow(scenario)}
      ${advancedToggle(120)}
      ${advancedPanel(scenario.advanced, 150)}
      ${actionButtons(scenario.active, 360)}
      ${footerPill(scenario, 412)}
    </g>
  </g>`;
}

function popupHeader(scenario) {
  const active = scenario.active;
  const status = active
    ? { label: 'Refreshing', dot: palette.go, text: palette.goInk, fill: palette.goSoft }
    : { label: 'Idle', dot: palette.faint, text: palette.muted, fill: palette.panelAlt };
  return `<image href="${active ? icons.active : icons.inactive}" x="0" y="-2" width="32" height="32"/>
    <text x="42" y="11" fill="${palette.ink}" font-family="${FONT}" font-size="14" font-weight="800">Custom Auto Refresh</text>
    <g transform="translate(42 18)">
      <rect width="${status.label.length * 6 + 26}" height="16" rx="8" fill="${status.fill}"/>
      <circle cx="10" cy="8" r="2.6" fill="${status.dot}"/>
      <text x="18" y="11.5" fill="${status.text}" font-family="${FONT}" font-size="9.5" font-weight="700">${status.label}</text>
    </g>
    <g transform="translate(232 0)">
      ${githubMark(0, 0, 13, palette.muted)}
      <text x="18" y="11" fill="${palette.muted}" font-family="${FONT}" font-size="11" font-weight="650">Source</text>
    </g>`;
}

function intervalRow(scenario) {
  return `<text x="0" y="58" fill="${palette.muted}" font-family="${FONT}" font-size="11" font-weight="650">Interval</text>
    <rect x="0" y="66" width="298" height="40" rx="10" fill="${palette.panel}" stroke="${palette.line}"/>
    ${timerIcon(13, 80, 13, palette.faint)}
    <text x="34" y="91" fill="${palette.ink}" font-family="${FONT}" font-size="17" font-weight="800">${escapeXml(scenario.interval)}</text>
    <rect x="246" y="73" width="44" height="26" rx="7" fill="${palette.panelAlt}"/>
    <text x="268" y="90" text-anchor="middle" fill="${palette.muted}" font-family="${FONT}" font-size="11" font-weight="800">${escapeXml(scenario.unit.toUpperCase())}</text>`;
}

function actionButtons(active, y) {
  return `${button(0, y, active ? palette.panelAlt : palette.go, active ? palette.faint : '#ffffff', 'Start', 'play', !active)}
    ${button(153, y, active ? palette.stopSoft : palette.panelAlt, active ? palette.stopInk : palette.faint, 'Stop', 'stop', active)}`;
}

function footerPill(scenario, y) {
  const active = scenario.active;
  const label = active ? 'Next refresh' : 'Interval';
  const value = active ? scenario.remaining : durationLabel(scenario);
  return `<rect x="0" y="${y}" width="298" height="30" rx="9" fill="${palette.panelAlt}"/>
    <text x="12" y="${y + 19}" fill="${palette.muted}" font-family="${FONT}" font-size="11" font-weight="600">${label}</text>
    <text x="286" y="${y + 19}" text-anchor="end" fill="${palette.ink}" font-family="${FONT}" font-size="12" font-weight="800">${escapeXml(value)}</text>`;
}

function advancedToggle(y) {
  return `<g transform="translate(0 ${y})">
    ${slidersGlyph(0, 0, palette.muted)}
    <text x="22" y="11" fill="${palette.ink}" font-family="${FONT}" font-size="12" font-weight="700">Advanced</text>
    ${chevronGlyph(288, 4, palette.muted, true)}
  </g>`;
}

function advancedPanel(options, y) {
  return `<g transform="translate(0 ${y})">
    <rect x="0" y="0" width="298" height="198" rx="10" fill="${palette.panelAlt}" stroke="${palette.line}"/>
    ${optionLabel(14, 14, 'Hard reload', 'Bypass the cache on each refresh')}
    ${toggleGlyph(244, 18, options.bypassCache)}
    ${optionLabel(14, 50, 'Refresh immediately', 'Run the first refresh on start')}
    ${toggleGlyph(244, 54, options.refreshImmediately)}
    <line x1="14" y1="92" x2="284" y2="92" stroke="${palette.line}"/>
    ${optionLabel(14, 102, 'Maximum refreshes', 'Stop after this many')}
    ${valueField(284, 100, options.maxRefreshes, '')}
    ${optionLabel(14, 138, 'Time limit', 'Stop after this long')}
    ${valueField(284, 136, options.stopAfter, 'MIN')}
    ${resetControl(284, 178)}
  </g>`;
}

function optionLabel(x, y, label, sub) {
  return `<text x="${x}" y="${y + 11}" fill="${palette.ink}" font-family="${FONT}" font-size="11.5" font-weight="700">${label}</text>
    <text x="${x}" y="${y + 25}" fill="${palette.muted}" font-family="${FONT}" font-size="9" font-weight="500">${sub}</text>`;
}

function button(x, y, fill, fg, label, glyph, emphasised) {
  const cx = x + 72.5;
  const icon =
    glyph === 'play'
      ? playIcon(cx - 26, y + 13, 13, fg)
      : stopIcon(cx - 24, y + 14, 11, fg);
  return `<g${emphasised ? ' filter="url(#btnShadow)"' : ''}>
    <rect x="${x}" y="${y}" width="145" height="40" rx="10" fill="${fill}"/>
    ${icon}
    <text x="${cx + 6}" y="${y + 25}" text-anchor="middle" fill="${fg}" font-family="${FONT}" font-size="13" font-weight="750">${label}</text>
  </g>`;
}

// --- Glyphs ---------------------------------------------------------------

function githubMark(x, y, size, color) {
  const scale = size / 98;
  return `<path transform="translate(${x} ${y}) scale(${scale})" fill="${color}" fill-rule="evenodd" clip-rule="evenodd" d="M48.9 0C21.9 0 0 21.9 0 48.9c0 21.6 14 39.9 33.4 46.4 2.4.4 3.3-1.1 3.3-2.4v-8.4c-13.6 3-16.5-6.6-16.5-6.6-2.2-5.7-5.4-7.2-5.4-7.2-4.4-3 .3-2.9.3-2.9 4.9.3 7.5 5 7.5 5 4.4 7.5 11.5 5.3 14.3 4.1.4-3.2 1.7-5.3 3.1-6.6-10.9-1.2-22.3-5.4-22.3-24.2 0-5.3 1.9-9.7 5-13.1-.5-1.2-2.2-6.2.5-12.9 0 0 4.1-1.3 13.4 5 3.9-1.1 8-1.6 12.2-1.6s8.3.5 12.2 1.6c9.3-6.3 13.4-5 13.4-5 2.7 6.7 1 11.7.5 12.9 3.1 3.4 5 7.8 5 13.1 0 18.8-11.4 23-22.3 24.2 1.8 1.5 3.4 4.5 3.4 9.1v13.5c0 1.3.9 2.8 3.4 2.4 19.4-6.5 33.4-24.8 33.4-46.4C97.8 21.9 75.9 0 48.9 0Z"/>`;
}

function timerIcon(x, y, size, color) {
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="${size / 2}" cy="${size / 2 + 1}" r="${size / 2 - 2}"/>
    <path d="M${size / 2} ${size / 2 + 1}v-${size / 4}"/>
    <path d="M${size / 2 - 2} 0h4"/>
  </g>`;
}

function playIcon(x, y, size, color) {
  return `<path d="M${x} ${y}v${size}l${Math.round(size * 0.86)}-${size / 2}Z" fill="${color}"/>`;
}

function stopIcon(x, y, size, color) {
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="2.5" fill="${color}"/>`;
}

function slidersGlyph(x, y, color) {
  return `<g transform="translate(${x} ${y})" stroke="${color}" stroke-width="1.5" stroke-linecap="round">
    <line x1="0" y1="3" x2="14" y2="3"/>
    <line x1="0" y1="11" x2="14" y2="11"/>
    <circle cx="5" cy="3" r="2.3" fill="${palette.panelAlt}"/>
    <circle cx="10" cy="11" r="2.3" fill="${palette.panelAlt}"/>
  </g>`;
}

function chevronGlyph(x, y, color, up) {
  const d = up ? 'M0 5 5 0 10 5' : 'M0 0 5 5 10 0';
  return `<path transform="translate(${x} ${y})" d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function toggleGlyph(x, y, on) {
  return `<rect x="${x}" y="${y}" width="30" height="16" rx="8" fill="${on ? palette.go : '#d2d6dd'}"/>
    <circle cx="${on ? x + 22 : x + 8}" cy="${y + 8}" r="5.5" fill="#ffffff"/>`;
}

function valueField(rightX, y, value, suffix) {
  const boxW = 56;
  const boxX = rightX - (suffix ? 26 : 0) - boxW;
  return `<rect x="${boxX}" y="${y}" width="${boxW}" height="26" rx="7" fill="${palette.panel}" stroke="${palette.line}"/>
    <text x="${boxX + boxW - 10}" y="${y + 17}" text-anchor="end" fill="${palette.ink}" font-family="${FONT}" font-size="12" font-weight="800">${escapeXml(value)}</text>
    ${suffix ? `<text x="${rightX}" y="${y + 17}" text-anchor="end" fill="${palette.faint}" font-family="${FONT}" font-size="9" font-weight="800">${suffix}</text>` : ''}`;
}

function resetControl(rightX, y) {
  return `<g transform="translate(${rightX - 44} ${y})" fill="none" stroke="${palette.muted}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1.5 4.2A4 4 0 1 1 1.1 6.6"/>
      <path d="M1.5 1.4V4.2H4.3"/>
    </g>
    <text x="${rightX}" y="${y + 9}" text-anchor="end" fill="${palette.muted}" font-family="${FONT}" font-size="11" font-weight="600">Reset</text>`;
}

// --- Layout primitives ----------------------------------------------------

function headline(lines, x, y, size) {
  return text(lines, x, y, size, palette.ink, 820, Math.round(size * 1.12));
}

function bodyText(lines, x, y, size) {
  return text(lines, x, y, size, palette.muted, 550, Math.round(size * 1.42));
}

function text(lines, x, y, size, fill, weight, leading) {
  const spans = lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : leading}">${escapeXml(line)}</tspan>`)
    .join('');
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${FONT}" font-size="${size}" font-weight="${weight}">${spans}</text>`;
}

function pageBackground(width, height) {
  return `<rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glowBrand)"/>`;
}

function defs() {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="${palette.bg}"/>
      <stop offset="1" stop-color="${palette.bgDeep}"/>
    </linearGradient>
    <radialGradient id="glowBrand" cx="0.9" cy="0.08" r="0.85">
      <stop offset="0" stop-color="${palette.brand}" stop-opacity="0.1"/>
      <stop offset="0.55" stop-color="${palette.brand}" stop-opacity="0"/>
    </radialGradient>
    <filter id="cardShadow" x="-25%" y="-25%" width="150%" height="160%">
      <feDropShadow dx="0" dy="16" stdDeviation="22" flood-color="#1c2533" flood-opacity="0.13"/>
    </filter>
    <filter id="btnShadow" x="-40%" y="-40%" width="180%" height="220%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#1c2533" flood-opacity="0.2"/>
    </filter>
  </defs>`;
}

// --- Helpers --------------------------------------------------------------

function durationLabel(scenario) {
  const value = Number(scenario.interval);
  const seconds =
    scenario.unit === 'ms' ? value / 1000 : scenario.unit === 'min' ? value * 60 : scenario.unit === 'hr' ? value * 3600 : value;
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

function svg(size, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">${content}</svg>`;
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
