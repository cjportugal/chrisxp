/** A dotted triangle tumbling in 3D, after the dotted vectors of Crystal's Ninja Gaiden II crack intro
 * (Melon Dezign, 1992): nested triangles, each lagging a little behind the one outside it, so the stack twists
 * as it turns. Drawn on the splash's low-res grid (see splashGrid), one canvas pixel per dot.
 */

const LAYERS = 7;
/** Each inner triangle is this much smaller than the one outside it. */
const SHRINK = 0.13;
/** And runs this many seconds behind it. */
const LAG = 0.12;
/** Low-res pixels between dots along an edge. */
const DOT_GAP = 2.5;
const CAMERA = 3.2;
/** Furthest the triangle rocks out of the screen plane, in radians (about 50 degrees). */
const TILT = 0.88;

export interface CrystalColors {
  /** Dots nearer the viewer. */
  near: string;
  /** Dots further away. */
  far: string;
}

type Vec = [number, number, number];

function rotate([x, y, z]: Vec, ax: number, ay: number, az: number): Vec {
  // Z, then X, then Y.
  [x, y] = [x * Math.cos(az) - y * Math.sin(az), x * Math.sin(az) + y * Math.cos(az)];
  [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
  [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
  return [x, y, z];
}

/** Draw one frame at `time` seconds onto a canvas `width` x `height` low-res pixels. */
export function drawCrystalTriangle(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, colors: CrystalColors) {
  ctx.clearRect(0, 0, width, height);
  const size = Math.min(width, height) * 0.7;
  const near: number[] = [];
  const far: number[] = [];

  for (let layer = 0; layer < LAYERS; layer++) {
    const t = time - layer * LAG;
    const scale = 1 - layer * SHRINK;
    const corners = [0, 1, 2].map((i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / 3;
      // Spin in its own plane while rocking back and forth, never so far that it turns edge-on.
      return rotate([Math.cos(angle) * scale, Math.sin(angle) * scale, 0], TILT * Math.sin(t * 0.7), TILT * Math.sin(t * 0.5 + 1), t * 0.6);
    });
    for (let edge = 0; edge < 3; edge++) {
      const a = corners[edge];
      const b = corners[(edge + 1) % 3];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * size;
      const dots = Math.max(2, Math.round(length / DOT_GAP));
      for (let d = 0; d < dots; d++) {
        const f = d / dots;
        const x = a[0] + (b[0] - a[0]) * f;
        const y = a[1] + (b[1] - a[1]) * f;
        const z = a[2] + (b[2] - a[2]) * f;
        const perspective = CAMERA / (CAMERA + z);
        const px = Math.floor(width / 2 + x * size * perspective);
        const py = Math.floor(height / 2 + y * size * perspective);
        if (px < 0 || px >= width || py < 0 || py >= height) continue;
        (z < 0 ? near : far).push(px, py);
      }
    }
  }

  for (const [points, color] of [[far, colors.far], [near, colors.near]] as const) {
    ctx.fillStyle = color;
    for (let i = 0; i < points.length; i += 2) ctx.fillRect(points[i], points[i + 1], 1, 1);
  }
}
