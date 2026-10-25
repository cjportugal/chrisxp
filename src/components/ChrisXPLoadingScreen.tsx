import { useEffect, useEffectEvent, useRef, useState } from 'react';

const LOAD_DURATION = 6400;
const LOADER_PALETTE = ['#0000aa', '#0000aa', '#5555ff', '#5555ff', '#aaaaaa', '#ffffff', '#aaaaaa', '#5555ff'];
const LOADER_GLYPHS = '░▒▓█▓▒';

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
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const onFinished = useEffectEvent(onComplete);

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
      <div className="nfo-splash">
        <div className="nfo-splash__frame">
          <img
            className="nfo-splash__art"
            src={`${import.meta.env.BASE_URL}chrisxp-boot.png`}
            alt="Chris XP"
            width={2032}
            height={1532}
            fetchPriority="high"
            draggable={false}
          />
          {/* Takes the place of the bitmap's bottom strip, cropped to the splash width. */}
          <div className="nfo-loader" role="progressbar" aria-label={paused ? 'Loading paused' : 'Starting Chris XP'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="nfo-loader__cells" aria-hidden="true">
              {Array.from({ length: 256 }, (_, column) => {
                const position = ((column - phase) % 48 + 48) % 48;
                return <span key={column} style={{ color: LOADER_PALETTE[Math.floor(position / 6)] }}>{LOADER_GLYPHS[position % 6]}</span>;
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
