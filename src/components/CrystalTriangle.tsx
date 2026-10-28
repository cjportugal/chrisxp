import { useEffect, useRef } from 'react';
import { drawCrystalTriangle } from '../effects/crystalTriangle';
import { splashGrid } from '../effects/splashGrid';

/** The triangle steps at an Amiga intro's chunky pace rather than the display's refresh rate. */
const FPS = 25;
/** Splash greys, dim enough to sit behind the title. */
const COLORS = { near: '#555', far: '#333' };

interface CrystalTriangleProps {
  /** Animate; when false the triangle holds its current frame. */
  running: boolean;
  /** Fade the triangle in. */
  visible: boolean;
}

/** A dotted triangle tumbling in 3D, as a pixelated backdrop filling its positioned parent. */
export default function CrystalTriangle({ running, visible }: CrystalTriangleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw = () => drawCrystalTriangle(ctx, canvas.width, canvas.height, timeRef.current, COLORS);
    const fit = () => {
      const { clientWidth, clientHeight } = canvas;
      if (!clientWidth || !clientHeight) return;
      Object.assign(canvas, splashGrid(clientWidth, clientHeight));
      draw();
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    if (!running || reducedMotion) return () => observer.disconnect();

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (now - last >= 1000 / FPS - 1) {
        timeRef.current += Math.min(now - last, 200) / 1000;
        last = now;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [running]);

  return <canvas ref={canvasRef} className="nfo-crystal" data-visible={visible ? 'true' : 'false'} aria-hidden="true" />;
}
