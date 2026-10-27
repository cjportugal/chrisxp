/** The ChrisXP splash mark as block characters: a waving four-pane flag over "Chris xp".
 * Polygons are filled onto a fixed pixel grid, then every two pixel rows fold into one text row of ▀ ▄ █ ░ ▒.
 * Every cell also records which part drew it (0 the flag, 1-7 the letters C h r i s x p), so the letters
 * can be shown one at a time. Edit the polygons to change the artwork; the output is deterministic.
 */
const COLS = 124, PIXEL_ROWS = 80;
type Point = [number, number];

function render() {
  const grid = Array.from({ length: PIXEL_ROWS }, () => Array<number>(COLS).fill(0));
  const owners = Array.from({ length: PIXEL_ROWS }, () => Array<number>(COLS).fill(0));
  let part = 0;
  const polygon = (points: Point[], tone = 3) => {
    for (let y = 0; y < PIXEL_ROWS; y++) for (let x = 0; x < COLS; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [ax, ay] = points[i], [bx, by] = points[j];
        if ((ay > y + .5) !== (by > y + .5) && x + .5 < (bx - ax) * (y + .5 - ay) / (by - ay) + ax) inside = !inside;
      }
      if (inside) { grid[y][x] = tone; owners[y][x] = part; }
    }
  };

  // Four connected flag panes. The uninterrupted outer edge has no notch.
  polygon([[57, 5], [67, 3], [77, 4], [88, 9], [81, 31], [71, 26], [62, 25], [49, 27]], 3);
  polygon([[59, 8], [66, 6], [68, 6], [64, 15], [55, 16]], 1);
  polygon([[71, 6], [77, 7], [84, 10], [80, 18], [67, 15]], 2);
  polygon([[54, 19], [63, 18], [60, 23], [53, 24]], 2);
  polygon([[66, 18], [79, 21], [77, 27], [63, 23]], 1);
  // Dissolving trail, aligned to a coarse text grid.
  for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) {
    const x = 34 + col * 5 - row * 2, y = 4 + row * 5 + col;
    const size = col < 2 ? 2 : 3;
    polygon([[x, y], [x + size, y], [x + size - 1, y + 3], [x - 1, y + 3]], col === 0 ? 1 : 3);
  }

  // Custom angular lettering, with stepped terminals and an oversized initial C.
  // C
  part = 1;
  polygon([[18, 34], [27, 38], [31, 45], [27, 50], [23, 45], [22, 40], [17, 39], [12, 45], [11, 62], [16, 69], [23, 68], [28, 62], [31, 65], [25, 73], [16, 77], [8, 71], [5, 62], [7, 45], [12, 38]], 3);
  polygon([[11, 46], [13, 44], [12, 62], [14, 66], [11, 64], [9, 60]], 1);
  polygon([[8, 69], [7, 76], [4, 79], [5, 72]], 2);
  // h
  part = 2;
  polygon([[34, 36], [39, 39], [37, 51], [42, 47], [48, 49], [51, 54], [48, 69], [51, 73], [44, 74], [42, 71], [45, 56], [42, 53], [37, 56], [34, 71], [30, 74], [28, 70]], 3);
  polygon([[33, 44], [35, 44], [31, 66], [30, 66]], 1);
  // r
  part = 3;
  polygon([[53, 49], [59, 51], [63, 48], [69, 49], [72, 53], [67, 58], [64, 54], [61, 54], [58, 58], [55, 70], [59, 74], [50, 74], [49, 69]], 3);
  polygon([[53, 58], [55, 57], [52, 69], [51, 70]], 1);
  // i
  part = 4;
  polygon([[74, 40], [79, 43], [75, 47], [71, 44]], 3);
  polygon([[72, 51], [78, 49], [74, 68], [78, 72], [72, 75], [67, 71]], 3);
  polygon([[71, 58], [73, 56], [70, 69], [69, 68]], 1);
  // s
  part = 5;
  polygon([[84, 49], [94, 48], [99, 52], [95, 57], [92, 53], [85, 54], [82, 58], [91, 60], [95, 64], [93, 70], [86, 75], [77, 74], [75, 70], [80, 66], [83, 70], [88, 69], [90, 66], [80, 64], [77, 60], [79, 53]], 3);
  polygon([[80, 55], [82, 54], [80, 59], [79, 59]], 1);
  // Smaller lowercase xp; keep the crooked, lowered character of the original 95.
  // x: uneven crossed strokes and stepped terminals.
  part = 6;
  polygon([[99, 63], [103, 64], [105, 67], [108, 62], [111, 63], [107, 69], [110, 74], [106, 75], [104, 72], [101, 76], [98, 74], [102, 69]], 3);
  // p: an angular bowl and an off-kilter descending stem.
  part = 7;
  polygon([[113, 63], [116, 64], [119, 62], [123, 65], [122, 71], [118, 74], [115, 73], [114, 79], [110, 79]], 3);
  polygon([[117, 66], [120, 66], [119, 70], [116, 70]], 0);

  // Sparse edge dithering, attached to the letter edges rather than a backdrop.
  for (let y = 37; y < 77; y += 2) for (let x = 4; x < 100; x++) {
    if (grid[y][x] === 3 && grid[y][x - 1] === 0 && (x + y) % 5 === 0) { grid[y][x - 1] = 1; owners[y][x - 1] = owners[y][x]; }
  }

  const parts: number[][] = [];
  for (let y = 0; y < PIXEL_ROWS; y += 2) parts.push(grid[y].map((a, x) => a ? owners[y][x] : owners[y + 1][x]));
  return { grid, lines: fold(grid), parts };
}

/** Folds pixel rows in pairs into text rows. */
function fold(grid: number[][]) {
  const shades = [' ', '░', '▒', '█'];
  const lines: string[] = [];
  for (let y = 0; y + 1 < grid.length; y += 2) {
    let line = '';
    for (let x = 0; x < COLS; x++) {
      const a = grid[y][x], b = grid[y + 1][x];
      line += a && b ? shades[Math.max(a, b)] : a ? '▀' : b ? '▄' : ' ';
    }
    lines.push(line);
  }
  return lines;
}

const { grid, lines, parts } = render();
export const CHRIS95_ART = lines;
export const CHRIS95_COLS = COLS;
export const CHRIS95_ROWS = lines.length;
export const CHRIS95_LETTERS = 7;

// The flag owns the top pixel rows on its own, so it can ripple without touching the letters.
const FLAG_PIXEL_ROWS = 34, FLAG_LEFT = 25, FLAG_RIGHT = 88;
export const CHRIS95_FLAG_FRAMES = 16;
/** A wave runs left to right through the flag, growing toward the free edge; each column shifts up to 2px. */
const FLAG_FRAMES = Array.from({ length: CHRIS95_FLAG_FRAMES }, (_, frame) => {
  const flag = grid.slice(0, FLAG_PIXEL_ROWS);
  const shifted = flag.map((row, y) => row.map((_, x) => {
    const reach = Math.max(0, (x - FLAG_LEFT) / (FLAG_RIGHT - FLAG_LEFT));
    const lift = Math.round(2 * reach * Math.sin(2 * Math.PI * (x / 40 - frame / CHRIS95_FLAG_FRAMES)));
    return flag[y - lift]?.[x] ?? 0;
  }));
  return fold(shifted);
});

/** The artwork with only the flag and the first `letters` letters drawn; every row keeps its full width.
 * Given a `flagFrame`, the flag is drawn mid-ripple instead of at rest. */
export function chris95Typed(letters: number, flagFrame?: number) {
  const typed = letters >= CHRIS95_LETTERS ? lines
    : lines.map((line, row) => [...line].map((char, col) => parts[row][col] <= letters ? char : ' ').join(''));
  if (flagFrame === undefined) return typed;
  const flag = FLAG_FRAMES[flagFrame % CHRIS95_FLAG_FRAMES];
  return typed.map((line, row) => flag[row] ?? line);
}

/** First and last column each letter occupies, indexed 1-7. */
export const CHRIS95_LETTER_SPANS = Array.from({ length: CHRIS95_LETTERS + 1 }, (_, letter) => {
  const cols = parts.flatMap((row, r) => row.flatMap((part, col) => part === letter && lines[r][col] !== ' ' ? [col] : []));
  return { left: Math.min(...cols), right: Math.max(...cols) };
});
