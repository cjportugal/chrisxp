/** Stationary cells; all field motion is expressed through character density. */
export interface DensityTransitionOptions {
  duration: number;
  waveStrength: number;
  waveSpeed: number;
  characters: string;
}
export const DENSITY_TRANSITION_DEFAULTS: DensityTransitionOptions = {
  duration: 4800, waveStrength: .32, waveSpeed: 1, characters: ' .:-=+*#%@',
};
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };

/** Shared continuous phases, without per-cell randomness or coordinate offsets. */
export function sampleDensity(u: number, v: number, progress: number, source: number, target: number,
  options: DensityTransitionOptions = DENSITY_TRANSITION_DEFAULTS) {
  const p = clamp(progress);
  const blend = smooth((p - .08) / .66);
  const envelope = smooth((p - .03) / .18) * (1 - smooth((p - .48) / .28));
  const time = p * options.duration * .001 * Math.max(0, options.waveSpeed);
  const wave = .65 * Math.sin(u * 7 + v * 5 - time * 2)
    + .35 * Math.cos(v * 9 - u * 3 + time * 1.3);
  return clamp(source * (1 - blend) + target * blend + wave * Math.max(0, options.waveStrength) * envelope);
}
interface Glyph {
  text: string; x: number; y: number; width: number; height: number;
  font: string; size: number; color: string;
}
interface Sprite { image: HTMLImageElement; x: number; y: number; width: number; height: number }
interface Cell { x: number; y: number; source?: Glyph; sourceLight: number; targetLight: number }

/** Host owns the animation clock, skip handling and cleanup. No listeners or timers. */
export class AsciiDensityTransition {
  readonly options: DensityTransitionOptions;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private target: HTMLImageElement;
  private glyphs: Glyph[] = [];
  private sprites: Sprite[] = [];
  private cells: Cell[] = [];
  private width = 0;
  private height = 0;
  private dpr = 0;
  private originalWidth: number;
  private originalHeight: number;
  private rect = { x: 0, y: 0, width: 0, height: 0 };
  constructor(canvas: HTMLCanvasElement, source: HTMLElement, target: HTMLImageElement, options: Partial<DensityTransitionOptions> = {}) {
    this.canvas = canvas; this.target = target;
    this.options = { ...DENSITY_TRANSITION_DEFAULTS, ...options };
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');
    this.ctx = ctx;
    const origin = canvas.getBoundingClientRect();
    this.originalWidth = origin.width; this.originalHeight = origin.height;
    const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || !node.textContent?.trim()) continue;
      const style = getComputedStyle(parent);
      if (style.display === 'none') continue;
      const range = document.createRange();
      const text = node.textContent;
      // Range measurements preserve real BIOS wrapping, spacing, and nested highlighted spans.
      for (let index = 0; index < text.length; index++) {
        if (!text[index].trim()) continue;
        range.setStart(node, index); range.setEnd(node, index + 1);
        const box = range.getBoundingClientRect();
        if (!box.width || box.right < origin.left || box.left > origin.right || box.top > origin.bottom) continue;
        this.glyphs.push({ text: text[index], x: box.left - origin.left, y: box.top - origin.top,
          width: box.width, height: box.height, size: parseFloat(style.fontSize), color: style.color,
          font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}` });
      }
    }
    source.querySelectorAll('img').forEach((image) => {
      if (!image.complete || !image.naturalWidth) return;
      const r = image.getBoundingClientRect();
      this.sprites.push({ image, x: r.left - origin.left, y: r.top - origin.top, width: r.width, height: r.height });
    });
    if (!this.glyphs.length) throw new Error('Text switch requires visible source text');
    // One persistent lattice for both contents. Occupied cells retain their measured
    // BIOS anchors, avoiding a snap when the DOM hands off to canvas.
    const first = this.glyphs[0];
    const advance = first.width;
    const lineHeight = parseFloat(getComputedStyle(source.querySelector('span') || source).lineHeight) || first.height;
    const columns = Math.ceil(origin.width / advance);
    const rows = Math.ceil(origin.height / lineHeight);
    const left = (first.x + advance / 2) % advance;
    const top = (first.y + first.height / 2) % lineHeight;
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
      this.cells.push({ x: left + col * advance, y: top + row * lineHeight, sourceLight: 0, targetLight: 0 });
    }
    const ramp = Array.from(this.options.characters);
    for (const glyph of this.glyphs) {
      const x = glyph.x + glyph.width / 2, y = glyph.y + glyph.height / 2;
      const col = Math.round((x - left) / advance), row = Math.round((y - top) / lineHeight);
      const cell = this.cells[row * (columns + 1) + col];
      if (!cell) continue;
      const index = ramp.indexOf(glyph.text);
      const entry = { x, y, source: glyph, sourceLight: index >= 0 ? index / (ramp.length - 1) : .65, targetLight: 0 };
      if (cell.source) this.cells.push(entry);
      else Object.assign(cell, entry);
    }
  }

  private prepare() {
    const box = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (!box.width || !box.height) return;
    if (box.width === this.width && box.height === this.height && dpr === this.dpr) return;
    this.width = box.width; this.height = box.height; this.dpr = dpr;
    this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(this.width / this.target.naturalWidth, this.height / this.target.naturalHeight);
    const width = this.target.naturalWidth * scale, height = this.target.naturalHeight * scale;
    this.rect = { x: (this.width - width) / 2, y: (this.height - height) / 2, width, height };
    // Sample the same contained image at each stationary cell's screen coordinate.
    const sample = document.createElement('canvas');
    sample.width = Math.ceil(this.width); sample.height = Math.ceil(this.height);
    const sc = sample.getContext('2d', { willReadFrequently: true })!;
    sc.drawImage(this.target, this.rect.x, this.rect.y, width, height);
    const pixels = sc.getImageData(0, 0, sample.width, sample.height).data;
    for (const cell of this.cells) {
      const x = Math.min(sample.width - 1, Math.max(0, Math.floor(cell.x * this.width / this.originalWidth)));
      const y = Math.min(sample.height - 1, Math.max(0, Math.floor(cell.y * this.height / this.originalHeight)));
      const i = (y * sample.width + x) * 4;
      cell.targetLight = (pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722) / 255;
    }
  }

  draw(progress: number) {
    this.prepare();
    const p = clamp(progress), ctx = this.ctx;
    const sx = this.width / this.originalWidth, sy = this.height / this.originalHeight;
    const ramp = Array.from(this.options.characters || DENSITY_TRANSITION_DEFAULTS.characters);
    ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, this.width, this.height);
    // Terminal rendering is fully opaque. Once settled, switch screens in one frame.
    if (p >= 1) {
      const r = this.rect;
      ctx.drawImage(this.target, r.x, r.y, r.width, r.height);
      return;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    // BIOS bitmap badges switch off once; they never dissolve over the text.
    if (p < .12) for (const sprite of this.sprites) {
      ctx.drawImage(sprite.image, sprite.x * sx, sprite.y * sy, sprite.width * sx, sprite.height * sy);
    }
    for (const cell of this.cells) {
      const u = cell.x / this.originalWidth, v = cell.y / this.originalHeight;
      const density = sampleDensity(u, v, p, cell.sourceLight, cell.targetLight, this.options);
      // A broad continuous front releases source letters into the density ramp.
      const release = .045 + .075 * (.5 + .5 * Math.sin(u * 4 + v * 3));
      const value = cell.source && p < release ? cell.source.text : ramp[Math.floor(density * (ramp.length - 1))];
      if (!value.trim()) continue;
      const glyph = cell.source || this.glyphs[0];
      ctx.font = glyph.font.replace(/[\d.]+px/, `${glyph.size * sy}px`);
      const metrics = ctx.measureText('M');
      const baseline = ((metrics.fontBoundingBoxAscent ?? glyph.size * sy * .8) - (metrics.fontBoundingBoxDescent ?? glyph.size * sy * .2)) / 2;
      ctx.fillStyle = glyph.color;
      ctx.fillText(value, cell.x * sx, cell.y * sy + baseline);
    }
  }
}
