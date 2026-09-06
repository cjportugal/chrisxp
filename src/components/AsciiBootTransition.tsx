import { useEffect, useEffectEvent, useRef } from 'react';
import { TextSwitchTransition } from '../effects/TextSwitchTransition';

const TRANSITION_DURATION = 4800;

export default function AsciiBootTransition({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const complete = useEffectEvent(onComplete);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const bios = document.querySelector<HTMLElement>('.bios-screen');
    const previousVisibility = bios?.style.visibility ?? '';
    const restoreBios = () => { if (bios) bios.style.visibility = previousVisibility; };
    let frame = 0;
    let finished = false;
    const image = new Image();
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      clearTimeout(loadTimeout);
      restoreBios();
      complete();
    };
    // Bound asset/font loading only; a hidden tab must not time out an active animation.
    const loadTimeout = window.setTimeout(finish, 3000);
    const onPreference = () => { if (preference.matches) finish(); };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) { event.preventDefault(); finish(); }
    };
    preference.addEventListener('change', onPreference);
    window.addEventListener('keydown', onKey);
    image.onload = async () => {
      try {
        await document.fonts.ready;
        if (finished) return;
        if (preference.matches || !bios) { finish(); return; }
        const renderer = new TextSwitchTransition(canvas, bios, image, { duration: TRANSITION_DURATION, color: true, refreshRate: 10, sizeMode: 'preserve', separateBootStrip: true });
        renderer.draw(0);
        bios.style.visibility = 'hidden';
        clearTimeout(loadTimeout);
        let last = performance.now();
        let elapsed = 0;
        const tick = (now: number) => {
          if (finished) return;
          const delta = Math.min(100, Math.max(0, now - last));
          last = now;
          if (!document.hidden) elapsed += delta;
          try {
            renderer.draw(Math.min(1, elapsed / TRANSITION_DURATION));
            if (elapsed >= TRANSITION_DURATION) { finish(); return; }
            frame = requestAnimationFrame(tick);
          } catch { finish(); }
        };
        frame = requestAnimationFrame(tick);
      } catch { finish(); }
    };
    image.onerror = finish;
    const reducedTimeout = preference.matches ? window.setTimeout(finish, 0) : null;
    if (!preference.matches) image.src = `${import.meta.env.BASE_URL}windows95-boot.png`;
    return () => {
      finished = true;
      restoreBios();
      cancelAnimationFrame(frame);
      clearTimeout(loadTimeout);
      if (reducedTimeout !== null) clearTimeout(reducedTimeout);
      image.onload = null;
      image.onerror = null;
      preference.removeEventListener('change', onPreference);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return <canvas ref={canvasRef} className="ascii-boot-transition" role="img" aria-label="Starting Windows 95" />;
}
