export type AsciiSource = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;

export type AsciiField = (point: { x: number; y: number; time: number; pointer: { x: number; y: number } }) => number;

export interface AsciiOptions {
  cellSize: number;
  speed: number;
  warp: number;
  contrast: number;
  color: boolean;
  characters: string;
  foreground: string;
  background: string;
  duration: number;
}

export const ASCII_DEFAULTS: AsciiOptions = {
  cellSize: 9, speed: 0.65, warp: 1.1, contrast: 1.15, color: false,
  characters: ' .:-/+*?2389ON@', foreground: '#dce8ee', background: '#080a0c', duration: 3200,
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

/** Dependency-free ASCII field and image reveal. Time is supplied by the caller. */
export class AsciiRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  options: AsciiOptions;
  image: AsciiSource | null = null;
  private sourceWidth = 0;
  private sourceHeight = 0;
  private field: AsciiField | null = null;
  private sample = document.createElement('canvas');
  private pixels = new Uint8ClampedArray();
  private columns = 0;
  private rows = 0;
  private width = 0;
  private height = 0;
  private cell = 0;
  private cellHeight = 0;
  private imageRect = { x: 0, y: 0, width: 0, height: 0 };

  constructor(canvas: HTMLCanvasElement, options: Partial<AsciiOptions> = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Canvas is unavailable');
    this.ctx = ctx;
    this.options = { ...ASCII_DEFAULTS, ...options };
  }

  setImage(image: HTMLImageElement) {
    this.setSource(image);
  }

  /** Images must be loaded; videos must have metadata. Canvas sources may contain any drawing. */
  setSource(source: AsciiSource) {
    this.image = source;
    this.sourceWidth = source instanceof HTMLVideoElement ? source.videoWidth : source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    this.sourceHeight = source instanceof HTMLVideoElement ? source.videoHeight : source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    this.width = 0;
  }

  /** Call after changing a canvas or advancing video to refresh luminance samples. */
  refreshSource() { this.width = 0; }

  /** Supply any normalized brightness field (0–1); null restores the flowing ribbon. */
  setField(field: AsciiField | null) { this.field = field; }

  configure(options: Partial<AsciiOptions>) {
    this.options = { ...this.options, ...options };
  }

  private resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    const cell = Math.max(5, this.options.cellSize);
    if (!width || !height) return false;
    if (width === this.width && height === this.height && cell === this.cell) return true;
    this.width = width;
    this.height = height;
    this.cell = cell;
    this.cellHeight = cell * 1.5;
    this.columns = Math.ceil(width / cell);
    this.rows = Math.ceil(height / this.cellHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.sample.width = this.columns;
    this.sample.height = this.rows;
    const sample = this.sample.getContext('2d', { willReadFrequently: true })!;
    sample.fillStyle = '#000';
    sample.fillRect(0, 0, this.columns, this.rows);
    if (this.image && this.sourceWidth && this.sourceHeight) {
      const scale = Math.min(width / this.sourceWidth, height / this.sourceHeight);
      const iw = this.sourceWidth * scale;
      const ih = this.sourceHeight * scale;
      this.imageRect = { x: (width - iw) / 2, y: (height - ih) / 2, width: iw, height: ih };
      sample.drawImage(this.image, (width - iw) / 2 / cell, (height - ih) / 2 / this.cellHeight, iw / cell, ih / this.cellHeight);
    }
    this.pixels = sample.getImageData(0, 0, this.columns, this.rows).data;
    return true;
  }

  draw(time: number, mode: 'flow' | 'image' | 'reveal' = 'flow', progress = 0, pointer = { x: 0.5, y: 0.5 }) {
    if (!this.resize()) return;
    const ctx = this.ctx;
    const o = this.options;
    const p = clamp(progress);
    const t = Math.floor(time * 0.001 * 12) / 12 * o.speed;
    const chars = Array.from(o.characters || ASCII_DEFAULTS.characters);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalAlpha = mode === 'reveal' ? smooth(0, 0.12, p) : 1;
    ctx.fillStyle = o.background;
    ctx.fillRect(0, 0, this.width, this.height);
    const layerAlpha = ctx.globalAlpha;
    ctx.font = `${this.cellHeight * 0.92}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const { x: ix, y: iy, width: iw, height: ih } = this.imageRect;
    if (mode === 'reveal' && p >= 1 && this.image) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.drawImage(this.image, ix, iy, iw, ih);
      return;
    }
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const x = col * this.cell;
        const y = row * this.cellHeight;
        const u = (x + this.cell / 2) / this.width;
        const v = (y + this.cellHeight / 2) / this.height;
        const nx = (u - 0.5) * 2;
        const ny = (v - 0.5) * 2;
        const bend = Math.sin(ny * 3.8 + t * 0.7) * 0.2 * o.warp + (pointer.x - 0.5) * 0.35;
        const neck = 0.05 + Math.pow(Math.sin(ny * 3.3 - t * 0.4), 2) * 0.48;
        const ribbon = 1 - smooth(neck - 0.035, neck + 0.035, Math.abs(nx - bend));
        const waves = 0.5 + 0.5 * Math.sin((nx - bend) * 15 / (neck + 0.25) + ny * 3 + t * 2);
        const field = this.field ? clamp(this.field({ x: u, y: v, time: t, pointer })) : ribbon * (0.12 + 0.88 * waves);
        const index = (row * this.columns + col) * 4;
        const r = this.pixels[index], g = this.pixels[index + 1], b = this.pixels[index + 2];
        const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
        const morph = mode === 'image' ? 1 : mode === 'reveal' ? smooth(0.14, 0.48, p) : 0;
        let value = field * (1 - morph) + luminance * morph;
        value = clamp((value - 0.5) * o.contrast + 0.5);
        const noise = hash(col, row);
        const distance = Math.hypot((u - 0.5) * 1.2, v - 0.48);
        const threshold = 0.43 + distance * 0.43 + noise * 0.13;
        const resolved = mode === 'reveal' ? smooth(threshold, threshold + 0.16, p) : 0;
        // Sample the original at each tile so the final frame remains perfectly aligned.
        if (resolved > 0 && this.image && x + this.cell > ix && x < ix + iw && y + this.cellHeight > iy && y < iy + ih) {
          const dx = Math.max(x, ix), dy = Math.max(y, iy);
          const dw = Math.min(x + this.cell, ix + iw) - dx;
          const dh = Math.min(y + this.cellHeight, iy + ih) - dy;
          ctx.globalAlpha = resolved;
          ctx.drawImage(this.image, (dx - ix) / iw * this.sourceWidth, (dy - iy) / ih * this.sourceHeight,
            dw / iw * this.sourceWidth, dh / ih * this.sourceHeight, dx, dy, dw + 0.2, dh + 0.2);
        }
        if (resolved >= 1 || value < 0.035) continue;
        const flicker = mode === 'reveal' ? (1 - morph) * Math.sin(t * 12 + noise * 30) * 0.1 : 0;
        const char = chars[Math.floor(clamp(value + flicker) * (chars.length - 1))];
        ctx.globalAlpha = layerAlpha * (1 - resolved);
        ctx.fillStyle = o.color && morph > 0.3 ? `rgb(${r},${g},${b})` : o.foreground;
        ctx.fillText(char, x + this.cell / 2, y + this.cellHeight / 2);
      }
    }
    ctx.globalAlpha = 1;
  }
}
