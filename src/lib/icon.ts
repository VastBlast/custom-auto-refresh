// Single source of truth for the toolbar / brand refresh mark.
// Consumed by the extension runtime (background.ts, via Path2D) and by the
// build scripts (generate-icons.mjs, generate-store-screenshots.mjs) so the
// icon stays identical everywhere. Geometry is authored directly in the
// 32x32 viewBox used by every icon size.
//
// Two horizontal arrows — one arcing over the top, one under the bottom —
// each ending in a bold solid arrowhead that leads the rotation toward the
// other arrow. Gaps sit on the left/right so the pair reads clearly as two
// arrows, never a solid ring.

export type IconState = 'active' | 'inactive';

export const ICON_BACKGROUND: Record<IconState, string> = {
  active: '#e74c3c',
  inactive: '#344e5d'
};
export const ICON_ARROW = '#ffffff';
export const ICON_STROKE_WIDTH = 3;
export const ICON_VIEWBOX = 32;

const CENTER = 16;
const RADIUS = 9.8; // arrows sit close to the circle edge
const GAP_DEGREES = 46; // open space on the left and right
const HEAD_LENGTH = 4.7; // apex reach beyond the arc tip
const HEAD_HALF_WIDTH = 3.9; // half the arrowhead base width

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// Clock angle in degrees (0 = top, increasing clockwise) -> point on the ring.
function polar(angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [round(CENTER + RADIUS * Math.sin(rad)), round(CENTER - RADIUS * Math.cos(rad))];
}

// Arc swept counterclockwise (decreasing angle) from `from` to `to`.
function arcPath(from: number, to: number): string {
  const [sx, sy] = polar(from);
  const [ex, ey] = polar(to);
  const largeArc = Math.abs(from - to) > 180 ? 1 : 0;
  return `M${sx} ${sy}A${RADIUS} ${RADIUS} 0 ${largeArc} 0 ${ex} ${ey}`;
}

// Solid triangular arrowhead whose base midpoint sits exactly on the arc tip,
// so the stroke flows into the dead centre of the head. Apex leads the
// counterclockwise rotation along the tangent.
function headPath(tipAngle: number): string {
  const rad = (tipAngle * Math.PI) / 180;
  const [tx, ty] = [-Math.cos(rad), -Math.sin(rad)]; // counterclockwise tangent
  const [nx, ny] = [-Math.sin(rad), Math.cos(rad)]; // base direction (radial)
  const [cx, cy] = polar(tipAngle); // arc tip = base midpoint
  const apex = `${round(cx + tx * HEAD_LENGTH)} ${round(cy + ty * HEAD_LENGTH)}`;
  const left = `${round(cx + nx * HEAD_HALF_WIDTH)} ${round(cy + ny * HEAD_HALF_WIDTH)}`;
  const right = `${round(cx - nx * HEAD_HALF_WIDTH)} ${round(cy - ny * HEAD_HALF_WIDTH)}`;
  return `M${apex}L${left}L${right}Z`;
}

const gapHalf = GAP_DEGREES / 2;
// Gaps on the left (270°) and right (90°); top arc heads to the upper-left,
// bottom arc heads to the lower-right — the two arrows chase each other.
const topArc = { from: 90 - gapHalf, to: -(90 - gapHalf) };
const bottomArc = { from: 270 - gapHalf, to: 90 + gapHalf };

export const REFRESH_ARC_PATHS: readonly string[] = [
  arcPath(topArc.from, topArc.to),
  arcPath(bottomArc.from, bottomArc.to)
];

export const REFRESH_HEAD_PATHS: readonly string[] = [headPath(topArc.to), headPath(bottomArc.to)];

export function buildIconSvg(state: IconState): string {
  const arcs = REFRESH_ARC_PATHS.map((d) => `<path d="${d}"/>`).join('');
  const heads = REFRESH_HEAD_PATHS.map((d) => `<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}">
  <circle cx="${CENTER}" cy="${CENTER}" r="${CENTER}" fill="${ICON_BACKGROUND[state]}"/>
  <g fill="none" stroke="${ICON_ARROW}" stroke-width="${ICON_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">${arcs}</g>
  <g fill="${ICON_ARROW}" stroke="none">${heads}</g>
</svg>`;
}
