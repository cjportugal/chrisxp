import { useEffect, useEffectEvent, useRef } from 'react';
import { bendFramebuffer, FRAMEBUFFER_BEND_DEFAULTS } from '../effects/FramebufferBend';
import { desktopRevealCell, desktopRandomCharacter, sampleDesktopColors } from '../effects/desktopReveal';

const ORIGINAL_DURATION = 6400;
const COLOR_HOLD_DURATION = ORIGINAL_DURATION * .24;
const SCRAMBLE_DURATION = 1000;
const TAKEOVER_DURATION = COLOR_HOLD_DURATION + SCRAMBLE_DURATION;
const DESKTOP_RESOLVE_DURATION = 800;
// Begin corruption as the first desktop cells arrive, then recover to the live desktop.
const BEND_START = TAKEOVER_DURATION + DESKTOP_RESOLVE_DURATION * .65;
const DURATION = BEND_START + FRAMEBUFFER_BEND_DEFAULTS.duration;

export default function DesktopReveal({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const complete = useEffectEvent(onComplete);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) { complete(); return; }
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const seed = Math.random() * 10000;
    const image = new Image();
    const sample = document.createElement('canvas');
    const sampleContext = sample.getContext('2d', { willReadFrequently: true });
    let pixels = new Uint8ClampedArray(0);
    let columns = 0, rows = 0;
    let desktopPixels: Uint8ClampedArray<ArrayBufferLike> | null = null;
    const bentDesktop = document.createElement('canvas');
    const bentContext = bentDesktop.getContext('2d');
    let desktopSource: Uint8ClampedArray<ArrayBufferLike> | null = null;
    let lastBank = -1;
    let frame = 0, done = false, elapsed = 0, previous = performance.now();
    let width = 0, height = 0, dpr = 0, lastTick = -1;
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      clearTimeout(loadTimeout);
      complete();
    };
    const loadTimeout = window.setTimeout(finish, 2000);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) { event.preventDefault(); finish(); }
    };
    const onPreference = () => { if (preference.matches) finish(); };
    const draw = (tick: number) => {
      const box = canvas.getBoundingClientRect();
      const nextDpr = Math.min(devicePixelRatio || 1, 2);
      const resized = width !== box.width || height !== box.height || nextDpr !== dpr;
      if (!resized && tick === lastTick) return;
      width = box.width; height = box.height; dpr = nextDpr; lastTick = tick;
      if (resized) {
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
      ctx.drawImage(image, (width - iw) / 2, (height - ih) / 2, iw, ih);
      const fontSize = Math.max(16, Math.round(28 * Math.min(width / 1280, height / 720)));
      ctx.font = `${fontSize}px "Perfect DOS VGA 437 Win", monospace`;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      if (resized && sampleContext) {
        columns = Math.ceil(width / ctx.measureText('M').width);
        rows = Math.ceil(height / fontSize);
        sample.width = columns; sample.height = rows;
        sampleContext.fillStyle = '#000'; sampleContext.fillRect(0, 0, columns, rows);
        sampleContext.drawImage(image, (width - iw) / 2 / width * columns,
          (height - ih) / 2 / height * rows, iw / width * columns, ih / height * rows);
        pixels = sampleContext.getImageData(0, 0, columns, rows).data;
      }
      const time = tick * 100;
      const progress = time <= COLOR_HOLD_DURATION
        ? time / ORIGINAL_DURATION
        : time <= TAKEOVER_DURATION
          ? .24 + (time - COLOR_HOLD_DURATION) / SCRAMBLE_DURATION * .36
          : Math.min(1, .60 + (time - TAKEOVER_DURATION) / DESKTOP_RESOLVE_DURATION * .40);
      if (resized) { desktopPixels = null; desktopSource = null; lastBank = -1; }
      if (progress >= .66 && !desktopPixels) {
        const desktop = document.getElementById('desktop-root');
        if (desktop) desktopPixels = sampleDesktopColors(desktop, columns, rows, width, height);
      }
      const bendTime = time - BEND_START;
      const bending = bendTime >= 0 && bendTime < FRAMEBUFFER_BEND_DEFAULTS.duration;
      if (bending && bentContext) {
        const desktop = document.getElementById('desktop-root');
        if (desktop && !desktopSource) {
          bentDesktop.width = 320;
          bentDesktop.height = Math.max(1, Math.round(320 * height / width));
          desktopSource = sampleDesktopColors(desktop, bentDesktop.width, bentDesktop.height, width, height);
        }
        const step = Math.floor(bendTime / FRAMEBUFFER_BEND_DEFAULTS.cadence);
        const bank = step % 4;
        if (desktopSource && bank !== lastBank) {
          const data = bendFramebuffer(desktopSource, bentDesktop.width, bentDesktop.height, bank, FRAMEBUFFER_BEND_DEFAULTS.strength);
          bentContext.putImageData(new ImageData(data, bentDesktop.width, bentDesktop.height), 0, 0);
          lastBank = bank;
        }
      }
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
        const state = desktopRevealCell(col, row, progress, seed);
        const x = Math.round(col * width * dpr / columns) / dpr;
        const y = Math.round(row * height * dpr / rows) / dpr;
        const w = Math.round((col + 1) * width * dpr / columns) / dpr - x;
        const h = Math.round((row + 1) * height * dpr / rows) / dpr - y;
        if (state === 'desktop') {
          if (bending && desktopSource && bentContext) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(bentDesktop, x / width * bentDesktop.width, y / height * bentDesktop.height,
              w / width * bentDesktop.width, h / height * bentDesktop.height, x, y, w, h);
            ctx.imageSmoothingEnabled = true;
          } else ctx.clearRect(x, y, w, h);
        }
        else if (state !== 'image') {
          const i = (row * columns + col) * 4;
          const ramp = ' .:-/+*?2389ON@';
          const light = (pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722) / 255;
          const character = state === 'color' ? ramp[Math.floor(light * (ramp.length - 1))]
            : desktopRandomCharacter(col, row, tick, seed);
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
          ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h);
          const mix = state === 'recolor' ? Math.min(1, (progress - .66) / .18) : 0;
          const color = [0, 1, 2].map(channel => {
            const source = state === 'color' ? pixels[i + channel] : Math.max(125, pixels[i + channel]);
            const target = desktopPixels?.[i + channel] ?? source;
            return Math.round(source + (target - source) * mix);
          });
          ctx.fillStyle = `rgb(${color.join(',')})`;
          ctx.fillText(character, x + w / 2, y + h / 2);
          ctx.restore();
        }
      }
      canvas.style.background = 'transparent';
    };
    const animate = (now: number) => {
      if (done) return;
      if (!document.hidden) elapsed += Math.min(100, Math.max(0, now - previous));
      previous = now;
      if (elapsed >= DURATION) { finish(); return; }
      draw(Math.floor(elapsed / 100));
      frame = requestAnimationFrame(animate);
    };
    image.onload = () => {
      if (done) return;
      clearTimeout(loadTimeout);
      draw(0); previous = performance.now();
      frame = requestAnimationFrame(animate);
    };
    image.onerror = finish;
    window.addEventListener('keydown', onKey);
    preference.addEventListener('change', onPreference);
    if (preference.matches) finish();
    else image.src = `${import.meta.env.BASE_URL}windows95-boot.png`;
    return () => {
      done = true; cancelAnimationFrame(frame); clearTimeout(loadTimeout);
      image.onload = null; image.onerror = null;
      window.removeEventListener('keydown', onKey);
      preference.removeEventListener('change', onPreference);
    };
  }, []);

  return <canvas ref={canvasRef} className="desktop-reveal" role="status" aria-label="Opening desktop" />;
}
