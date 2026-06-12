import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const README = resolve(ROOT, "README.md");

const BANNERS = [
  { file: "devansh-snake.svg", label: "Snake reveal" },
  { file: "devansh-life.svg", label: "Game of Life" },
  { file: "devansh-terminal.svg", label: "Terminal build" },
  { file: "devansh-constellation.svg", label: "Constellation" },
];

const START = "<!-- readme-banner:start -->";
const END = "<!-- readme-banner:end -->";

let readme = readFileSync(README, "utf8");
const blockRe = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!blockRe.test(readme)) {
  console.error("README is missing banner markers:", START, END);
  process.exit(1);
}

const current = readme.match(/dist\/(devansh-\w+\.svg)/)?.[1];
const pool = BANNERS.filter((b) => b.file !== current);
const pick = pool[Math.floor(Math.random() * pool.length)] ?? BANNERS[0];
const bust = Date.now();

const block = `${START}
  <img src="dist/${pick.file}?v=${bust}" alt="Devansh Sayani — ${pick.label}" width="100%" />
${END}`;

readme = readme.replace(blockRe, block);
writeFileSync(README, readme);
console.log(`Banner → ${pick.file} (${pick.label}), cache-bust v=${bust}`);
