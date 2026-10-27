import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { CHRIS95_ART, CHRIS95_COLS, CHRIS95_ROWS } from '../effects/chris95Art';
import { BOOT_LOADER_PALETTE } from '../effects/TextSwitchTransition';

const LOAD_DURATION = 6400;
const LOADER_GLYPHS = '░▒▓█▓▒';
/** The VGA font draws seamless blocks only at multiples of 16 device pixels, so snap to one when it fits. */
function splashFontSize(width: number, height: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const size = Math.min(width * .92 / (CHRIS95_COLS * 9 / 16), height * .92 / CHRIS95_ROWS);
  let device = Math.max(1, Math.floor(size * dpr));
  if (device >= 16) device = Math.floor(device / 16) * 16;
  return device / dpr;
}

interface ChrisXPLoadingScreenProps {
  active?: boolean;
  onComplete: () => void;
}

export default function ChrisXPLoadingScreen({ active = true, onComplete }: ChrisXPLoadingScreenProps) {
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [elapsed, setElapsed] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const splashRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const onFinished = useEffectEvent(onComplete);

  useLayoutEffect(() => {
    const splash = splashRef.current;
    if (!splash) return;
    const measure = () => setFontSize(splashFontSize(splash.clientWidth, splash.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(splash);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const finish = useEffectEvent(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinished();
  });

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = () => setReducedMotion(preference.matches);
    const onKey = (event: KeyboardEvent) => {
      if (!active) return;
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        finish();
      } else if (event.code === 'Space') {
        event.preventDefault();
        setPaused(value => !value);
      }
    };
    preference.addEventListener('change', onPreference);
    window.addEventListener('keydown', onKey);
    return () => {
      preference.removeEventListener('change', onPreference);
      window.removeEventListener('keydown', onKey);
    };
  }, [active]);

  useEffect(() => {
    if (!active || paused) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden) {
        elapsedRef.current = Math.min(LOAD_DURATION, elapsedRef.current + Math.min(now - previous, 200));
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= LOAD_DURATION) finish();
      }
      previous = now;
    }, 100);
    return () => window.clearInterval(timer);
  }, [active, paused]);

  const phase = reducedMotion ? 0 : Math.floor(elapsed / 100);
  const progress = Math.min(100, Math.floor(elapsed / LOAD_DURATION * 100));

  return (
    <main className="nfo-screen nfo-screen--splash" aria-label="Chris XP startup">
      <div ref={splashRef} className="nfo-splash">
        <div className="nfo-splash__frame" style={{ fontSize: `${fontSize}px` }}>
          <pre className="nfo-splash__art" role="img" aria-label="Chris XP">{CHRIS95_ART.join('\n')}</pre>
        </div>
      </div>
      <div className="nfo-loader" role="progressbar" aria-label={paused ? 'Loading paused' : 'Starting Chris XP'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div className="nfo-loader__cells" aria-hidden="true">
          {Array.from({ length: 256 }, (_, column) => {
            const position = ((column - phase) % 48 + 48) % 48;
            return <span key={column} style={{ color: BOOT_LOADER_PALETTE[Math.floor(position / 6)] }}>{LOADER_GLYPHS[position % 6]}</span>;
          })}
        </div>
      </div>
    </main>
  );
}
