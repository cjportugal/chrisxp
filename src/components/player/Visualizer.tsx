import { useEffect, useRef, useState } from 'react';
import type { AudioGraph } from '../../audio/engine';
import { createMilkdropDither } from '../../effects/milkdropDither';
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

const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

type Phase = 'idle' | 'loading' | 'ready' | 'unsupported';

/** Dithered Milkdrop in a square frame, with preset arrows and the preset name under it. Waits for the first
 * play to build the audio graph; without WebGL2 the frame shows the spectrum bars instead.
 */
export default function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const milkdrop = useRef<MilkdropDither | null>(null);
  const presetIndex = useRef(0);
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

  useFrameLoop(() => milkdrop.current?.render(), 30, phase === 'ready');

  const ready = phase === 'ready';
  return (
    <div className="cx-player__vis">
      <div className="cx-player__vis-frame" style={{ width: VIS_SIZE, height: VIS_SIZE }}>
        <canvas
          ref={canvasRef}
          className="cx-player__vis-canvas cx-pixel"
          data-ready={ready ? 'true' : 'false'}
          style={{ width: VIS_SIZE, height: VIS_SIZE }}
          onClick={() => step(1)}
          aria-label={ready ? 'Next preset' : undefined}
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
        <span className="cx-player__preset-name cx-mono" title={presetName}>
          {phase === 'unsupported' ? 'No WebGL2: spectrum only' : presetName || 'Milkdrop'}
        </span>
        <button type="button" className="cx-button cx-player__icon-button" aria-label="Next preset" disabled={!ready} onClick={() => step(1)}>
          <PixelIcon glyph={GLYPHS.presetNext} />
        </button>
      </div>
    </div>
  );
}
