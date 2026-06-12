import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { layoutText } from "./font.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/* ------------------------------------------------------------------ *
 * Your name as a constellation: each pixel of the name is a star that
 * twinkles in, neighbouring stars are joined by lines that "draw on"
 * with a left-to-right sweep, all over a slowly drifting star field
 * with a periodic shooting star.
 * ------------------------------------------------------------------ */
const CONFIG = {
  name: "DEVANSH SAYANI",
  out: "dist/devansh-constellation.svg",
  cell: 16, // spacing between constellation stars
  rows: 5,
  pad: 40,
  seed: 0xc057e11a,
  sky: ["#070b1a", "#0d1733"], // gradient top -> bottom
  star: "#dfe8ff",
  line: "#7aa2ff",
  glow: "#9ec1ff",
  bgStars: 90,
  T: 12,
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(CONFIG.seed);

const { cells, width: textW } = layoutText(CONFIG.name, { topRow: 0 });
const lit = new Set(cells.map((c) => `${c.col},${c.row}`));
const cols = textW;
const rowsN = CONFIG.rows;

const gridW = (cols - 1) * CONFIG.cell;
const gridH = (rowsN - 1) * CONFIG.cell;
const viewW = gridW + CONFIG.pad * 2;
const viewH = gridH + CONFIG.pad * 2;
const sx = (c) => CONFIG.pad + c * CONFIG.cell;
const sy = (r) => CONFIG.pad + r * CONFIG.cell;

const pct = (t) => ((t / CONFIG.T) * 100).toFixed(2);
const sweepStart = 0.6;
const sweepEnd = 5.0;
const holdEnd = CONFIG.T - 1.2;
// when a star at column c lights up
const tFor = (c) => sweepStart + (c / Math.max(1, cols - 1)) * (sweepEnd - sweepStart);

/* ---- constellation edges: join horizontally / vertically / diagonally
 *      adjacent lit pixels so the letters read as joined star lines ---- */
const edges = [];
const has = (c, r) => lit.has(`${c},${r}`);
for (let c = 0; c < cols; c++)
  for (let r = 0; r < rowsN; r++) {
    if (!has(c, r)) continue;
    const neigh = [
      [c + 1, r],
      [c, r + 1],
      [c + 1, r + 1],
      [c + 1, r - 1],
    ];
    for (const [nc, nr] of neigh) {
      if (has(nc, nr)) edges.push([c, r, nc, nr]);
    }
  }

/* ------------------------------------------------------------------ *
 * Build pieces
 * ------------------------------------------------------------------ */
const styles = [];

// background drifting + twinkling stars
const bgStarEls = [];
for (let i = 0; i < CONFIG.bgStars; i++) {
  const x = (rand() * viewW).toFixed(1);
  const y = (rand() * viewH).toFixed(1);
  const r = (0.4 + rand() * 1.3).toFixed(2);
  const dur = (2 + rand() * 4).toFixed(2);
  const delay = (-rand() * 6).toFixed(2);
  const op = (0.3 + rand() * 0.5).toFixed(2);
  bgStarEls.push(
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${CONFIG.star}" opacity="${op}">` +
      `<animate attributeName="opacity" values="${op};${(op * 0.2).toFixed(2)};${op}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></circle>`
  );
}

// constellation connecting lines — drawn on via dash offset, staggered by column
const lineEls = [];
edges.forEach(([c, r, nc, nr], i) => {
  const x1 = sx(c),
    y1 = sy(r),
    x2 = sx(nc),
    y2 = sy(nr);
  const len = Math.hypot(x2 - x1, y2 - y1).toFixed(2);
  const t = tFor(Math.min(c, nc)) + 0.25;
  const p = Number(pct(t));
  const cls = `ln${i}`;
  lineEls.push(
    `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${CONFIG.line}" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="${len}" stroke-dashoffset="${len}"/>`
  );
  styles.push(
    `.${cls}{animation:${cls} ${CONFIG.T}s ease-out infinite}@keyframes ${cls}{` +
      `0%,${p}%{stroke-dashoffset:${len};opacity:0}` +
      `${(p + 0.05).toFixed(2)}%{opacity:.9}` +
      `${(p + 3).toFixed(2)}%{stroke-dashoffset:0;opacity:.9}` +
      `${pct(holdEnd)}%{stroke-dashoffset:0;opacity:.9}` +
      `${pct(holdEnd + 0.6)}%{opacity:0;stroke-dashoffset:${len}}100%{opacity:0;stroke-dashoffset:${len}}}`
  );
});

// constellation stars (the name pixels) — pop + twinkle in sequence
const starEls = [];
let si = 0;
for (let c = 0; c < cols; c++)
  for (let r = 0; r < rowsN; r++) {
    if (!has(c, r)) continue;
    const x = sx(c),
      y = sy(r);
    const t = tFor(c);
    const p = Number(pct(t));
    const cls = `st${si++}`;
    starEls.push(
      `<g class="${cls}"><circle cx="${x}" cy="${y}" r="4.2" fill="${CONFIG.glow}" opacity="0.0"/>` +
        `<circle cx="${x}" cy="${y}" r="2" fill="${CONFIG.star}"/></g>`
    );
    styles.push(
      `.${cls}{opacity:0;transform-box:fill-box;transform-origin:center;animation:${cls} ${CONFIG.T}s ease-out infinite}` +
        `@keyframes ${cls}{0%,${p}%{opacity:0;transform:scale(0)}` +
        `${(p + 0.3).toFixed(2)}%{opacity:1;transform:scale(1.6)}` +
        `${(p + 0.7).toFixed(2)}%{opacity:1;transform:scale(1)}` +
        `${pct(holdEnd)}%{opacity:1;transform:scale(1)}` +
        `${pct(holdEnd + 0.6)}%{opacity:0;transform:scale(0)}100%{opacity:0}}`
    );
  }

// a shooting star that streaks once per loop
const ssY = CONFIG.pad * 0.5;
const shooting = `<g opacity="0">
<line x1="0" y1="0" x2="34" y2="10" stroke="url(#trail)" stroke-width="2" stroke-linecap="round"/>
<circle cx="0" cy="0" r="2" fill="#fff"/>
<animateMotion dur="${CONFIG.T}s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;0.62;0.74;1" calcMode="linear" path="M${(viewW * 0.78).toFixed(0)} ${ssY} L${(viewW * 0.12).toFixed(0)} ${(viewH * 0.6).toFixed(0)}"/>
<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.62;0.64;0.72;0.74;1" dur="${CONFIG.T}s" repeatCount="indefinite"/>
</g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${CONFIG.sky[0]}"/><stop offset="1" stop-color="${CONFIG.sky[1]}"/>
  </linearGradient>
  <linearGradient id="trail" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff"/>
  </linearGradient>
  <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="${CONFIG.glow}" stop-opacity="0.5"/><stop offset="1" stop-color="${CONFIG.glow}" stop-opacity="0"/>
  </radialGradient>
</defs>
<style>${styles.join("\n")}</style>
<rect width="${viewW}" height="${viewH}" fill="url(#sky)"/>
<g>${bgStarEls.join("")}</g>
${shooting}
<g>${lineEls.join("\n")}</g>
<g>${starEls.join("\n")}</g>
</svg>
`;

const outPath = resolve(ROOT, CONFIG.out);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, svg);
console.log(
  `Wrote ${CONFIG.out}  (${viewW}x${viewH}, ${edges.length} edges, ${(svg.length / 1024).toFixed(1)} KB)`
);
