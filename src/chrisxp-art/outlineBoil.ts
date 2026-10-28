// "Line boil" for the letter outlines: cells on either side of every edge step between their own glyph and a
// lighter or heavier neighbour, each on a seeded rhythm, so the borders move while the letters stay readable.

export const BOIL_TICKS_PER_SECOND = 10;

/** One step lighter, for lit cells on the inside of an edge. */
const ERODE: Record<string, string> = { '█': '▓', '▓': '▒', '▒': '░', '░': ' ', '▀': '░', '▄': '░', '▌': '░', '▐': '░' };
const SOLID = new Set(['█', '▓', '▀', '▄', '▌', '▐']);
const INSIDE_RATE = .16, OUTSIDE_RATE = .08;

interface EdgeCell { row: number; col: number; swap: string; rate: number; period: number; offset: number }

/** Repeatable per-cell noise in [0, 1). */
const noise = (a: number, b: number, c = 0) => {
  let h = Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + 0x7f4a, 0xc2b2ae35) ^ Math.imul(c + 0x1656, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};

export class OutlineBoil {
  private grid: string[][];
  private edges: EdgeCell[] = [];

  constructor(lines: string[]) {
    this.grid = lines.map(line => [...line]);
    const at = (row: number, col: number) => this.grid[row]?.[col] ?? ' ';
    const sides = (row: number, col: number) => [at(row - 1, col), at(row + 1, col), at(row, col - 1), at(row, col + 1)];
    this.grid.forEach((cells, row) => cells.forEach((char, col) => {
      const around = sides(row, col);
      let swap: string | null = null, rate = 0;
      if (char !== ' ' && around.includes(' ')) { swap = ERODE[char] ?? null; rate = INSIDE_RATE; }
      else if (char === ' ' && around.some(side => SOLID.has(side))) { swap = '░'; rate = OUTSIDE_RATE; }
      if (swap === null) return;
      this.edges.push({ row, col, swap, rate, period: 3 + Math.floor(noise(row, col, 1) * 4), offset: Math.floor(noise(row, col, 2) * 8) });
    }));
  }

  /** The artwork at `tick`, as text. */
  frame(tick: number) {
    const cells = this.grid.map(row => row.slice());
    for (const { row, col, swap, rate, period, offset } of this.edges) {
      // Each cell holds its state for a few ticks, so the outline flickers in steps rather than every frame.
      if (noise(row, col, Math.floor((tick + offset) / period)) < rate) cells[row][col] = swap;
    }
    return cells.map(row => row.join('')).join('\n');
  }
}
