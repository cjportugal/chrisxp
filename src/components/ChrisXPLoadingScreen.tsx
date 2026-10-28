import { useEffect, useEffectEvent, useRef, useState } from 'react';
import chrisxpWord from '../assets/title/chrisxp.svg';
import loadingWord from '../assets/title/loading.svg';
import operatingWord from '../assets/title/operating.svg';
import pausedWord from '../assets/title/paused.svg';
import systemWord from '../assets/title/system.svg';
import { splashGrid } from '../effects/splashGrid';
import { drawTitleCard } from '../effects/titleCard';
import type { TitleCardWords } from '../effects/titleCard';
import CrystalTriangle from './CrystalTriangle';

const LOAD_DURATION = 6400;
/** The bar's filled cells shimmer through the loader greys, a cell a step, a few steps a second. */
const SHIMMER_STEP_MS = 300;

function loadWord(src: string): HTMLImageElement {
  const image = new Image();
  image.src = src;
  return image;
}

interface ChrisXPLoadingScreenProps {
  active?: boolean;
  onComplete: () => void;
}

/** The startup title card, set like an Evangelion episode card and drawn as dithered pixel art (see titleCard),
 * over the tumbling dotted triangle. Enter skips it, Space pauses it. The title words are outlines of the NIS JTC
 * M9 fonts (see scripts/outline-title.py); the real text stays in the DOM for screen readers. */
export default function ChrisXPLoadingScreen({ active = true, onComplete }: ChrisXPLoadingScreenProps) {
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const cardRef = useRef<HTMLCanvasElement>(null);
  const [words] = useState<TitleCardWords>(() => ({
    chrisxp: loadWord(chrisxpWord),
    operating: loadWord(operatingWord),
    system: loadWord(systemWord),
    loading: loadWord(loadingWord),
    paused: loadWord(pausedWord),
  }));
  const [grid, setGrid] = useState({ width: 0, height: 0 });
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

  useEffect(() => {
    const canvas = cardRef.current;
    if (!canvas) return;
    const fit = () => {
      if (canvas.clientWidth && canvas.clientHeight) setGrid(splashGrid(canvas.clientWidth, canvas.clientHeight));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    // Redraw once the outlined words have loaded.
    const onLoad = () => setGrid((current) => ({ ...current }));
    const images = Object.values(words);
    images.forEach((image) => image.addEventListener('load', onLoad));
    return () => {
      observer.disconnect();
      images.forEach((image) => image.removeEventListener('load', onLoad));
    };
  }, [words]);

  const progress = elapsed / LOAD_DURATION;
  const shimmer = reducedMotion ? 0 : Math.floor(elapsed / SHIMMER_STEP_MS);

  useEffect(() => {
    const canvas = cardRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx || !grid.width) return;
    if (canvas.width !== grid.width || canvas.height !== grid.height) Object.assign(canvas, grid);
    drawTitleCard(ctx, grid.width, grid.height, words, { progress, shimmer, paused });
  }, [grid, words, progress, shimmer, paused]);

  return (
    <main className="nfo-screen nfo-screen--splash" aria-label="Chris XP startup">
      <CrystalTriangle running={active && !paused} visible={active} />
      <canvas ref={cardRef} className="nfo-title" aria-hidden="true" />
      <h1 className="nfo-title__a11y">ChrisXP Operating System</h1>
      <div className="nfo-title__a11y" role="progressbar" aria-label={paused ? 'Loading paused' : 'Starting Chris XP'}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(progress * 100)} />
    </main>
  );
}
