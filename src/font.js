// 5-row tall pixel font. Each glyph is an array of 5 strings (top -> bottom).
// "#" = filled pixel, anything else = empty. Widths can vary per glyph.

export const GLYPH_HEIGHT = 5;

export const FONT = {
  A: [".###.", "#...#", "#####", "#...#", "#...#"],
  B: ["####.", "#...#", "####.", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "####.", "#....", "#####"],
  F: ["#####", "#....", "####.", "#....", "#...."],
  G: [".####", "#....", "#.###", "#...#", ".###."],
  H: ["#...#", "#...#", "#####", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "###..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "####.", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "####.", "#..#.", "#...#"],
  S: [".####", "#....", ".###.", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  Y: ["#...#", ".#.#.", "..#..", "..#..", "..#.."],
  Z: ["#####", "...#.", "..#..", ".#...", "#####"],
  "0": [".###.", "#..##", "#.#.#", "##..#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "..##.", ".#...", "#####"],
  "3": ["####.", "....#", ".###.", "....#", "####."],
  "4": ["#..#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "####."],
  "6": [".###.", "#....", "####.", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#.."],
  "8": [".###.", "#...#", ".###.", "#...#", ".###."],
  "9": [".###.", "#...#", ".####", "....#", ".###."],
  ".": [".....", ".....", ".....", ".....", "..#.."],
  "-": [".....", ".....", ".###.", ".....", "....."],
  "!": ["..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "..##.", ".....", "..#.."],
  " ": ["...", "...", "...", "...", "..."],
};

// Convert a text string into a list of filled {col,row} cells, plus total width.
// Letters are placed in rows `topRow`..`topRow+4`. One empty column between glyphs.
export function layoutText(text, { topRow = 1, letterSpacing = 1 } = {}) {
  const cells = [];
  const glyphs = []; // [{ char, x, width }] in column units
  let x = 0;
  for (const chRaw of text) {
    const ch = chRaw.toUpperCase();
    const glyph = FONT[ch] ?? FONT[" "];
    const width = glyph[0].length;
    for (let r = 0; r < GLYPH_HEIGHT; r++) {
      for (let c = 0; c < width; c++) {
        if (glyph[r][c] === "#") {
          cells.push({ col: x + c, row: topRow + r });
        }
      }
    }
    glyphs.push({ char: ch, x, width });
    x += width + letterSpacing;
  }
  // remove trailing spacing from total width
  const width = Math.max(0, x - letterSpacing);
  return { cells, width, glyphs };
}

// Returns a Set of "col,row" keys for the text laid out with a left/top offset.
export function textCellSet(text, { topRow = 1, leftCol = 0, letterSpacing = 1 } = {}) {
  const { cells, width, glyphs } = layoutText(text, { topRow, letterSpacing });
  const set = new Set(cells.map((c) => `${c.col + leftCol},${c.row}`));
  return { set, width, glyphs };
}
