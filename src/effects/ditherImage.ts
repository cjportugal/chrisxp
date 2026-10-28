/** Browser side of the dither: load an image, shrink it, dither it, hand back a PNG data URL.
 * The result is meant to be shown scaled back up with image-rendering: pixelated, so each source
 * pixel becomes a visible block. Results are cached per (url, scale, palette, matrix).
 */
import { ditherImageData, WALLPAPER_PALETTE } from './dither';
import type { DitherOptions, RGB } from './dither';

export interface DitherImageOptions extends DitherOptions {
  /** Downsample factor applied to the source before dithering. 1/3 turns a 1400px photo into ~466px. */
  scale?: number;
  palette?: readonly RGB[];
}

const cache = new Map<string, Promise<string>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image ${url}`));
    image.src = url;
  });
}

async function render(url: string, opts: DitherImageOptions): Promise<string> {
  const image = await loadImage(url);
  const scale = opts.scale ?? 1 / 3;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2d canvas unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  const source = ctx.getImageData(0, 0, width, height);
  const pixels = ditherImageData(source.data, width, height, opts.palette ?? WALLPAPER_PALETTE, opts);
  ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
  return canvas.toDataURL('image/png');
}

export function ditherUrlToDataUrl(url: string, opts: DitherImageOptions = {}): Promise<string> {
  const palette = opts.palette ?? WALLPAPER_PALETTE;
  const key = [url, opts.scale ?? 1 / 3, opts.matrix ?? 'bayer8', opts.strength ?? 1, palette.flat().join(',')].join('|');
  let pending = cache.get(key);
  if (!pending) {
    pending = render(url, opts).catch((error: unknown) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, pending);
  }
  return pending;
}

/** Decode a data URL into the browser's image cache so the first paint is instant. */
export async function warmImage(dataUrl: string): Promise<void> {
  try {
    await loadImage(dataUrl).then((image) => image.decode());
  } catch {
    // Decoding is a performance nicety; the <img> will still load on its own.
  }
}
