import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { AudioGraph } from '../../audio/engine';
import { createMilkdropDither, VIS_PIXEL } from '../../effects/milkdropDither';
import type { MilkdropDither } from '../../effects/milkdropDither';
import { usePlayerStore } from '../../store/playerStore';
import { GLYPHS } from '../../theme/glyphs';
import PixelIcon from '../PixelIcon';
import SpectrumBars from './SpectrumBars';
import { useFrameLoop } from './useFrameLoop';

/** Canvas size inside the frame: 128x128 Milkdrop pixels, leaving the column a gutter either side. */
export const VIS_SIZE = 256;
const AUTO_ADVANCE_MS = 30_000;
const BLEND_SECONDS = 2.5;
/** On the desktop each Milkdrop pixel covers this many CSS pixels: chunkier than the frame, so dithering a
 * full screen stays cheap. */
const DESKTOP_PIXEL = 4;
/** A click waits this long to see whether it becomes a double-click before stepping the preset. */
const DOUBLE_CLICK_MS = 250;

const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

type Phase = 'idle' | 'loading' | 'ready' | 'unsupported';

/** Dithered Milkdrop in a square frame, with preset arrows and the preset name under it. Waits for the first
 * play to build the audio graph; without WebGL2 the frame shows the spectrum bars instead.
 * Click the frame for the next preset; double-click it to spread Milkdrop over the whole desktop, behind the
 * windows. The frame hides meanwhile and the preset row stays; Escape, or a double-click on the bare desktop or
 * the preset name, puts it back.
 */
export default function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const milkdrop = useRef<MilkdropDither | null>(null);
  const presetIndex = useRef(0);
  const desktopCanvasRef = useRef<HTMLCanvasElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onDesktop = usePlayerStore((state) => state.visOnDesktop);
  const setOnDesktop = usePlayerStore((state) => state.setVisOnDesktop);
  const graph = usePlayerStore((state) => state.graph);
  /** How starting Milkdrop on a given graph turned out; anything else is idle (no graph yet) or loading. */
  const [outcome, setOutcome] = useState<{ graph: AudioGraph; phase: 'ready' | 'unsupported' } | null>(null);
  const phase: Phase = !graph ? 'idle' : outcome?.graph === graph ? outcome.phase : 'loading';
  const presetName = usePlayerStore((state) => state.presetName);
  const setPresetName = usePlayerStore((state) => state.setPresetName);
  const setPresetStepper = usePlayerStore((state) => state.setPresetStepper);

  const step = (delta: number, blendSeconds = BLEND_SECONDS) => {
    const vis = milkdrop.current;
    if (!vis || vis.presets.length === 0) return;
    presetIndex.current = (presetIndex.current + delta + vis.presets.length) % vis.presets.length;
    const name = vis.presets[presetIndex.current];
    vis.loadPreset(name, blendSeconds);
    setPresetName(name);
  };
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!graph || !canvas) return;
    let cancelled = false;
    createMilkdropDither(canvas, graph, VIS_SIZE)
      .then((vis) => {
        if (cancelled) {
          vis?.dispose();
          return;
        }
        if (!vis) {
          setOutcome({ graph, phase: 'unsupported' });
          return;
        }
        milkdrop.current = vis;
        presetIndex.current = Math.floor(Math.random() * vis.presets.length);
        stepRef.current(0, 0);
        setPresetStepper((delta) => stepRef.current(delta));
        setOutcome({ graph, phase: 'ready' });
      })
      .catch((error: unknown) => {
        console.error('Milkdrop failed to start', error);
        if (!cancelled) setOutcome({ graph, phase: 'unsupported' });
      });
    return () => {
      cancelled = true;
      milkdrop.current?.dispose();
      milkdrop.current = null;
      setPresetStepper(null);
      setPresetName('');
    };
  }, [graph, setPresetName, setPresetStepper]);

  useEffect(() => {
    if (phase !== 'ready' || reducedMotion?.matches) return;
    const interval = setInterval(() => stepRef.current(1), AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, [phase]);

  const ready = phase === 'ready';
  const showOnDesktop = ready && onDesktop;

  useEffect(() => {
    const vis = milkdrop.current;
    const frame = canvasRef.current;
    const desktop = desktopCanvasRef.current;
    if (!showOnDesktop || !vis || !frame || !desktop) return;
    const fit = () => vis.retarget(desktop, Math.ceil(innerWidth / DESKTOP_PIXEL), Math.ceil(innerHeight / DESKTOP_PIXEL));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOnDesktop(false);
    };
    // The bare desktop is the empty windows layer, not a window or anything in one.
    const onDoubleClick = (event: globalThis.MouseEvent) => {
      if (event.target instanceof Element && event.target.matches('.cx-windows-layer')) setOnDesktop(false);
    };
    fit();
    addEventListener('resize', fit);
    addEventListener('keydown', onKeyDown);
    addEventListener('dblclick', onDoubleClick);
    return () => {
      removeEventListener('resize', fit);
      removeEventListener('keydown', onKeyDown);
      removeEventListener('dblclick', onDoubleClick);
      const side = Math.round(VIS_SIZE / VIS_PIXEL);
      vis.retarget(frame, side, side);
    };
  }, [showOnDesktop, setOnDesktop]);

  // Closing the column takes Milkdrop off the desktop with it.
  useEffect(
    () => () => {
      clearTimeout(clickTimer.current);
      setOnDesktop(false);
    },
    [setOnDesktop]
  );

  useFrameLoop(() => milkdrop.current?.render(), 30, ready);

  const onCanvasClick = (event: MouseEvent) => {
    if (event.detail > 1) return;
    clickTimer.current = setTimeout(() => step(1), DOUBLE_CLICK_MS);
  };
  const onCanvasDoubleClick = () => {
    clearTimeout(clickTimer.current);
    setOnDesktop(!onDesktop);
  };

  const desktopRoot = document.getElementById('desktop-root');
  return (
    <div className="cx-player__vis" data-on-desktop={showOnDesktop ? 'true' : undefined}>
      <div className="cx-player__vis-frame" style={{ width: VIS_SIZE, height: VIS_SIZE }}>
        <canvas
          ref={canvasRef}
          className="cx-player__vis-canvas cx-pixel"
          data-ready={ready ? 'true' : 'false'}
          style={{ width: VIS_SIZE, height: VIS_SIZE }}
          onClick={onCanvasClick}
          onDoubleClick={onCanvasDoubleClick}
          aria-label={ready ? 'Next preset' : undefined}
          title={ready ? 'Click: next preset. Double-click: fill the desktop' : undefined}
        />
        {phase === 'unsupported' && <SpectrumBars width={VIS_SIZE - 20} />}
        {(phase === 'idle' || phase === 'loading') && (
          <span className="cx-player__vis-idle">{phase === 'idle' ? 'Press play' : 'Loading Milkdrop…'}</span>
        )}
      </div>
      <div className="cx-player__presets">
        <button type="button" className="cx-button cx-player__icon-button" aria-label="Previous preset" disabled={!ready} onClick={() => step(-1)}>
          <PixelIcon glyph={GLYPHS.presetPrev} />
        </button>
        <span
          className="cx-player__preset-name cx-mono"
          title={showOnDesktop ? `${presetName}. Double-click: back to the frame` : presetName}
          onDoubleClick={() => ready && setOnDesktop(!onDesktop)}
        >
          {phase === 'unsupported' ? 'No WebGL2: spectrum only' : presetName || 'Milkdrop'}
        </span>
        <button type="button" className="cx-button cx-player__icon-button" aria-label="Next preset" disabled={!ready} onClick={() => step(1)}>
          <PixelIcon glyph={GLYPHS.presetNext} />
        </button>
      </div>
      {showOnDesktop &&
        desktopRoot &&
        createPortal(<canvas ref={desktopCanvasRef} className="cx-desktop-vis cx-pixel" aria-hidden="true" />, desktopRoot)}
    </div>
  );
}
