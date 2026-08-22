<!-- readme-banner:start -->
  <img src="dist/devansh-snake.svg?v=1787375636751" alt="Devansh Sayani — Snake reveal" width="100%" />
<!-- readme-banner:end -->

<h1 align="center">Hi, I'm Devansh Sayani 👋</h1>

<p align="center">
  <!-- add a one-line bio here -->
</p>

<p align="center"><i>The banner above rotates every 5 minutes — refresh later and you might catch a different one.</i></p>

---

<details>
<summary><b>🎞️ Four banners in rotation</b> (only one shows at a time)</summary>

<br/>

| Piece | What it does |
| --- | --- |
| 🐍 **Snake** | A pixel boy throws a snake; it slithers across a contribution grid and reveals my name, then he dances by the final letter. |
| 🧬 **Game of Life** | Random cells evolve under Conway's rules, then lock into my name, hold, and dissolve. |
| 🖥️ **Terminal** | A retro shell types a git command, runs a build, and renders my name as a green banner. |
| ✨ **Constellation** | Stars twinkle in and connect into my name under a drifting night sky. |

Preview all four locally: `npm run preview` → opens `dist/gallery.html`.

</details>

---

<details>
<summary><b>Build & customize</b></summary>

<br/>

Requires Node 18+. No dependencies.

```bash
npm run build         # generate all four into dist/ + a gallery.html
npm run preview       # build, then open the gallery (macOS)

npm run snake         # or build just one piece:
npm run life
npm run terminal
npm run constellation
```

Each generator has a `CONFIG` block at the top of its file in `src/`
(`generate.js`, `conway.js`, `terminal.js`, `constellation.js`):

| Option | What it does |
| --- | --- |
| `name` | The text each piece spells out. |
| `greens` / `background` / `empty` | The contribution color ramp and grid colors. |
| `snake*`, `boy`, `sky`, `star`, `line` | Per-piece palette (snake body, the pixel boy, the night sky, …). |
| `cell`, `gap`, `rows`, `pad*` | Sizing. |
| `T` and the per-phase `*At` / `*Start` times | The animation timeline (seconds). |
| `seed` (life, constellation) | Reproducible "random" soup / starfield. |

The shared 5-row pixel font in `src/font.js` covers `A–Z`, `0–9` and some
punctuation — add a 5-row bitmap to `FONT` (`#` = filled pixel) for anything missing.

### How it works

- **Grids** (snake, life, terminal) rasterize the name onto a 7-row contribution grid via `src/font.js`.
- **Snake** follows a serpentine `<path>` with SMIL `animateMotion`; body segments trail the head, and each lit cell flips green exactly as the head arrives.
- **Game of Life** is simulated in Node, then every frame is baked into one compact discrete `<animate>` per cell — the browser just replays the simulation.
- **Terminal** types via a `clipPath` whose width steps across the command, with a block cursor riding the edge; status lines and the banner reveal on a shared clock.
- **Constellation** joins adjacent lit pixels into segments that draw on with `stroke-dashoffset`, while stars pop in with staggered keyframes.

MIT licensed.

</details>
