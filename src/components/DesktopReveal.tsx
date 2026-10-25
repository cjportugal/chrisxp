import { useEffect, useEffectEvent, useRef } from 'react';
import { bendFramebuffer, FRAMEBUFFER_BEND_DEFAULTS } from '../effects/FramebufferBend';
import { sampleDesktopColors } from '../effects/desktopReveal';

export default function DesktopReveal({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const complete = useEffectEvent(onComplete);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const desktop = document.getElementById('desktop-root');
    if (!canvas || !ctx || !desktop) { complete(); return; }
    const readme = document.querySelector<HTMLElement>('.nfo-screen');
    const previousVisibility = readme?.style.visibility ?? '';
    const restoreReadme = () => { if (readme) readme.style.visibility = previousVisibility; };
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const buffer = document.createElement('canvas');
    const bufferContext = buffer.getContext('2d');
    if (!bufferContext) { complete(); return; }
    let source: Uint8ClampedArray<ArrayBufferLike> | null = null;
    let frame = 0, done = false, elapsed = 0, previous = performance.now();
    let width = 0, height = 0, dpr = 0, lastBank = -1;

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      restoreReadme();
      complete();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) { event.preventDefault(); finish(); }
    };
    const onPreference = () => { if (preference.matches) finish(); };
    const draw = () => {
      const box = canvas.getBoundingClientRect();
      const nextDpr = Math.min(devicePixelRatio || 1, 2);
      const resized = width !== box.width || height !== box.height || nextDpr !== dpr;
      const bank = Math.floor(elapsed / FRAMEBUFFER_BEND_DEFAULTS.cadence) % 4;
      if (!resized && bank === lastBank) return;
      if (resized) {
        width = box.width; height = box.height; dpr = nextDpr;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buffer.width = 320;
        buffer.height = Math.max(1, Math.round(320 * height / width));
        source = sampleDesktopColors(desktop, buffer.width, buffer.height, width, height);
      }
      if (!source) return;
      const pixels = bendFramebuffer(source, buffer.width, buffer.height, bank, FRAMEBUFFER_BEND_DEFAULTS.strength);
      bufferContext.putImageData(new ImageData(pixels, buffer.width, buffer.height), 0, 0);
      lastBank = bank;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buffer, 0, 0, width, height);
    };
    const animate = (now: number) => {
      if (done) return;
      if (!document.hidden) elapsed += Math.min(100, Math.max(0, now - previous));
      previous = now;
      if (elapsed >= FRAMEBUFFER_BEND_DEFAULTS.duration) { finish(); return; }
      try { draw(); } catch { finish(); return; }
      frame = requestAnimationFrame(animate);
    };

    window.addEventListener('keydown', onKey);
    preference.addEventListener('change', onPreference);
    if (preference.matches) finish();
    else {
      try {
        // Start with the first corrupted framebuffer immediately: no hold or ASCII takeover.
        draw();
        if (readme) readme.style.visibility = 'hidden';
        previous = performance.now();
        frame = requestAnimationFrame(animate);
      } catch { finish(); }
    }
    return () => {
      done = true;
      cancelAnimationFrame(frame);
      restoreReadme();
      window.removeEventListener('keydown', onKey);
      preference.removeEventListener('change', onPreference);
    };
  }, []);

  return <canvas ref={canvasRef} className="desktop-reveal" role="status" aria-label="Opening desktop" />;
}
