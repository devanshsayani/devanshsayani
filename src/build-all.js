import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Running each generator module executes it (top-level side effects).
await import("./generate.js");
await import("./conway.js");
await import("./terminal.js");
await import("./constellation.js");

const pieces = [
  ["devansh-snake.svg", "Snake reveal", "A pixel kid throws a snake that slithers across the contribution grid and paints your name."],
  ["devansh-life.svg", "Game of Life", "A random soup of cells evolves under Conway's rules, then settles into your name."],
  ["devansh-terminal.svg", "Terminal build", "A retro shell types a git command, runs a build, and renders your name as a banner."],
  ["devansh-constellation.svg", "Constellation", "Your name as a star map — stars twinkle in and connect into letters under a shooting star."],
];

const cards = pieces
  .map(
    ([file, title, desc]) => `    <figure>
      <img src="${file}" alt="${title}" loading="lazy"/>
      <figcaption><strong>${title}</strong><span>${desc}</span></figcaption>
    </figure>`
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>README art — gallery</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:#0d1117; color:#c9d1d9;
         font:15px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }
  header { padding:48px 24px 8px; text-align:center; }
  header h1 { margin:0 0 6px; font-size:26px; color:#39d353; }
  header p { margin:0; color:#6e7681; }
  main { max-width:920px; margin:0 auto; padding:24px; display:grid; gap:28px; }
  figure { margin:0; background:#0b0f14; border:1px solid #21262d; border-radius:12px;
           padding:18px; overflow:auto; }
  figure img { display:block; max-width:100%; margin:0 auto; }
  figcaption { margin-top:14px; display:flex; flex-direction:column; gap:4px; }
  figcaption strong { color:#e6edf3; }
  figcaption span { color:#6e7681; font-size:13px; }
  footer { text-align:center; color:#484f58; padding:16px 24px 48px; font-size:12px; }
  code { background:#161b22; padding:2px 6px; border-radius:5px; color:#79c0ff; }
</style>
</head>
<body>
<header>
  <h1>README art</h1>
  <p>Four unique, self-animating SVGs — pure SVG + CSS/SMIL, no runtime JS.</p>
</header>
<main>
${cards}
</main>
<footer>
  Regenerate with <code>npm run build</code>. Embed any piece in a README with
  <code>&lt;img src="dist/devansh-life.svg"&gt;</code>.
</footer>
</body>
</html>
`;

mkdirSync(resolve(ROOT, "dist"), { recursive: true });
writeFileSync(resolve(ROOT, "dist/gallery.html"), html);
console.log("\nWrote dist/gallery.html — open it to see all four pieces.");
