// Samples the chrisxp reference image into block characters, one text file per grid width,
// in src/chrisxp-art/. The page picks whichever width fills the window at a crisp font size.
// Run: node scripts/chrisxp-art.mjs <reference.png>   (macOS: uses `sips` to decode the PNG)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('usage: node scripts/chrisxp-art.mjs <reference.png>');
const bmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'chrisxp-art-')), 'reference.bmp');
execFileSync('sips', ['-s', 'format', 'bmp', source, '--out', bmp], { stdio: 'ignore' });

const buf = fs.readFileSync(bmp);
const offset = buf.readUInt32LE(10), width = buf.readInt32LE(18), rawHeight = buf.readInt32LE(22), height = Math.abs(rawHeight);
const stride = Math.ceil(width * 3 / 4) * 4;
// The artwork is black plus one light gray (about 168), so luminance becomes coverage of that gray.
const INK = 168;
const coverage = new Float32Array(width * height);
for (let y = 0; y < height; y++) {
  const row = rawHeight < 0 ? y : height - 1 - y;
  for (let x = 0; x < width; x++) {
    const i = offset + row * stride + x * 3;
    coverage[y * width + x] = Math.min(1, (buf[i] + buf[i + 1] + buf[i + 2]) / 3 / INK);
  }
}

// The VGA cell is 9x16: ▀ fills rows 0-6, ▄ rows 7-15, ▌ columns 0-3, ▐ columns 4-8.
const SPLIT_X = 4 / 9, SPLIT_Y = 7 / 16;
const SOLID = { ' ': [0, 0, 0, 0], '█': [1, 1, 1, 1], '▀': [1, 1, 0, 0], '▄': [0, 0, 1, 1], '▌': [1, 0, 1, 0], '▐': [0, 1, 0, 1] };
const SHADES = { '░': .25, '▒': .5, '▓': .75 };

const region = (x0, y0, x1, y1) => {
  let sum = 0, rough = 0, n = 0;
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(height, Math.ceil(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(width, Math.ceil(x1)); x++) {
      const v = coverage[y * width + x];
      sum += v; n++;
      // Pixel-to-pixel contrast separates the stippled dither from smooth solids and soft edges.
      if (x + 1 < width) rough += Math.abs(v - coverage[y * width + x + 1]);
      if (y + 1 < height) rough += Math.abs(v - coverage[(y + 1) * width + x]);
    }
  }
  return { mean: n ? sum / n : 0, rough: n ? rough / n : 0 };
};

const sample = (cols) => {
  const cellWidth = width / cols, cellHeight = cellWidth * 16 / 9;
  const rows = Math.round(height / cellHeight);
  const lines = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      const x0 = c * cellWidth, y0 = r * cellHeight, sx = x0 + cellWidth * SPLIT_X, sy = y0 + cellHeight * SPLIT_Y;
      const x1 = x0 + cellWidth, y1 = y0 + cellHeight;
      const quads = [region(x0, y0, sx, sy), region(sx, y0, x1, sy), region(x0, sy, sx, y1), region(sx, sy, x1, y1)];
      const whole = region(x0, y0, x1, y1);
      let best = ' ', bestError = Infinity;
      for (const [char, mask] of Object.entries(SOLID)) {
        const error = quads.reduce((sum, q, i) => sum + (q.mean - mask[i]) ** 2, 0);
        if (error < bestError) { best = char; bestError = error; }
      }
      // A textured, partly lit cell is dither in the source, so match its density with a shade glyph instead.
      if (whole.rough > .35 && whole.mean > .12 && whole.mean < .88) {
        let shadeError = Infinity, shade = '░';
        for (const [char, density] of Object.entries(SHADES)) {
          const error = quads.reduce((sum, q) => sum + (q.mean - density) ** 2, 0);
          if (error < shadeError) { shade = char; shadeError = error; }
        }
        if (shadeError < bestError) best = shade;
      }
      line += best;
    }
    lines.push(line);
  }

  return lines;
};

const outDir = path.join(import.meta.dirname, '../src/chrisxp-art');
fs.mkdirSync(outDir, { recursive: true });
for (const cols of [220, 200, 180, 160, 140, 120, 100, 80]) {
  const lines = sample(cols);
  fs.writeFileSync(path.join(outDir, `chrisxp-${cols}.txt`), `${lines.join('\n')}\n`);
  console.log(`chrisxp-${cols}.txt  ${cols}x${lines.length}`);
}
