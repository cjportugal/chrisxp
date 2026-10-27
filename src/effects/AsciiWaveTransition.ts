/** Applies drawField-style continuous row phasing and shading to supplied content.
 * No procedural silhouette, particle assignment, randomization, or reference-bundle imports.
 */
export interface WaveTransitionOptions { duration: number; waveStrength: number; waveSpeed: number }
export const DEFAULT_WAVE_TRANSITION: WaveTransitionOptions = { duration: 4800, waveStrength: 24, waveSpeed: 1 };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * t * (10 + t * (-15 + 6 * t)); };

/** A continuous shared displacement field. Inputs are normalized screen coordinates.
 * Strength is in CSS pixels; speed is a multiplier. Neighboring samples share phase.
 */
export function sampleContentWave(u: number, v: number, elapsedMs: number, options = DEFAULT_WAVE_TRANSITION) {
  const p = clamp(elapsedMs / options.duration);
  const envelope = ease((p - .02) / .16) * (1 - ease((p - .50) / .28));
  const strength = Math.max(0, options.waveStrength) * envelope;
  const time = Math.max(0, elapsedMs) * .001 * Math.max(0, options.waveSpeed) * 1.8;
  const rowPhase = v * Math.PI * 2.5 + time;
  const crossingPhase = (u * .7 + v * .4) * Math.PI * 2 - time * .65;
  return {
    x: strength * (.7 * Math.sin(rowPhase) + .3 * Math.sin(crossingPhase)),
    y: strength * .35 * Math.sin(u * Math.PI * 1.8 + time * .8),
    shade: 1 - Math.min(1, strength / 24) * .12 * (.5 + .5 * Math.cos(rowPhase + u * 2)),
  };
}

interface Glyph { x: number; y: number; value: string; font: string; size: number; color: string }
interface Tile { u: number; v: number; value: string; color: string }
interface Badge { image: HTMLImageElement; x: number; y: number; width: number; height: number }

/** Host owns animation/cleanup. Draw elapsed milliseconds; no timers, DOM writes, or listeners. */
export class AsciiWaveTransition {
  readonly options: WaveTransitionOptions;
  get duration() { return this.options.duration; }
  private glyphs: Glyph[] = [];
  private tiles: Tile[] = [];
  private badges: Badge[] = [];
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private image: HTMLImageElement;
  private initialWidth: number;
  private initialHeight: number;
  private width = 0;
  private height = 0;
  private dpr = 0;
  private imageRect = { x: 0, y: 0, width: 0, height: 0 };

  constructor(canvas: HTMLCanvasElement, source: HTMLElement, image: HTMLImageElement, options: Partial<WaveTransitionOptions> = {}) {
    this.canvas = canvas; this.image = image;
    this.options = { ...DEFAULT_WAVE_TRANSITION, ...options };
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');
    this.ctx = ctx;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height || !image.naturalWidth || !image.naturalHeight) throw new Error('Source and image must be ready');
    this.initialWidth = box.width; this.initialHeight = box.height;
    const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    let advance = 0, lineHeight = 0;
    while ((node = walker.nextNode())) {
      if (!node.parentElement || !node.textContent?.trim()) continue;
      const style = getComputedStyle(node.parentElement);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const range = document.createRange();
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      for (let offset = 0; offset < node.textContent.length; offset++) {
        const value = node.textContent[offset];
        if (!value.trim()) continue;
        range.setStart(node, offset); range.setEnd(node, offset + 1);
        const r = range.getBoundingClientRect();
        if (!r.width || r.right < box.left || r.left > box.right || r.bottom < box.top || r.top > box.bottom) continue;
        this.glyphs.push({ value, x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2,
          font, size: parseFloat(style.fontSize), color: style.color });
        if (!advance) { advance = r.width; lineHeight = Math.max(r.height, parseFloat(style.fontSize)); }
      }
    }
    if (!this.glyphs.length) throw new Error('No visible source characters');
    source.querySelectorAll('img').forEach((badge) => {
      if (!badge.complete || !badge.naturalWidth) return;
      const r = badge.getBoundingClientRect();
      this.badges.push({ image: badge, x: r.left - box.left, y: r.top - box.top, width: r.width, height: r.height });
    });
    this.resize();
    // Freeze topology and sample once. On resize only the shared contain rect changes.
    const cols = Math.max(1, Math.floor(this.imageRect.width / advance));
    const rows = Math.max(1, Math.floor(this.imageRect.height / lineHeight));
    const sample = document.createElement('canvas'); sample.width = cols; sample.height = rows;
    const sc = sample.getContext('2d', { willReadFrequently: true })!;
    sc.drawImage(image, 0, 0, cols, rows);
    const data = sc.getImageData(0, 0, cols, rows).data;
    const ramp = ' .:-/+*?2389ON@';
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const i = (row * cols + col) * 4;
      const light = clamp(((data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722) / 255 - .5) * 1.15 + .5);
      this.tiles.push({ u: (col + .5) / cols, v: (row + .5) / rows,
        value: ramp[Math.floor(light * (ramp.length - 1))], color: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` });
    }

  }

  private resize() {
    const box = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (!box.width || !box.height || (box.width === this.width && box.height === this.height && dpr === this.dpr)) return;
    this.width = box.width; this.height = box.height; this.dpr = dpr;
    this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(this.width / this.image.naturalWidth, this.height / this.image.naturalHeight);
    const width = this.image.naturalWidth * scale, height = this.image.naturalHeight * scale;
    this.imageRect = { x: (this.width - width) / 2, y: (this.height - height) / 2, width, height };
  }

  draw(elapsedMs: number) {
    this.resize();
    const ctx = this.ctx, r = this.imageRect;
    const sx = this.width / this.initialWidth, sy = this.height / this.initialHeight;
    const p = clamp(elapsedMs / this.duration);
    const contentMix = ease((p - .18) / .40);
    const imageMix = ease((p - .80) / .20);
    const waveOptions = { ...this.options, waveStrength: this.options.waveStrength * Math.min(1, this.width / 800) };
    const wave = (x: number, y: number) => sampleContentWave(x / this.width, y / this.height, elapsedMs, waveOptions);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, this.width, this.height);
    // Both source and destination use the same coordinate field, never independent trajectories.
    ctx.globalCompositeOperation = 'lighter';
    if (contentMix < 1) {
      for (const badge of this.badges) {
        for (let row = 0; row < 24; row++) {
          const sh = badge.image.naturalHeight / 24;
          const x = badge.x * sx, y = (badge.y + row * badge.height / 24) * sy;
          const offset = wave(x + badge.width * sx / 2, y);
          ctx.globalAlpha = (1 - contentMix) * offset.shade;
          ctx.drawImage(badge.image, 0, row * sh, badge.image.naturalWidth, sh,
            x + offset.x, y + offset.y, badge.width * sx, badge.height * sy / 24);
        }
      }
      for (const glyph of this.glyphs) {
        const x = glyph.x * sx, y = glyph.y * sy;
        const offset = wave(x, y);
        ctx.font = glyph.font.replace(/[\d.]+px/, `${glyph.size * sy}px`);
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        const metrics = ctx.measureText(glyph.value);
        const baseline = ((metrics.fontBoundingBoxAscent ?? glyph.size * sy * .8) - (metrics.fontBoundingBoxDescent ?? glyph.size * sy * .2)) / 2;
        ctx.globalAlpha = (1 - contentMix) * offset.shade;
        ctx.fillStyle = glyph.color;
        ctx.fillText(glyph.value, x + offset.x, y + offset.y + baseline);
      }
    }
    if (contentMix > 0 && imageMix < 1) {
      const font = this.glyphs[0];
      ctx.font = font.font.replace(/[\d.]+px/, `${font.size * sy}px`);
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const metrics = ctx.measureText(font.value);
      const baseline = ((metrics.fontBoundingBoxAscent ?? font.size * sy * .8) - (metrics.fontBoundingBoxDescent ?? font.size * sy * .2)) / 2;
      for (const tile of this.tiles) {
        const x = r.x + tile.u * r.width, y = r.y + tile.v * r.height;
        const offset = wave(x, y);
        ctx.globalAlpha = contentMix * (1 - imageMix) * offset.shade;
        ctx.fillStyle = tile.color;
        ctx.fillText(tile.value, x + offset.x, y + offset.y + baseline);
      }
    }
    // The wave is fully at rest before this blend. Both layers use exactly the same contain rect.
    if (imageMix > 0) { ctx.globalAlpha = imageMix; ctx.drawImage(this.image, r.x, r.y, r.width, r.height); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
}
