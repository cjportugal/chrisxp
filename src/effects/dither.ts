/** Ordered (Bayer) dithering of RGBA pixel data to a fixed palette. Pure: no DOM, no canvas.
 * Each pixel is nudged by its cell's threshold before snapping to the nearest palette color, so flat
 * gradients break into the 1-bit checker patterns of a System 1 desktop instead of banding.
 */
export type RGB = readonly [number, number, number];

export interface DitherOptions {
  matrix?: 'bayer4' | 'bayer8';
  /** 0 disables the threshold offset (plain posterize); 1 is the full Bayer spread. */
  strength?: number;
}

export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Classic 8x8 Bayer matrix, built from the 4x4 by the recursive rule M2n = [[4M, 4M+2],[4M+3, 4M+1]]. */
const BAYER8 = Array.from({ length: 8 }, (_, y) =>
  Array.from({ length: 8 }, (_, x) => {
    const base = BAYER4[y % 4][x % 4] * 4;
    const quadrant = (y >= 4 ? 2 : 0) + (x >= 4 ? 1 : 0);
    return base + [0, 2, 3, 1][quadrant];
  })
);

/** Threshold matrices normalized to the range (-0.5, 0.5). */
const MATRICES = {
  bayer4: BAYER4.map((row) => row.map((v) => (v + 0.5) / 16 - 0.5)),
  bayer8: BAYER8.map((row) => row.map((v) => (v + 0.5) / 64 - 0.5)),
};

/** How far (in 8-bit units) a full-strength threshold moves a channel before snapping. */
const SPREAD = 112;

export const WALLPAPER_PALETTE: RGB[] = [
  [0x10, 0x10, 0x10], // ink
  [0xf2, 0xf1, 0xea], // paper
  [0x3f, 0xc1, 0xff], // cyan
  [0x1b, 0x45, 0xc9], // blue
];

/** Milkdrop in the OS palette: the wallpaper colors plus magenta so the visualizer pops. */
export const VIS_PALETTE: RGB[] = [
  [0x10, 0x10, 0x10], // ink
  [0xf2, 0xf1, 0xea], // paper
  [0x3f, 0xc1, 0xff], // cyan
  [0x1b, 0x45, 0xc9], // blue
  [0xff, 0x4f, 0xd8], // magenta
];

/** The wallpaper as seen through the dock's frosted glass: no ink, so shadows fall to blue. */
export const GLASS_PALETTE: RGB[] = [
  [0xf2, 0xf1, 0xea], // paper
  [0x3f, 0xc1, 0xff], // cyan
  [0x1b, 0x45, 0xc9], // blue
];

/** An SVG data URL, `width` cells wide, where cell (x, y) is filled with `color` when its 4x4 Bayer
 * threshold falls under `density(y)`. Tile it with image-rendering: pixelated for a 1-bit fade.
 */
export function bayerRampSvg(width: number, height: number, color: string, density: (y: number) => number): string {
  const cells: string[] = [];
  for (let y = 0; y < height; y++) {
    const level = density(y);
    for (let x = 0; x < width; x++) {
      if ((BAYER4[y % 4][x % 4] + 0.5) / 16 < level) cells.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" shape-rendering="crispEdges"><path fill="${color}" d="${cells.join('')}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function nearestColor(r: number, g: number, b: number, palette: readonly RGB[]): RGB {
  let best = palette[0];
  let bestDistance = Infinity;
  for (const color of palette) {
    const dr = r - color[0];
    const dg = g - color[1];
    const db = b - color[2];
    // Weighted RGB distance: the eye is most sensitive to green, least to blue.
    const distance = dr * dr * 2 + dg * dg * 4 + db * db * 3;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = color;
    }
  }
  return best;
}

export function ditherImageData(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  palette: readonly RGB[],
  opts: DitherOptions = {}
): Uint8ClampedArray<ArrayBuffer> {
  if (palette.length === 0) throw new Error('ditherImageData needs at least one palette color');
  const matrix = MATRICES[opts.matrix ?? 'bayer8'];
  const size = matrix.length;
  const strength = opts.strength ?? 1;
  const out = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    const row = matrix[y % size];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const offset = row[x % size] * SPREAD * strength;
      const color = nearestColor(src[i] + offset, src[i + 1] + offset, src[i + 2] + offset, palette);
      out[i] = color[0];
      out[i + 1] = color[1];
      out[i + 2] = color[2];
      out[i + 3] = 255;
    }
  }

  return out;
}
