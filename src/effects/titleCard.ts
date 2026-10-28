/** The startup title card, set like an Evangelion episode card and drawn as 1-bit pixel art: CHRISXP /
 * OPERATING / SYSTEM top left, then low on the screen LOADING and a cell progress bar indented under it. All is
 * painted in greys on the splash's low-res grid, then ordered-dithered to white dots, so the words fade from
 * solid at the top to a dot screen at the foot, like an 80s title screen.
 */
import { BOOT_LOADER_PALETTE } from './TextSwitchTransition';

export interface TitleCardWords {
  chrisxp: HTMLImageElement;
  operating: HTMLImageElement;
  system: HTMLImageElement;
  loading: HTMLImageElement;
  paused: HTMLImageElement;
}

export interface TitleCardState {
  /** 0-1. */
  progress: number;
  /** How far the shimmer along the filled cells has stepped. */
  shimmer: number;
  /** Show PAUSED in place of LOADING. */
  paused: boolean;
}

/** Card unit: the Evangelion card is 100 units wide; ours is set at this share of that, smaller on the screen. */
const SCALE = 0.85;
const BAR_CELLS = 16;
const SHIMMER_PERIOD = 16;
/** Pixels at least this covered (of 255) are drawn: under half, so the condensed words' hairlines survive. */
const COVERAGE = 80;
/** Bayer 4x4 thresholds, 0-1. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Paint `draw` in the vertical fade: white at `top`, dimmer by `bottom`. */
function faded(ctx: CanvasRenderingContext2D, top: number, bottom: number, x: number, width: number, draw: () => void) {
  draw();
  const fade = ctx.createLinearGradient(0, top, 0, bottom);
  fade.addColorStop(0, '#fff');
  fade.addColorStop(1, '#8a8a8a');
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = fade;
  ctx.fillRect(x, top, width, bottom - top);
  ctx.restore();
}

/** Turn grey coverage into 1-bit dots: solid enough pixels become white or nothing by the Bayer screen. */
function dither(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const on = data[i + 3] >= COVERAGE && data[i] / 255 > BAYER[(x & 3) | ((y & 3) << 2)];
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = on ? 255 : 0;
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** Draw the card onto a canvas `width` x `height` grid pixels (see splashGrid). */
export function drawTitleCard(ctx: CanvasRenderingContext2D, width: number, height: number, words: TitleCardWords, state: TitleCardState) {
  ctx.clearRect(0, 0, width, height);
  const u = Math.min(width / 100, height / 75) * SCALE;
  const left = Math.round(width * 0.05);
  let y = Math.round(height * 0.1);

  const word = (image: HTMLImageElement, wordHeight: number) => {
    const h = Math.round(wordHeight * u);
    const w = Math.round((h * image.naturalWidth) / Math.max(1, image.naturalHeight));
    if (image.complete && image.naturalWidth) faded(ctx, y, y + h, left, w, () => ctx.drawImage(image, left, y, w, h));
    y += h;
  };
  word(words.chrisxp, 9.8);
  y += Math.round(0.5 * u);
  word(words.operating, 9.8);
  y += Math.round(1.5 * u);
  word(words.system, 15.4);

  // Low on the screen, where the card has its episode number: the label, then the bar.
  y = Math.round(height * 0.66);
  word(state.paused ? words.paused : words.loading, 6.2);
  y += Math.round(2.4 * u);

  // The bar: one rect per cell, in the old loader's greys, which the dither turns into dot densities.
  const cellWidth = Math.max(2, Math.round((59 * u) / BAR_CELLS));
  const cellHeight = Math.max(3, Math.round(6.6 * u));
  const barLeft = left + Math.round(30.6 * u);
  const filled = state.progress * BAR_CELLS;
  for (let cell = 0; cell < BAR_CELLS; cell++) {
    const x = barLeft + cell * cellWidth;
    let color = '#2a2a2a';
    let fraction = 1;
    if (cell < Math.ceil(filled)) {
      const position = (((cell - state.shimmer) % SHIMMER_PERIOD) + SHIMMER_PERIOD) % SHIMMER_PERIOD;
      color = BOOT_LOADER_PALETTE[Math.floor(position / 2)];
      fraction = Math.min(1, filled - cell);
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, y, cellWidth - 1, cellHeight);
    // The leading cell fills in from the left.
    if (fraction < 1) {
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(x + Math.round((cellWidth - 1) * fraction), y, cellWidth - 1 - Math.round((cellWidth - 1) * fraction), cellHeight);
    }
  }

  dither(ctx, width, height);
}
