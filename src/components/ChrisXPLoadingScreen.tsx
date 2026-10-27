import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { CHRIS95_COLS, CHRIS95_LETTERS, CHRIS95_LETTER_SPANS, CHRIS95_ROWS, chris95Typed } from '../effects/chris95Art';
import { BOOT_LOADER_PALETTE } from '../effects/TextSwitchTransition';

const LOAD_DURATION = 6400;
const LOADER_GLYPHS = '░▒▓█▓▒';
// The loader advances in coarse jumps, a few frames a second, at the same overall speed.
const LOADER_STEP_MS = 300, LOADER_STEP_CELLS = 3;
// Terminal-style typing: the cursor blinks, the letters type in one at a time, then it blinks after the last.
const TYPE_START = 900, LETTER_MS = 200, BLINK_MS = 500;
/** Block cursors sized to the letters they follow, in grid cells: "Chris" x-height, then the smaller, lower "xp". */
const CURSORS = [{ top: 24, rows: 14, cols: 8 }, { top: 31, rows: 7, cols: 5 }]
  .map(cursor => ({ ...cursor, text: Array(cursor.rows).fill('█'.repeat(cursor.cols)).join('\n') }));
const CURSOR_GAP = 2;

/** The art spans at most this share of the screen's width and height. */
const ART_WIDTH = .6, ART_HEIGHT = .7;

/** Sizes the art in whole device pixels. The VGA font only meets edge to edge at multiples of 16, so `patched`
 * marks the in-between sizes that need the seams between blocks filled. */
function splashFontSize(width: number, height: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  // The cursor parks just past the art's right edge, so keep room for it too.
  const cols = Math.max(CHRIS95_COLS / ART_WIDTH, CHRIS95_COLS + 2 * (CURSORS[1].cols + CURSOR_GAP));
  const size = Math.min(width / (cols * 9 / 16), height * ART_HEIGHT / CHRIS95_ROWS);
  let device = Math.max(1, Math.floor(size * dpr));
  // Prefer a seamless size when one is close below.
  if (device >= 16 && device % 16 <= device * .1) device -= device % 16;
  return { size: device / dpr, patched: device % 16 !== 0 };
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
  const [font, setFont] = useState({ size: 16, patched: false });
  const splashRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const onFinished = useEffectEvent(onComplete);

  useLayoutEffect(() => {
    const splash = splashRef.current;
    if (!splash) return;
    const measure = () => {
      const next = splashFontSize(splash.clientWidth, splash.clientHeight);
      setFont(current => current.size === next.size ? current : next);
    };
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
  const loaderShift = reducedMotion ? 0 : Math.floor(elapsed / LOADER_STEP_MS) * LOADER_STEP_CELLS;
  const progress = Math.min(100, Math.floor(elapsed / LOAD_DURATION * 100));
  const letters = reducedMotion ? CHRIS95_LETTERS
    : elapsed < TYPE_START ? 0 : Math.min(CHRIS95_LETTERS, Math.floor((elapsed - TYPE_START) / LETTER_MS) + 1);
  const typing = !reducedMotion && letters > 0 && letters < CHRIS95_LETTERS;
  const cursorOn = reducedMotion || typing || Math.floor(elapsed / BLINK_MS) % 2 === 0;
  const cursor = CURSORS[letters >= 6 ? 1 : 0];
  const cursorX = letters ? CHRIS95_LETTER_SPANS[letters].right + CURSOR_GAP : CHRIS95_LETTER_SPANS[1].left;

  return (
    <main className="nfo-screen nfo-screen--splash" aria-label="Chris XP startup">
      <div ref={splashRef} className="nfo-splash">
        <div className={`nfo-splash__frame${font.patched ? ' nfo-splash__frame--patched' : ''}`} style={{ fontSize: `${font.size}px` }}>
          <pre className="nfo-splash__art" role="img" aria-label="Chris XP">{chris95Typed(letters, reducedMotion ? undefined : phase).join('\n')}</pre>
          <pre className="nfo-splash__cursor" aria-hidden="true"
            style={{ left: `${cursorX * 9 / 16}em`, top: `${cursor.top}em`, visibility: cursorOn ? 'visible' : 'hidden' }}>
            {cursor.text}
          </pre>
        </div>
      </div>
      <div className="nfo-loader" role="progressbar" aria-label={paused ? 'Loading paused' : 'Starting Chris XP'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div className="nfo-loader__cells" aria-hidden="true">
          {Array.from({ length: 256 }, (_, column) => {
            const position = ((column - loaderShift) % 48 + 48) % 48;
            return <span key={column} style={{ color: BOOT_LOADER_PALETTE[Math.floor(position / 6)] }}>{LOADER_GLYPHS[position % 6]}</span>;
          })}
        </div>
      </div>
    </main>
  );
}
