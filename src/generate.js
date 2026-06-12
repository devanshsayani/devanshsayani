import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { layoutText } from "./font.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/* ------------------------------------------------------------------ *
 * Config — tweak the name, colors and sizing here.
 * ------------------------------------------------------------------ */
const CONFIG = {
  name: "DEVANSH SAYANI",
  out: "dist/devansh-snake.svg",

  // grid
  cell: 11, // px size of a grid square
  gap: 2, // px gap between squares
  rows: 7, // contribution-style height
  padColsLeft: 3, // empty columns on the left
  padColsRight: 7, // empty columns on the right (room for the boy to stand by the "I")

  // colors
  background: "#0d1117",
  empty: "#161b22",
  // green levels used when a cell is "revealed" (low -> high)
  greens: ["#0e4429", "#006d32", "#26a641", "#39d353"],
  snake: "#ffcb6b",
  snakeBand: "#e0922b",
  snakeHead: "#ffb01f",
  boy: {
    skin: "#f1c27d",
    shirt: "#ef476f",
    pants: "#1d3557",
    hair: "#2b2118",
    shoe: "#222",
  },

  // timeline (seconds) — the whole thing loops every `T`
  T: 20,
  boyArriveAt: 2.0, // boy finishes running in
  throwAt: 2.4, // boy flings the snake
  sweepStart: 3.0, // snake starts crossing the grid
  sweepEnd: 15.0, // snake finishes -> name fully revealed
  boyReachI: 4.6, // boy reaches his spot next to the "I" and stands
  resetAt: 19.2, // grid clears to restart the loop
};

const pitch = CONFIG.cell + CONFIG.gap;

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */
const {
  cells: glyphCells,
  width: textWidth,
  glyphs,
} = layoutText(CONFIG.name, { topRow: 1 });

const W = textWidth + CONFIG.padColsLeft + CONFIG.padColsRight; // columns
const H = CONFIG.rows; // rows

// shift glyph cells right by the left padding
const filled = new Set(
  glyphCells.map((c) => `${c.col + CONFIG.padColsLeft},${c.row}`)
);

// last non-space glyph (the trailing "I") in grid column coordinates
const lastGlyph = [...glyphs].reverse().find((g) => g.char !== " ");
const lastGlyphLeftCol = lastGlyph.x + CONFIG.padColsLeft;
const lastGlyphRightCol = lastGlyphLeftCol + lastGlyph.width - 1;

const padPx = 16;
const gridW = W * pitch - CONFIG.gap;
const gridH = H * pitch - CONFIG.gap;
const viewW = padPx * 2 + gridW;
const baseline = padPx + gridH; // boy stands on the grid's bottom edge
const viewH = baseline + 20;

const cx = (col) => padPx + col * pitch + CONFIG.cell / 2;
const cy = (row) => padPx + row * pitch + CONFIG.cell / 2;
const px = (col) => padPx + col * pitch;
const py = (row) => padPx + row * pitch;

/* ------------------------------------------------------------------ *
 * Serpentine path through every cell + reveal timing
 * ------------------------------------------------------------------ */
const order = []; // [{col,row}] in the order the snake visits them
for (let col = 0; col < W; col++) {
  if (col % 2 === 0) {
    for (let row = 0; row < H; row++) order.push({ col, row });
  } else {
    for (let row = H - 1; row >= 0; row--) order.push({ col, row });
  }
}
const N = order.length;
const pathIndex = new Map();
order.forEach((c, i) => pathIndex.set(`${c.col},${c.row}`, i));

const motionPath =
  "M" +
  order.map((c) => `${cx(c.col).toFixed(1)} ${cy(c.row).toFixed(1)}`).join("L");

// reveal time (s) for a filled cell given its index along the path
const revealTime = (i) =>
  CONFIG.sweepStart + (i / (N - 1)) * (CONFIG.sweepEnd - CONFIG.sweepStart);

/* small deterministic hash so the greens look like real contributions.
 * Skips the darkest shade so the name always stays readable. */
const hash = (col, row) => {
  let h = (col * 374761393 + row * 668265263) >>> 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return 1 + ((h >>> 0) % (CONFIG.greens.length - 1));
};

/* ------------------------------------------------------------------ *
 * Build SVG pieces
 * ------------------------------------------------------------------ */
const pct = (t) => ((t / CONFIG.T) * 100).toFixed(3);

const cellRects = [];
const cellKeyframes = [];

for (let col = 0; col < W; col++) {
  for (let row = 0; row < H; row++) {
    const key = `${col},${row}`;
    const x = px(col).toFixed(1);
    const y = py(row).toFixed(1);
    if (!filled.has(key)) {
      cellRects.push(
        `<rect class="c" x="${x}" y="${y}" width="${CONFIG.cell}" height="${CONFIG.cell}" rx="2"/>`
      );
      continue;
    }
    const i = pathIndex.get(key);
    const p = Number(pct(revealTime(i)));
    const green = CONFIG.greens[hash(col, row)];
    const id = `${col}_${row}`;
    cellRects.push(
      `<rect class="c r${id}" x="${x}" y="${y}" width="${CONFIG.cell}" height="${CONFIG.cell}" rx="2"/>`
    );

    const pIn = (p + 0.15).toFixed(3);
    const pUp = (p + 0.6).toFixed(3);
    const reset = pct(CONFIG.resetAt);
    cellKeyframes.push(`@keyframes r${id}{
0%,${p}%{fill:var(--empty);transform:scale(1)}
${pIn}%{fill:${green};transform:scale(1.55)}
${pUp}%{fill:${green};transform:scale(1)}
${reset}%{fill:${green};transform:scale(1)}
${(Number(reset) + 0.4).toFixed(3)}%{fill:var(--empty)}
100%{fill:var(--empty)}}
.r${id}{animation:r${id} ${CONFIG.T}s linear infinite}`);
  }
}

/* ---- snake (head + trailing body) following the serpentine path ---- */
const segCount = 16; // number of body segments behind the head
const sweepFrac0 = CONFIG.sweepStart / CONFIG.T;
const sweepFrac1 = CONFIG.sweepEnd / CONFIG.T;
const lag = 0.0007; // how much each segment trails the one ahead (in keyTime units)

// motion element that drags whatever it's on along the serpentine path,
// trailing the head by `s` segments.
const motionFor = (s) => {
  const t0 = (sweepFrac0 + s * lag).toFixed(4);
  const t1 = (sweepFrac1 + s * lag).toFixed(4);
  return `<animateMotion dur="${CONFIG.T}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;1;1" keyTimes="0;${t0};${t1};1"><mpath xlink:href="#snakePath" href="#snakePath"/></animateMotion>`;
};

const snakeParts = [];
// tail -> body (drawn back to front so the head sits on top)
for (let s = segCount; s >= 1; s--) {
  const taper = Math.pow(1 - (s - 1) / segCount, 0.55);
  const r = Math.max(1.4, 6.2 * taper).toFixed(2);
  const color = s % 2 === 0 ? CONFIG.snake : CONFIG.snakeBand;
  snakeParts.push(
    `<circle cx="0" cy="0" r="${r}" fill="${color}">${motionFor(s)}</circle>`
  );
}
// head group (ellipse + eyes + flicking forked tongue), all riding the head path
snakeParts.push(`<g>${motionFor(0)}
<path class="tongue" d="M7 0 L14 0 M14 0 L17 -2.2 M14 0 L17 2.2" stroke="#ff3b3b" stroke-width="1.1" fill="none" stroke-linecap="round"/>
<ellipse cx="0" cy="0" rx="8.2" ry="6.4" fill="${CONFIG.snakeHead}"/>
<ellipse cx="2.5" cy="0" rx="5.6" ry="5" fill="${CONFIG.snake}" opacity="0.55"/>
<circle cx="3.2" cy="-2.6" r="1.7" fill="#fff"/>
<circle cx="3.2" cy="2.6" r="1.7" fill="#fff"/>
<circle cx="3.9" cy="-2.6" r="0.95" fill="#161616"/>
<circle cx="3.9" cy="2.6" r="0.95" fill="#161616"/>
</g>`);

/* ---- boy resting spot: standing just to the right of the "I" ---- */
const boyFinalX = px(lastGlyphRightCol + 1) + 16;

/* ---- thrown snake projectile (flies from the boy's hand) ---- */
const leftStandX = padPx + 58;
const handX = leftStandX + 13;
const handY = baseline - 28;
const startX = cx(0);
const startY = cy(0);
const ctrlX = (handX + startX) / 2;
const ctrlY = Math.min(handY, startY) - 46;
const projPath = `M${handX} ${handY} Q${ctrlX} ${ctrlY} ${startX} ${startY}`;
const projT0 = ((CONFIG.throwAt - 0.05) / CONFIG.T).toFixed(4);
const projT1 = (CONFIG.sweepStart / CONFIG.T).toFixed(4);

/* ------------------------------------------------------------------ *
 * Boy (pixel character)
 * ------------------------------------------------------------------ */
const B = CONFIG.boy;
const note = (cls, x, fill) =>
  `<text class="note ${cls}" x="${x}" y="${baseline - 56}" font-size="13" fill="${fill}">\u266a</text>`;

const boy = `
<g class="boy">
 <g class="boyBody">
  <g class="boyDance">
   <!-- back leg -->
   <rect class="leg-b" x="-6" y="${baseline - 14}" width="4.5" height="12" fill="${B.pants}"/>
   <rect class="leg-b" x="-6.5" y="${baseline - 3}" width="6" height="3" rx="1" fill="${B.shoe}"/>
   <!-- front leg -->
   <rect class="leg-f" x="1.5" y="${baseline - 14}" width="4.5" height="12" fill="${B.pants}"/>
   <rect class="leg-f" x="1" y="${baseline - 3}" width="6" height="3" rx="1" fill="${B.shoe}"/>
   <!-- back arm (waves while dancing) -->
   <g class="armB"><rect x="-9" y="${baseline - 33}" width="4" height="15" rx="2" fill="${B.skin}"/></g>
   <!-- body -->
   <rect x="-7" y="${baseline - 36}" width="14" height="20" rx="2.5" fill="${B.shirt}"/>
   <!-- head -->
   <rect x="-6" y="${baseline - 50}" width="12" height="13" rx="3" fill="${B.skin}"/>
   <rect x="-6.5" y="${baseline - 52}" width="13" height="5" rx="2.5" fill="${B.hair}"/>
   <rect x="2" y="${baseline - 45}" width="1.8" height="1.8" fill="#222"/>
   <!-- throwing / dancing arm (front) -->
   <g class="arm"><g class="armW">
     <rect x="5" y="${baseline - 34}" width="4" height="15" rx="2" fill="${B.skin}"/>
   </g></g>
  </g>
 </g>
 <!-- music notes float up while he dances -->
 <g class="notes">
   ${note("n1", -10, "#ffd166")}
   ${note("n2", 6, "#06d6a0")}
   ${note("n3", -2, "#ef476f")}
 </g>
</g>`;

/* ------------------------------------------------------------------ *
 * Styles
 * ------------------------------------------------------------------ */
const a = (t) => pct(t); // alias

// legs move while entering, while jogging to the "I", and while dancing
const isRunning = (t) =>
  t <= CONFIG.boyArriveAt ||
  (t >= CONFIG.throwAt + 0.2 && t <= CONFIG.boyReachI) ||
  t >= CONFIG.boyReachI + 0.2;

// Build a leg-swing keyframe across the whole loop so the legs only move
// while the boy is actually running, and rest while he stands.
function legKeyframes(name, flip) {
  const dt = 0.16;
  const A = 26;
  const stops = [];
  for (let t = 0; t <= CONFIG.T + 1e-6; t += dt) {
    const tt = Math.min(t, CONFIG.T);
    let ang = 0;
    if (isRunning(tt)) {
      const up = Math.floor(tt / dt) % 2 === 0;
      ang = up ? A : -A;
      if (flip) ang = -ang;
    }
    stops.push(`${a(tt)}%{transform:rotate(${ang}deg)}`);
  }
  return `@keyframes ${name}{${stops.join("")}}`;
}

const css = `
:root{--empty:${CONFIG.empty};}
svg{background:${CONFIG.background};}
.c{fill:var(--empty);transform-box:fill-box;transform-origin:center;}
${cellKeyframes.join("\n")}

.snake{opacity:0;animation:snakeShow ${CONFIG.T}s linear infinite;}
@keyframes snakeShow{
0%,${a(CONFIG.sweepStart - 0.1)}%{opacity:0}
${a(CONFIG.sweepStart)}%{opacity:1}
${a(CONFIG.sweepEnd + 0.2)}%{opacity:1}
${a(CONFIG.sweepEnd + 0.5)}%{opacity:0}
100%{opacity:0}}

.proj{opacity:0;animation:projShow ${CONFIG.T}s linear infinite;}
@keyframes projShow{
0%,${a(CONFIG.throwAt - 0.15)}%{opacity:0}
${a(CONFIG.throwAt)}%{opacity:1}
${a(CONFIG.sweepStart - 0.05)}%{opacity:1}
${a(CONFIG.sweepStart)}%{opacity:0}
100%{opacity:0}}

.boy{transform:translateX(-240px);animation:boyMove ${CONFIG.T}s linear infinite;}
@keyframes boyMove{
0%{transform:translateX(-240px)}
${a(CONFIG.boyArriveAt)}%{transform:translateX(${leftStandX}px)}
${a(CONFIG.throwAt + 0.2)}%{transform:translateX(${leftStandX}px)}
${a(CONFIG.boyReachI)}%{transform:translateX(${boyFinalX.toFixed(1)}px)}
100%{transform:translateX(${boyFinalX.toFixed(1)}px)}}

/* turn to face the name once he arrives next to the "I" */
.boyBody{transform-box:fill-box;transform-origin:center;animation:boyFace ${CONFIG.T}s linear infinite;}
@keyframes boyFace{
0%,${a(CONFIG.boyReachI - 0.25)}%{transform:scaleX(1)}
${a(CONFIG.boyReachI)}%{transform:scaleX(-1)}
100%{transform:scaleX(-1)}}

.arm{transform-box:fill-box;transform-origin:50% 8%;animation:throwArm ${CONFIG.T}s linear infinite;}
@keyframes throwArm{
0%,${a(CONFIG.throwAt - 0.6)}%{transform:rotate(18deg)}
${a(CONFIG.throwAt - 0.2)}%{transform:rotate(-120deg)}
${a(CONFIG.throwAt + 0.15)}%{transform:rotate(55deg)}
${a(CONFIG.throwAt + 0.6)}%{transform:rotate(12deg)}
${a(CONFIG.boyReachI)}%{transform:rotate(12deg)}
${a(CONFIG.boyReachI + 0.5)}%{transform:rotate(-58deg)}
100%{transform:rotate(-58deg)}}

.leg-f,.leg-b{transform-box:fill-box;transform-origin:50% 12%;}
.leg-f{animation:stepF ${CONFIG.T}s linear infinite;}
.leg-b{animation:stepB ${CONFIG.T}s linear infinite;}
${legKeyframes("stepF", false)}
${legKeyframes("stepB", true)}

/* groovy bob + sway — reads as a happy run, then a dance once he's parked */
.boyDance{transform-box:fill-box;transform-origin:50% 100%;animation:bob .52s ease-in-out infinite;}
@keyframes bob{
0%{transform:translateY(0) rotate(0deg)}
25%{transform:translateY(-4px) rotate(3deg)}
50%{transform:translateY(0) rotate(0deg)}
75%{transform:translateY(-4px) rotate(-3deg)}
100%{transform:translateY(0) rotate(0deg)}}

.armW,.armB{transform-box:fill-box;transform-origin:50% 6%;}
.armW{animation:waveF .42s ease-in-out infinite;}
.armB{animation:waveB .42s ease-in-out infinite;}
@keyframes waveF{0%{transform:rotate(0)}50%{transform:rotate(-26deg)}100%{transform:rotate(0)}}
@keyframes waveB{0%{transform:rotate(20deg)}50%{transform:rotate(-6deg)}100%{transform:rotate(20deg)}}

/* music notes only appear once he starts dancing */
.notes{opacity:0;animation:notesShow ${CONFIG.T}s linear infinite;}
@keyframes notesShow{
0%,${a(CONFIG.boyReachI - 0.1)}%{opacity:0}
${a(CONFIG.boyReachI + 0.2)}%{opacity:1}
99%{opacity:1}
100%{opacity:0}}
.note{opacity:0;animation:floatUp 1.7s ease-in infinite;}
.n2{animation-delay:.55s}
.n3{animation-delay:1.1s}
@keyframes floatUp{
0%{opacity:0;transform:translateY(0)}
18%{opacity:1}
100%{opacity:0;transform:translateY(-26px)}}

/* the snake's forked tongue flicks in and out */
.tongue{animation:flick .4s steps(1,end) infinite;}
@keyframes flick{0%,55%{opacity:0}60%,82%{opacity:1}100%{opacity:0}}
`;

/* ------------------------------------------------------------------ *
 * Assemble
 * ------------------------------------------------------------------ */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}" font-family="sans-serif">
<style>${css}</style>
<defs><path id="snakePath" d="${motionPath}"/></defs>
<rect width="${viewW}" height="${viewH}" fill="${CONFIG.background}"/>
<g class="grid">
${cellRects.join("\n")}
</g>
<g class="snake">
${snakeParts.join("\n")}
</g>
<g class="proj">
<circle cx="0" cy="0" r="4.5" fill="${CONFIG.snake}"/>
<circle cx="2" cy="-2" r="1" fill="#1b1b1b"/>
<animateMotion dur="${CONFIG.T}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;1;1" keyTimes="0;${projT0};${projT1};1" path="${projPath}"/>
</g>
${boy}
</svg>
`;

const outPath = resolve(ROOT, CONFIG.out);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, svg);
console.log(
  `Wrote ${CONFIG.out}  (grid ${W}x${H}, ${filled.size} lit cells, ${(svg.length / 1024).toFixed(1)} KB)`
);
