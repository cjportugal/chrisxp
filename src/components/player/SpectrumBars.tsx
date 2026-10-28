import { useRef } from 'react';
import { binSpectrum, fallPeaks } from '../../audio/spectrum';
import { usePlayerStore } from '../../store/playerStore';
import { useFrameLoop } from './useFrameLoop';

const BARS = 19;
const BAR_WIDTH = 3;
const GAP = 1;
const HEIGHT = 16;
export const SPECTRUM_WIDTH = BARS * (BAR_WIDTH + GAP) - GAP;
/** Nothing much lives above this, so the treble bars would sit dead. */
const MAX_HZ = 16000;
/** How far a peak cap drops per frame, as a share of the full height. */
const PEAK_FALL = 0.035;

interface Props {
  /** Rendered width in CSS px; the canvas keeps its 75x16 pixels and scales up pixelated. */
  width?: number;
}

/** Winamp's analyzer at 1-bit: 19 ink bars on paper with peak caps that drift back down. */
export default function SpectrumBars({ width = SPECTRUM_WIDTH }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaks = useRef<number[]>([]);
  const bins = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const analyser = usePlayerStore((state) => state.graph?.analyser ?? null);
  const playing = usePlayerStore((state) => state.status === 'playing');

  useFrameLoop(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;

    let levels: number[] = new Array(BARS).fill(0);
    if (analyser && playing) {
      if (bins.current?.length !== analyser.frequencyBinCount) bins.current = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(bins.current);
      const hzPerBin = analyser.context.sampleRate / analyser.fftSize;
      levels = binSpectrum(bins.current.subarray(0, Math.round(MAX_HZ / hzPerBin)), BARS);
    }
    peaks.current = fallPeaks(peaks.current, levels, PEAK_FALL);

    const style = getComputedStyle(context.canvas);
    context.fillStyle = style.getPropertyValue('--cx-paper') || '#f2f1ea';
    context.fillRect(0, 0, SPECTRUM_WIDTH, HEIGHT);
    context.fillStyle = style.getPropertyValue('--cx-ink') || '#101010';
    for (let i = 0; i < BARS; i++) {
      const x = i * (BAR_WIDTH + GAP);
      const bar = Math.round(levels[i] * (HEIGHT - 1));
      if (bar > 0) context.fillRect(x, HEIGHT - bar, BAR_WIDTH, bar);
      const peak = Math.round(peaks.current[i] * (HEIGHT - 1));
      context.fillRect(x, HEIGHT - 1 - peak, BAR_WIDTH, 1);
    }
  }, 30);

  return (
    <canvas
      ref={canvasRef}
      className="cx-player__spectrum cx-pixel"
      width={SPECTRUM_WIDTH}
      height={HEIGHT}
      style={{ width, height: Math.round((width * HEIGHT) / SPECTRUM_WIDTH) }}
      aria-hidden="true"
    />
  );
}
