import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { textCellSet } from "./font.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/* ------------------------------------------------------------------ *
 * Conway's Game of Life that boils out of a random "soup", then locks
 * itself into your name, holds, dissolves, and loops — rendered on a
 * GitHub contribution grid using one discrete SMIL <animate> per cell.
 * ------------------------------------------------------------------ */
const CONFIG = {
  name: "DEVANSH SAYANI",
  out: "dist/devansh-life.svg",
  cell: 11,
  gap: 2,
  rows: 7,
  padCols: 4, // empty columns padding on each side of the name
  seed: 0x5eed1337,
  background: "#0d1117",
  empty: "#161b22",
  greens: ["#0e4429", "#006d32", "#26a641", "#39d353"],
  chaosGens: 26, // generations of real Life from the soup
  lockGens: 6, // frames spent morphing into the name
  holdFrames: 14, // frames the finished name is held
  dissolveFrames: 7, // frames spent clearing the name
  frameDur: 0.26, // seconds per frame
};

const pitch = CONFIG.cell + CONFIG.gap;

// mulberry32 — tiny deterministic PRNG so the soup is reproducible.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Lay out the name, centered, to learn the grid size and target cells.
const { set: nameSet, width: textW } = (() => {
  const tmp = textCellSet(CONFIG.name, { topRow: 1, leftCol: 0 });
  return tmp;
})();
const W = textW + CONFIG.padCols * 2;
const H = CONFIG.rows;
const leftCol = Math.floor((W - textW) / 2);
const target = new Set(
  [...nameSet].map((k) => {
    const [c, r] = k.split(",").map(Number);
    return `${c + leftCol},${r}`;
  })
);

const key = (c, r) => `${c},${r}`;
const inBounds = (c, r) => c >= 0 && c < W && r >= 0 && r < H;

// One step of Conway's B3/S23 on the bounded grid.
function step(alive) {
  const counts = new Map();
  for (const k of alive) {
    const [c, r] = k.split(",").map(Number);
    for (let dc = -1; dc <= 1; dc++)
      for (let dr = -1; dr <= 1; dr++) {
        if (!dc && !dr) continue;
        const nc = c + dc,
          nr = r + dr;
        if (!inBounds(nc, nr)) continue;
        const nk = key(nc, nr);
        counts.set(nk, (counts.get(nk) || 0) + 1);
      }
  }
  const next = new Set();
  for (const [k, n] of counts) {
    if (n === 3 || (n === 2 && alive.has(k))) next.add(k);
  }
  return next;
}

/* ---- build the frame timeline (each frame is a Set of alive cells) ---- */
const rand = rng(CONFIG.seed);
const frames = [];

// 1) random soup biased toward the name band so structure emerges near it
let alive = new Set();
for (let c = 0; c < W; c++)
  for (let r = 0; r < H; r++) {
    const p = target.has(key(c, r)) ? 0.62 : 0.32;
    if (rand() < p) alive.add(key(c, r));
  }
frames.push(new Set(alive));

// 2) run genuine Life
for (let g = 0; g < CONFIG.chaosGens; g++) {
  alive = step(alive);
  frames.push(new Set(alive));
}

// 3) lock-in: each frame moves a fraction of cells toward the target
const wrong = () => {
  const add = [...target].filter((k) => !alive.has(k));
  const rem = [...alive].filter((k) => !target.has(k));
  return { add, rem };
};
for (let l = 1; l <= CONFIG.lockGens; l++) {
  const frac = l / CONFIG.lockGens;
  const { add, rem } = wrong();
  const next = new Set(alive);
  const take = (arr, n) => arr.slice(0, Math.ceil(arr.length * frac)).slice(0, n ?? arr.length);
  for (const k of take(add)) next.add(k);
  for (const k of take(rem)) next.delete(k);
  if (l === CONFIG.lockGens) {
    next.clear();
    for (const k of target) next.add(k);
  }
  alive = next;
  frames.push(new Set(alive));
}

// 4) hold the finished name
for (let h = 0; h < CONFIG.holdFrames; h++) frames.push(new Set(target));

// 5) dissolve — randomly retire cells until empty
let dis = new Set(target);
const order = [...target].sort(() => rand() - 0.5);
for (let d = 1; d <= CONFIG.dissolveFrames; d++) {
  const cut = Math.floor((order.length * d) / CONFIG.dissolveFrames);
  dis = new Set(order.slice(cut));
  frames.push(new Set(dis));
}
frames.push(new Set()); // empty beat before the loop restarts

const F = frames.length;
const T = (F * CONFIG.frameDur).toFixed(2);

/* ---- per-cell colour (deterministic green, brightest inside the name) ---- */
const hash = (c, r) => {
  let h = (c * 374761393 + r * 668265263) >>> 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return 1 + ((h >>> 0) % (CONFIG.greens.length - 1));
};
const litColor = (c, r, isName) =>
  isName ? CONFIG.greens[3] : CONFIG.greens[hash(c, r)];

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */
const padPx = 16;
const gridW = W * pitch - CONFIG.gap;
const gridH = H * pitch - CONFIG.gap;
const viewW = padPx * 2 + gridW;
const viewH = padPx * 2 + gridH + 22;
const px = (c) => padPx + c * pitch;
const py = (r) => padPx + r * pitch;

const rects = [];
for (let c = 0; c < W; c++)
  for (let r = 0; r < H; r++) {
    const k = key(c, r);
    const everAlive = frames.some((f) => f.has(k));
    const x = px(c).toFixed(1);
    const y = py(r).toFixed(1);
    if (!everAlive) {
      rects.push(
        `<rect x="${x}" y="${y}" width="${CONFIG.cell}" height="${CONFIG.cell}" rx="2" fill="${CONFIG.empty}"/>`
      );
      continue;
    }
    const isName = target.has(k);
    const values = frames
      .map((f) => (f.has(k) ? litColor(c, r, isName) : CONFIG.empty))
      .join(";");
    rects.push(
      `<rect x="${x}" y="${y}" width="${CONFIG.cell}" height="${CONFIG.cell}" rx="2" fill="${CONFIG.empty}">` +
        `<animate attributeName="fill" calcMode="discrete" dur="${T}s" repeatCount="indefinite" values="${values}"/>` +
        `</rect>`
    );
  }

const caption = `${CONFIG.name} — emerged from chaos (Conway's Game of Life)`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}" font-family="ui-monospace,monospace">
<rect width="${viewW}" height="${viewH}" fill="${CONFIG.background}"/>
<g>
${rects.join("\n")}
</g>
<text x="${padPx}" y="${viewH - 7}" font-size="10" fill="#6e7681">${caption}</text>
</svg>
`;

const outPath = resolve(ROOT, CONFIG.out);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, svg);
console.log(
  `Wrote ${CONFIG.out}  (grid ${W}x${H}, ${F} frames, ${(svg.length / 1024).toFixed(1)} KB)`
);
