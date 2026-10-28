/** The splash's low-res pixel grid, shared by the triangle and the title card so their dots line up: Amiga-wide
 * on big screens, never finer than MIN_DOT CSS pixels a dot on small ones. One canvas pixel is one dot; the
 * canvases are scaled up pixelated to fill the screen.
 */
const COLUMNS = 320;
const MIN_DOT = 2;

export function splashGrid(cssWidth: number, cssHeight: number): { width: number; height: number } {
  const width = Math.max(1, Math.min(COLUMNS, Math.round(cssWidth / MIN_DOT)));
  return { width, height: Math.max(1, Math.round((width * cssHeight) / cssWidth)) };
}
