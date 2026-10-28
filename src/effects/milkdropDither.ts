import type { AudioGraph } from '../audio/engine';
import { ditherImageData, VIS_PALETTE } from './dither';

/** Each visualizer pixel covers this many CSS pixels, so a 276px frame renders Milkdrop at 138x138. */
export const VIS_PIXEL = 2;

interface ButterchurnVisualizer {
  connectAudio: (node: AudioNode) => void;
  loadPreset: (preset: object, blendSeconds: number) => void;
  render: () => void;
}

export interface MilkdropDither {
  /** Preset names, sorted. */
  presets: string[];
  loadPreset: (name: string, blendSeconds: number) => void;
  /** Render one Milkdrop frame and dither it onto the target canvas. */
  render: () => void;
  dispose: () => void;
}

/** Milkdrop (butterchurn) on an offscreen WebGL canvas, read back each frame and Bayer-dithered to the
 * OS palette on `target`, which is `size / VIS_PIXEL` pixels square and CSS-scaled up pixelated.
 * Resolves to null when the browser has no WebGL2.
 */
export async function createMilkdropDither(
  target: HTMLCanvasElement,
  graph: AudioGraph,
  size: number
): Promise<MilkdropDither | null> {
  const [{ default: isSupported }, { default: butterchurn }, { default: presetPack }] = await Promise.all([
    import('butterchurn/lib/isSupported.min'),
    import('butterchurn'),
    import('butterchurn-presets'),
  ]);
  if (!isSupported()) return null;

  const side = Math.round(size / VIS_PIXEL);
  const glCanvas = document.createElement('canvas');
  glCanvas.width = side;
  glCanvas.height = side;
  const scratch = document.createElement('canvas');
  scratch.width = side;
  scratch.height = side;
  const scratchContext = scratch.getContext('2d', { willReadFrequently: true });
  target.width = side;
  target.height = side;
  const targetContext = target.getContext('2d');
  if (!scratchContext || !targetContext) return null;

  const visualizer = butterchurn.createVisualizer(graph.context, glCanvas, {
    width: side,
    height: side,
    pixelRatio: 1,
    textureRatio: 1,
  }) as ButterchurnVisualizer;
  visualizer.connectAudio(graph.source);

  const presetObjects = presetPack.getPresets() as Record<string, object>;
  const presets = Object.keys(presetObjects).sort((a, b) => a.localeCompare(b));
  const output = new ImageData(side, side);

  return {
    presets,
    loadPreset: (name, blendSeconds) => {
      const preset = presetObjects[name];
      if (preset) visualizer.loadPreset(preset, blendSeconds);
    },
    render: () => {
      visualizer.render();
      // Read back in the same task as the render, before the WebGL buffer is presented and cleared.
      scratchContext.drawImage(glCanvas, 0, 0);
      const { data } = scratchContext.getImageData(0, 0, side, side);
      output.data.set(ditherImageData(data, side, side, VIS_PALETTE, { matrix: 'bayer4' }));
      targetContext.putImageData(output, 0, 0);
    },
    dispose: () => {
      glCanvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
