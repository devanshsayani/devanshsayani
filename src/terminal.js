import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { layoutText } from "./font.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/* ------------------------------------------------------------------ *
 * A retro terminal that types a git command, runs a fake build with a
 * progress bar, then "renders" your name as a green contribution banner.
 * Typing is a true typewriter: a clipPath whose width grows in discrete
 * character-sized steps, with a block cursor riding the leading edge.
 * ------------------------------------------------------------------ */
const CONFIG = {
  name: "DEVANSH SAYANI",
  out: "dist/devansh-terminal.svg",
  user: "devansh",
  host: "github",
  command: "git show --render=profile",
  cell: 9,
  gap: 2,
  background: "#0d1117",
  windowBg: "#0b0f14",
  bar: "#161b22",
  empty: "#1b2129",
  greens: ["#0e4429", "#006d32", "#26a641", "#39d353"],
  fg: "#c9d1d9",
  prompt: "#39d353",
  dim: "#6e7681",
  charW: 8.4, // monospace advance for the typed command
  fontSize: 14,
  T: 12, // loop length (s)
};

const pitch = CONFIG.cell + CONFIG.gap;
const promptStr = `${CONFIG.user}@${CONFIG.host}:~$ `;
const fullLine = promptStr + CONFIG.command;
const nChars = fullLine.length;

// ---- timeline (seconds) ----
const typeStart = 0.4;
const typeEnd = typeStart + nChars * 0.05; // ~ per-char
const runStart = typeEnd + 0.3;
const barEnd = runStart + 2.0;
const drawStart = barEnd + 0.2;
const drawEnd = drawStart + 2.4;
const holdEnd = CONFIG.T - 1.5;
const pct = (t) => ((t / CONFIG.T) * 100).toFixed(2);

// ---- name banner layout (the "rendered" output) ----
const { cells, width: textW } = layoutText(CONFIG.name, { topRow: 0 });
const banner = new Set(cells.map((c) => `${c.col},${c.row}`));
const bannerW = textW;
const bannerH = 5;

// ---- window geometry ----
const padX = 18;
const padTop = 44; // title bar
const lineH = 22;
const bannerOriginY = padTop + 16 + lineH * 4; // below the text output lines
const bannerPxW = bannerW * pitch - CONFIG.gap;
const bannerPxH = bannerH * pitch - CONFIG.gap;
const viewW = Math.max(padX * 2 + fullLine.length * CONFIG.charW + 24, padX * 2 + bannerPxW);
const viewH = bannerOriginY + bannerPxH + 26;

const bx = (c) => padX + c * pitch;
const by = (r) => bannerOriginY + r * pitch;

/* ---- typewriter: clip width steps through character widths ---- */
const clipVals = [];
for (let i = 0; i <= nChars; i++) clipVals.push((i * CONFIG.charW).toFixed(1));
const clipValues = clipVals.join(";");
const typeKeyTimes = clipVals.map((_, i) => (i / nChars).toFixed(4)).join(";");
// the clip animation only runs during the typing window; before/after held
const typeDur = (typeEnd - typeStart).toFixed(2);

/* ---- progress bar fill ---- */
const barX = padX;
const barY = padTop + 16 + lineH * 1.3;
const barW = Math.min(260, viewW - padX * 2);
const barH = 10;

/* ---- banner cells: each lights green with a left-to-right sweep ---- */
const rects = [];
const cellCss = [];
for (let c = 0; c < bannerW; c++)
  for (let r = 0; r < bannerH; r++) {
    const k = `${c},${r}`;
    const x = bx(c).toFixed(1);
    const y = by(r).toFixed(1);
    if (!banner.has(k)) {
      rects.push(
        `<rect x="${x}" y="${y}" width="${CONFIG.cell}" height="${CONFIG.cell}" rx="1.5" fill="${CONFIG.empty}"/>`
      );
      continue;
    }
    let h = (c * 374761393 + r * 668265263) >>> 0;
    h = (h ^ (h >> 13)) * 1274126177;
    const green = CONFIG.greens[1 + ((h >>> 0) % 3)];
    const t = drawStart + (c / Math.max(1, bannerW - 1)) * (drawEnd - drawStart);
    const p = Number(pct(t));
    const id = `b${c}_${r}`;
    rects.push(
      `<rect class="${id}" x="${x}" y="${y}" width="${CONFIG.cell}" height="${CONFIG.cell}" rx="1.5" fill="${CONFIG.empty}"/>`
    );
    cellCss.push(
      `.${id}{animation:${id} ${CONFIG.T}s linear infinite}@keyframes ${id}{` +
        `0%,${p}%{fill:${CONFIG.empty}}` +
        `${(p + 0.4).toFixed(2)}%{fill:${green};}` +
        `${pct(holdEnd)}%{fill:${green}}` +
        `${pct(holdEnd + 0.3)}%{fill:${CONFIG.empty}}100%{fill:${CONFIG.empty}}}`
    );
  }

/* ---- output text lines that appear after the build ---- */
const outLine1Y = padTop + 16; // "Resolving deltas..." appears at runStart
// SMIL opacity reveal — appears at t, holds, fades before the loop restarts.
const kt = (t) => (t / CONFIG.T).toFixed(4);
const showAt = (t) =>
  `<animate attributeName="opacity" dur="${CONFIG.T}s" repeatCount="indefinite" ` +
  `values="0;0;1;1;0;0" keyTimes="0;${kt(t)};${kt(t + 0.05)};${kt(holdEnd)};${kt(holdEnd + 0.3)};1"/>`;

const css = `
text{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
@keyframes blink{0%,50%{opacity:.85}50.01%,100%{opacity:0}}
.typeRect{animation:typeGrow ${CONFIG.T}s linear infinite;}
@keyframes typeGrow{
0%,${pct(typeStart)}%{width:0px}
${pct(typeEnd)}%{width:${(nChars * CONFIG.charW).toFixed(1)}px}
${pct(holdEnd)}%{width:${(nChars * CONFIG.charW).toFixed(1)}px}
${pct(holdEnd + 0.3)}%{width:0px}
100%{width:0px}}
.tcur{animation:tcur ${CONFIG.T}s linear infinite, blink .9s steps(1,end) infinite;}
@keyframes tcur{
0%,${pct(typeStart)}%{transform:translateX(0)}
${pct(typeEnd)}%{transform:translateX(${(nChars * CONFIG.charW).toFixed(1)}px)}
${pct(holdEnd)}%{transform:translateX(${(nChars * CONFIG.charW).toFixed(1)}px)}
100%{transform:translateX(${(nChars * CONFIG.charW).toFixed(1)}px)}}
.barfill{animation:barfill ${CONFIG.T}s linear infinite;}
@keyframes barfill{
0%,${pct(runStart)}%{width:0px}
${pct(barEnd)}%{width:${barW}px}
${pct(holdEnd)}%{width:${barW}px}
${pct(holdEnd + 0.3)}%{width:0px}100%{width:0px}}
${cellCss.join("\n")}
`;

// The typed command, revealed by a clip rect that grows in steps.
const cmdText =
  `<text x="${padX}" y="${padTop - 2}" font-size="${CONFIG.fontSize}">` +
  `<tspan fill="${CONFIG.prompt}">${promptStr.replace(/ /g, " ")}</tspan>` +
  `<tspan fill="${CONFIG.fg}">${CONFIG.command.replace(/ /g, " ")}</tspan></text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">
<style>${css}</style>
<defs>
  <clipPath id="typeClip"><rect class="typeRect" x="${padX}" y="${padTop - 18}" width="0" height="22"/></clipPath>
</defs>
<rect width="${viewW}" height="${viewH}" rx="8" fill="${CONFIG.windowBg}"/>
<rect width="${viewW}" height="30" rx="8" fill="#11161c"/>
<rect y="22" width="${viewW}" height="8" fill="#11161c"/>
<circle cx="16" cy="15" r="5" fill="#ff5f56"/>
<circle cx="34" cy="15" r="5" fill="#ffbd2e"/>
<circle cx="52" cy="15" r="5" fill="#27c93f"/>
<text x="${viewW / 2}" y="19" font-size="11" fill="${CONFIG.dim}" text-anchor="middle">— bash —</text>

<g clip-path="url(#typeClip)">${cmdText}</g>
<rect class="tcur" x="${padX}" y="${padTop - 15}" width="${CONFIG.charW}" height="16" fill="${CONFIG.fg}" opacity="0.85"/>

<g opacity="0">${showAt(runStart)}
<text x="${padX}" y="${outLine1Y}" font-size="12" fill="${CONFIG.dim}">Resolving deltas: 100% — rendering contribution banner…</text>
</g>
<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="3" fill="${CONFIG.bar}"/>
<rect class="barfill" x="${barX}" y="${barY}" width="0" height="${barH}" rx="3" fill="${CONFIG.prompt}"/>

<g opacity="0">${showAt(drawStart)}
<text x="${padX}" y="${barY + barH + 18}" font-size="12" fill="${CONFIG.dim}">$ ./render ${CONFIG.name.toLowerCase()} → ok</text>
</g>

<g>
${rects.join("\n")}
</g>
</svg>
`;

const outPath = resolve(ROOT, CONFIG.out);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, svg);
console.log(
  `Wrote ${CONFIG.out}  (${viewW}x${viewH}, ${(svg.length / 1024).toFixed(1)} KB)`
);
