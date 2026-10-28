/** Log-spaced `[start, end)` bin ranges for `bars` analyzer bars over `binCount` FFT bins. Bin 0 (DC) is
 * skipped, and every band gets at least one bin so the bass end does not collapse.
 */
export function spectrumBands(binCount: number, bars: number): [number, number][] {
  const edges = [1];
  for (let i = 1; i <= bars; i++) {
    const edge = i === bars ? binCount : Math.floor(binCount ** (i / bars));
    edges.push(Math.max(edge, edges[i - 1] + 1));
  }
  return edges.slice(0, -1).map((start, i) => [start, edges[i + 1]]);
}

/** Each bar's level in 0..1: the loudest bin in its band. */
export function binSpectrum(data: Uint8Array, bars: number): number[] {
  return spectrumBands(data.length, bars).map(([start, end]) => {
    let peak = 0;
    for (let i = start; i < end; i++) peak = Math.max(peak, data[i]);
    return peak / 255;
  });
}

/** Peak caps drop by `fall` a frame and get pushed back up by louder levels. */
export function fallPeaks(peaks: readonly number[], levels: readonly number[], fall: number): number[] {
  return levels.map((level, i) => Math.max(level, (peaks[i] ?? 0) - fall));
}
