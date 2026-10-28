import type { AudioGraph } from '../audio/engine';
import { ditherImageData, VIS_PALETTE } from './dither';

/** Each visualizer pixel covers this many CSS pixels, so a 276px frame renders Milkdrop at 138x138. */
export const VIS_PIXEL = 2;

interface ButterchurnVisualizer {
  connectAudio: (node: AudioNode) => void;
  loadPreset: (preset: object, blendSeconds: number) => void;
  render: () => void;
  setRendererSize: (width: number, height: number) => void;
}

export interface MilkdropDither {
  /** Preset names, sorted. */
  presets: string[];
  loadPreset: (name: string, blendSeconds: number) => void;
  /** Point the output at another canvas, rendering `columns` x `rows` Milkdrop pixels. */
  retarget: (target: HTMLCanvasElement, columns: number, rows: number) => void;
  /** Render one Milkdrop frame and dither it onto the target canvas. */
  render: () => void;
  dispose: () => void;
}

/** Milkdrop (butterchurn) on an offscreen WebGL canvas, read back each frame and Bayer-dithered to the
 * OS palette on `target`, which is `size / VIS_PIXEL` pixels square and CSS-scaled up pixelated. `retarget`
 * moves the output to another canvas at another size, such as the desktop.
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
  const scratch = document.createElement('canvas');
  const scratchContext = scratch.getContext('2d', { willReadFrequently: true });
  if (!scratchContext) return null;
  let width = 0;
  let height = 0;
  let targetContext: CanvasRenderingContext2D | null = null;
  let output: ImageData | null = null;
  let visualizer: ButterchurnVisualizer | null = null;

  const retarget = (target: HTMLCanvasElement, columns: number, rows: number) => {
    targetContext = target.getContext('2d');
    width = columns;
    height = rows;
    for (const canvas of [glCanvas, scratch, target]) {
      canvas.width = columns;
      canvas.height = rows;
    }
    output = new ImageData(columns, rows);
    visualizer?.setRendererSize(columns, rows);
  };
  retarget(target, side, side);
  if (!targetContext) return null;

  const vis = butterchurn.createVisualizer(graph.context, glCanvas, {
    width: side,
    height: side,
    pixelRatio: 1,
    textureRatio: 1,
  }) as ButterchurnVisualizer;
  vis.connectAudio(graph.source);
  visualizer = vis;

  const presetObjects = presetPack.getPresets() as Record<string, object>;
  const presets = Object.keys(presetObjects).sort((a, b) => a.localeCompare(b));
  return {
    presets,
    loadPreset: (name, blendSeconds) => {
      const preset = presetObjects[name];
      if (preset) vis.loadPreset(preset, blendSeconds);
    },
    retarget,
    render: () => {
      if (!targetContext || !output) return;
      vis.render();
      // Read back in the same task as the render, before the WebGL buffer is presented and cleared.
      scratchContext.drawImage(glCanvas, 0, 0);
      const { data } = scratchContext.getImageData(0, 0, width, height);
      output.data.set(ditherImageData(data, width, height, VIS_PALETTE, { matrix: 'bayer4' }));
      targetContext.putImageData(output, 0, 0);
    },
    dispose: () => {
      glCanvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
