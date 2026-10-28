// Standalone view of the chrisxp artwork: the sampled character grid, with its letter outlines boiling.
// Open /chrisxp-art.html; add ?cols=220 to force one grid width.
import fontUrl from 'xp.css/dist/PerfectDOSVGA437Win.woff2?url';
import { BOIL_TICKS_PER_SECOND, OutlineBoil } from './outlineBoil';

const files = import.meta.glob<string>('./chrisxp-*.txt', { query: '?raw', import: 'default', eager: true });
const grids = Object.values(files)
  .map(text => text.replace(/\n+$/, '').split('\n'))
  .map(lines => ({ lines, cols: Math.max(...lines.map(line => line.length)) }))
  .sort((a, b) => b.cols - a.cols);

const pre = document.getElementById('art') as HTMLPreElement;
const forced = Number(new URLSearchParams(location.search).get('cols'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let boil: OutlineBoil | null = null;
let tick = 0;

/** The VGA font only draws seamless blocks at multiples of 16 device pixels, so pick a grid width that fills
 * the space at one of those sizes, preferring the larger result and then the finer grid. */
const fit = () => {
  const dpr = window.devicePixelRatio || 1;
  // The artwork takes up to half the window's width.
  const width = window.innerWidth * dpr / 2, height = window.innerHeight * dpr;
  const pool = grids.some(grid => grid.cols === forced) ? grids.filter(grid => grid.cols === forced) : grids;
  let choice = { grid: pool.at(-1)!, device: 16, shown: 0 };
  for (const grid of pool) {
    for (let device = 16; grid.cols * device * 9 / 16 <= width && grid.lines.length * device <= height; device += 16) {
      const shown = grid.cols * device;
      if (shown > choice.shown * 1.05 || (shown >= choice.shown * .95 && grid.cols > choice.grid.cols)) choice = { grid, device, shown };
    }
  }
  // Nothing fits crisply (a very small window): scale the coarsest grid down to fit instead.
  if (!choice.shown) {
    const { grid } = choice;
    choice.device = Math.floor(Math.min(width / (grid.cols * 9 / 16), height / grid.lines.length));
  }
  if (pre.dataset.cols !== String(choice.grid.cols)) {
    boil = new OutlineBoil(choice.grid.lines);
    pre.dataset.cols = String(choice.grid.cols);
    draw();
  }
  pre.style.fontSize = `${choice.device / dpr}px`;
};

const draw = () => {
  if (boil) pre.textContent = boil.frame(reducedMotion.matches ? 0 : tick);
};

// One stepped clock; it stops while the tab is hidden and while someone has text selected in the artwork.
const step = 1000 / BOIL_TICKS_PER_SECOND;
let last = performance.now(), carry = 0;
const loop = (now: number) => {
  carry += Math.min(250, now - last);
  last = now;
  const selection = document.getSelection();
  const selecting = selection && !selection.isCollapsed && selection.containsNode(pre, true);
  if (carry >= step) {
    if (!reducedMotion.matches && !selecting) {
      tick += Math.floor(carry / step);
      draw();
    }
    carry %= step;
  }
  requestAnimationFrame(loop);
};

const font = new FontFace('Perfect DOS VGA 437 Win', `url(${fontUrl})`);
document.fonts.add(font);
font.load().finally(() => {
  fit();
  requestAnimationFrame(loop);
});
window.addEventListener('resize', fit);
reducedMotion.addEventListener('change', draw);
