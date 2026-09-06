import { ASCII_DEFAULTS, type AsciiOptions } from './AsciiRenderer';

export type TextSwitchOptions = Pick<AsciiOptions, 'cellSize' | 'color' | 'foreground' | 'contrast' | 'characters' | 'duration'> & { refreshRate: number; sizeMode: 'preserve' | 'stepped'; separateBootStrip: boolean };
export const TEXT_SWITCH_DEFAULTS: TextSwitchOptions = {
  cellSize: 9, color: true, foreground: '#dce8ee', contrast: 1.15,
  characters: ASCII_DEFAULTS.characters, duration: 4800, refreshRate: 10, sizeMode: 'preserve', separateBootStrip: false,
};

interface Glyph {
  text: string; x: number; y: number; width: number; height: number;
  font: string; size: number; color: string;
}
interface Sprite { image: HTMLImageElement; x: number; y: number; width: number; height: number }
interface Cell { x: number; y: number; char: string; color: string; light: number; seed: number }
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const hash = (i: number) => { const n = Math.sin(i * 127.1 + 78.233) * 43758.5453; return n - Math.floor(n); };

/** Fixed-position glyph switching: no movement, interpolation, scaling animation, or fades. */
export class TextSwitchTransition {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private target: HTMLImageElement;
  private glyphs: Glyph[] = [];
  private sprites: Sprite[] = [];
  private cells: Cell[] = [];
  private cellWidth = 0;
  private cellHeight = 0;
  private fontSize = 0;
  private width = 0;
  private height = 0;
  private originalWidth: number;
  private originalHeight: number;
  private rect = { x: 0, y: 0, width: 0, height: 0 };
  options: TextSwitchOptions;

  constructor(canvas: HTMLCanvasElement, source: HTMLElement, target: HTMLImageElement, options: Partial<TextSwitchOptions> = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable');
    this.ctx = ctx;
    this.target = target;
    this.options = { ...TEXT_SWITCH_DEFAULTS, ...options };
    const origin = canvas.getBoundingClientRect();
    this.originalWidth = origin.width;
    this.originalHeight = origin.height;
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
  }

  private prepare(progress: number) {
    const box = this.canvas.getBoundingClientRect();
    const source = this.glyphs[0];
    const sourceSize = source.size * box.height / this.originalHeight;
    const sourceAdvance = source.width * box.width / this.originalWidth;
    const finalSize = Math.min(sourceSize, Math.max(6, this.options.cellSize) * 1.5 * .92);
    // Four held size changes, after the incoming grid has established the source typography.
    const step = this.options.sizeMode === 'stepped'
      ? [.50, .58, .66, .74].filter((at) => progress >= at).length : 0;
    const fontSize = step === 0 ? sourceSize : Math.round(sourceSize + (finalSize - sourceSize) * step / 4);
    const cellWidth = sourceAdvance * fontSize / sourceSize;
    const cellHeight = Math.max(source.height * box.height / this.originalHeight, sourceSize) * fontSize / sourceSize;
    if (box.width === this.width && box.height === this.height && fontSize === this.fontSize) return;
    this.fontSize = fontSize;
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
    this.width = box.width; this.height = box.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr); this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(this.width / this.target.naturalWidth, this.height / this.target.naturalHeight);
    const width = this.target.naturalWidth * scale, height = this.target.naturalHeight * scale;
    this.rect = { x: (this.width - width) / 2, y: (this.height - height) / 2, width, height };
    const cell = this.cellWidth, ch = this.cellHeight;
    const cols = Math.ceil(width / cell), rows = Math.ceil(height / ch);
    const sample = document.createElement('canvas'); sample.width = cols; sample.height = rows;
    const sc = sample.getContext('2d')!; sc.drawImage(this.target, 0, 0, cols, rows);
    const pixels = sc.getImageData(0, 0, cols, rows).data;
    const chars = Array.from(this.options.characters || ASCII_DEFAULTS.characters);
    this.cells = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const light = clamp(((pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722) / 255 - .5) * this.options.contrast + .5);
      this.cells.push({ x: this.rect.x + x * cell, y: this.rect.y + y * ch,
        char: chars[Math.floor(light * (chars.length - 1))], color: `rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]})`, light, seed: hash(y * cols + x) });
    }
  }

  draw(progress: number) {
    const overall = clamp(progress);
    const ctx = this.ctx;
    const ticks = Math.max(1, this.options.duration / 1000 * this.options.refreshRate);
    const tick = Math.floor(clamp(progress) * ticks);
    const p = progress >= 1 ? 1 : tick / ticks;
    this.prepare(p);
    const cell = this.cellWidth, ch = this.cellHeight;
    const sx = this.width / this.originalWidth, sy = this.height / this.originalHeight;
    const ramp = Array.from(this.options.characters.trim() || ASCII_DEFAULTS.characters.trim());
    const sourceCell = this.glyphs[0].width * sx;
    const sourceRow = this.glyphs[0].height * sy;
    // Shared spatial schedule connects the departing BIOS and arriving image at each location.
    const switchAt = (x: number, y: number) => {
      const band = Math.floor(y / (sourceRow * 3));
      const block = Math.floor(x / (sourceCell * 6));
      return .20 + y / this.height * .19 + x / this.width * .045 + hash(band * 181 + block) * .07;
    };
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, this.width, this.height);
    ctx.imageSmoothingEnabled = false;
    // Badges switch off in their existing tiles, without dispersing or fading.
    for (const sprite of this.sprites) {
      for (let row = 0; row < 8; row++) for (let col = 0; col < 10; col++) {
        const x = (sprite.x + col * sprite.width / 10) * sx;
        const y = (sprite.y + row * sprite.height / 8) * sy;
        if (p >= switchAt(x, y)) continue;
        const sw = sprite.image.naturalWidth / 10, sh = sprite.image.naturalHeight / 8;
        ctx.drawImage(sprite.image, col * sw, row * sh, sw, sh,
          x, y, sprite.width / 10 * sx, sprite.height / 8 * sy);
      }
    }
    ctx.imageSmoothingEnabled = true;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < this.glyphs.length; i++) {
      const glyph = this.glyphs[i];
      const x = (glyph.x + glyph.width / 2) * sx;
      const y = (glyph.y + glyph.height / 2) * sy;
      const off = switchAt(x, y) + .035;
      if (p >= off) continue;
      const scrambling = p >= off - .16;
      const gate = hash(i * 37 + tick * 17);
      if (scrambling && gate < .16) continue;
      const char = scrambling && gate > .38 ? ramp[Math.floor(hash(i + tick * 29) * ramp.length)] : glyph.text;
      ctx.font = glyph.font.replace(/[\d.]+px/, `${glyph.size * sy}px`);
      const metrics = ctx.measureText(glyph.text);
      const ascent = metrics.fontBoundingBoxAscent ?? glyph.size * sy * .8;
      const descent = metrics.fontBoundingBoxDescent ?? glyph.size * sy * .2;
      ctx.fillStyle = glyph.color;
      // Always exactly the captured BIOS position and size (apart from viewport resizing).
      ctx.fillText(char, x, y + (ascent - descent) / 2);
    }
    ctx.font = this.glyphs[0].font.replace(/[\d.]+px/, `${this.fontSize}px`);
    // Match the BIOS baseline calculation as well as its family, weight, and size.
    const gridMetrics = ctx.measureText(this.glyphs[0].text);
    const gridBaseline = ((gridMetrics.fontBoundingBoxAscent ?? this.fontSize * .8)
      - (gridMetrics.fontBoundingBoxDescent ?? this.fontSize * .2)) / 2;
    const r = this.rect;
    ctx.save();
    if (this.options.separateBootStrip) {
      ctx.beginPath(); ctx.rect(r.x, r.y, r.width, r.height * .969); ctx.clip();
    }
    for (let i = 0; i < this.cells.length; i++) {
      const target = this.cells[i];
      const on = switchAt(target.x, target.y) + .05;
      if (p < on) continue;
      const resolveAt = this.options.sizeMode === 'stepped'
        ? .78 + target.y / this.height * .07 + target.x / this.width * .04 + target.seed * .06
        : .63 + target.y / this.height * .17 + target.x / this.width * .06 + target.seed * .08;
      if (p >= resolveAt) {
        const w = Math.min(cell, r.x + r.width - target.x), h = Math.min(ch, r.y + r.height - target.y);
        ctx.drawImage(this.target, (target.x - r.x) / r.width * this.target.naturalWidth,
          (target.y - r.y) / r.height * this.target.naturalHeight, w / r.width * this.target.naturalWidth,
          h / r.height * this.target.naturalHeight, target.x, target.y, w + .25, h + .25);
        continue;
      }
      if (this.options.separateBootStrip) {
        // Each fixed cell builds density before color, then switches to its image tile.
        // Keep the staggered BIOS schedule; only the arriving glyph progression changes.
        const local = clamp((p - on) / (resolveAt - on));
        const densityRamp = '.:-=+*#%@';
        const density = clamp(local / .65);
        const char = densityRamp[Math.floor(density * (densityRamp.length - 1))];
        ctx.fillStyle = this.options.color && local >= .75 ? target.color : this.options.foreground;
        ctx.fillText(char, target.x + cell / 2, target.y + ch / 2 + gridBaseline);
        continue;
      }
      const stable = p >= on + .15;
      const gate = hash(i * 13 + tick * 7);
      if (!stable && gate < .22) continue;
      const char = stable ? target.char : gate < .6 ? this.glyphs[i % this.glyphs.length].text : ramp[Math.floor(hash(i + tick * 31) * ramp.length)];
      ctx.fillStyle = this.options.color && p >= on + .11 ? target.color : this.options.foreground;
      ctx.fillText(char, target.x + cell / 2, target.y + ch / 2 + gridBaseline);
    }
    if (p >= 1) ctx.drawImage(this.target, r.x, r.y, r.width, r.height);
    ctx.restore();
    if (this.options.separateBootStrip && overall >= .25) {
      this.drawBootStrip(clamp((overall - .25) / .75));
    }
  }

  private drawBootStrip(progress: number) {
    const ctx = this.ctx, r = this.rect;
    const y = r.y + r.height * .969, height = r.height * .031;
    const columns = Math.ceil(r.width / this.cellWidth);
    const ramp = '.:-=+*#%@';
    // Same initial colors and proportions as the CSS loading animation.
    const colors = ['#aab8c1', '#a0b2c0', '#95adbe', '#88a5bb', '#7b9cb8', '#6d93b5', '#5d88b2', '#507eaf', '#5d88b2', '#6d93b5', '#7b9cb8', '#88a5bb', '#95adbe', '#a0b2c0'];
    const colorAt = (u: number) => colors[u < .35 ? 0 : Math.min(13, 1 + Math.floor((u - .35) / .05))];
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, y, r.width, height); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(r.x, y, r.width, height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let col = 0; col < columns; col++) {
      const u = col / columns;
      const local = (progress - u * .55) / .40;
      if (local < 0) continue;
      const x = r.x + col * this.cellWidth;
      const width = Math.min(this.cellWidth, r.x + r.width - x);
      if (local >= 1) {
        // Paint the bar at pixel granularity so the handoff to CSS has no block edges.
        for (let offset = 0; offset < width; offset++) {
          ctx.fillStyle = colorAt((x + offset - r.x) / r.width);
          ctx.fillRect(x + offset, y, Math.min(1, width - offset), height);
        }
      } else {
        const density = clamp(local / .65);
        ctx.fillStyle = local >= .75 ? colorAt(u) : this.options.foreground;
        ctx.fillText(ramp[Math.floor(density * (ramp.length - 1))], x + this.cellWidth / 2, y + height / 2);
      }
    }
    ctx.restore();
  }
}
