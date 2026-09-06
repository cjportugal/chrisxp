/** A small software framebuffer with stuck address/data bits, inspired by bent PS1 VRAM.
 * All corruption comes from the source pixels. There are no overlay particles or noise layers.
 */
export interface FramebufferBendOptions {
  duration: number;
  strength: number;
  cadence: number;
}
export const FRAMEBUFFER_BEND_DEFAULTS: FramebufferBendOptions = {
  duration: 1200, strength: .78, cadence: 200,
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Mutate texture address and RGB555 data bits in sustained banks, not random per-frame noise. */
export function bendFramebuffer(source: Uint8ClampedArray, width: number, height: number,
  bank: number, strength: number): Uint8ClampedArray<ArrayBuffer> {
  const output = new Uint8ClampedArray(source);
  const amount = clamp(strength);
  if (!amount) return output;
  const mode = ((bank % 4) + 4) % 4;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const dest = (y * width + x) * 4;
    // Large memory regions retain the same fault for a whole bank interval.
    const page = x >> 4;
    const active = ((page * 13 + mode * 7) % 19) / 19 < amount;
    if (!active) continue;
    let sx = x, sy = y;
    if (mode === 0 || mode === 2) {
      // Collapsed texture coordinates stretch short runs into vertical ribs.
      sx = (x & ~31) + ((x >> 1) & 7) + (mode === 2 ? 16 : 0);
      sy = mode === 0 ? (y & ~63) + (y & 15) : (y & ~31) + 12;
    } else if (mode === 1) {
      // Address-line aliasing reuses small texture pages, keeping hard source edges.
      sx = x ^ 16;
      sy = (y & ~31) + ((y >> 1) & 15);
    } else {
      sx = (x & ~15) + (x & 3);
      sy = y ^ 8;
    }
    // Held address jumps relocate the corrupted image abruptly, with wraparound.
    const dx = [48, -80, 96, -32][mode];
    const dy = [24, -32, -56, 64][mode];
    const rowJump = ((y >> 5) & 1) ? 24 : -24;
    sx += Math.round((dx + rowJump) * amount * width / 320);
    sy += Math.round(dy * amount * height / 240);
    sx = ((sx % width) + width) % width;
    sy = ((sy % height) + height) % height;
    const src = (sy * width + sx) * 4;
    let r = source[src] >> 3, g = source[src + 1] >> 3, b = source[src + 2] >> 3;
    const light = (source[dest] + source[dest + 1] + source[dest + 2]) / 3;
    // Palette faults follow source contours, so the flag/lettering survive the corruption.
    const edgeMask = light < 85 ? 0 : 1;
    if (mode === 0) { r = (r & 23) | (edgeMask * 8); g = (g ^ 8) & 23; b |= edgeMask * 16; }
    if (mode === 1) { r ^= 16; g |= 16; b ^= 8; }
    if (mode === 2) { r |= edgeMask * 24; g |= edgeMask * 16; b = (b ^ 16) | (edgeMask * 8); }
    if (mode === 3) { r &= 23; g ^= 16; b |= 16; }
    // A few texture pages interpret low pixel bits as a repeating checker pattern.
    if ((source[dest + 1] & 48) === 32 && light < 190 && ((x ^ y) & 1)) { r ^= 8; g ^= 16; b ^= 8; }
    // Blue-screen palette banks: deep cobalt fields with pale corrupted lettering.
    const sourceLight = (source[src] + source[src + 1] + source[src + 2]) / 3;
    if (mode === 0 || mode === 2) {
      const pale = sourceLight > 195;
      r = pale ? 24 : r & 3;
      g = pale ? 27 : g & 7;
      b = pale ? 31 : 20 + (b & 7);
    } else {
      r &= 15;
      g &= mode === 1 ? 15 : 23;
      b |= 24;
    }
    output[dest] = r * 255 / 31;
    output[dest + 1] = g * 255 / 31;
    output[dest + 2] = b * 255 / 31;
  }
  return output;
}

/** Host supplies time and owns resize, reduced motion and animation cleanup. */
export class FramebufferBend {
  readonly options: FramebufferBendOptions;
  private canvas: HTMLCanvasElement;
  private buffer: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private source: Uint8ClampedArray;
  private lastBank = -1;
  private width = 0;
  private height = 0;
  private dpr = 0;

  constructor(canvas: HTMLCanvasElement, image: HTMLImageElement, options: Partial<FramebufferBendOptions> = {}) {
    this.canvas = canvas;
    this.options = { ...FRAMEBUFFER_BEND_DEFAULTS, ...options };
    this.buffer = document.createElement('canvas');
    this.buffer.width = 320;
    this.buffer.height = Math.round(320 * image.naturalHeight / image.naturalWidth);
    const context = this.buffer.getContext('2d');
    if (!context) throw new Error('Framebuffer unavailable');
    this.context = context;
    context.drawImage(image, 0, 0, this.buffer.width, this.buffer.height);
    this.source = context.getImageData(0, 0, this.buffer.width, this.buffer.height).data;
  }

  draw(elapsed: number) {
    const box = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resized = box.width !== this.width || box.height !== this.height || dpr !== this.dpr;
    // Corruption jumps between held banks, then the host restores the live desktop.
    const step = Math.floor(elapsed / this.options.cadence);
    const bank = step % 4;
    if (!resized && bank === this.lastBank) return;
    if (bank !== this.lastBank) {
      const pixels = bendFramebuffer(this.source, this.buffer.width, this.buffer.height, bank, this.options.strength);
      this.context.putImageData(new ImageData(pixels, this.buffer.width, this.buffer.height), 0, 0);
      this.lastBank = bank;
    }
    this.width = box.width; this.height = box.height; this.dpr = dpr;
    if (resized) {
      this.canvas.width = Math.round(box.width * dpr); this.canvas.height = Math.round(box.height * dpr);
    }
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.buffer, 0, 0, box.width, box.height);
  }
}
