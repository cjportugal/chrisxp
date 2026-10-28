import { describe, expect, it } from 'vitest';
import { binSpectrum, fallPeaks, spectrumBands } from './spectrum';

describe('spectrumBands', () => {
  it('splits the bins into log-spaced, non-empty, contiguous bands that skip DC', () => {
    const bands = spectrumBands(512, 19);
    expect(bands).toHaveLength(19);
    expect(bands[0][0]).toBe(1);
    for (let i = 0; i < bands.length; i++) {
      const [start, end] = bands[i];
      expect(end).toBeGreaterThan(start);
      if (i > 0) expect(start).toBe(bands[i - 1][1]);
    }
    expect(bands[18][1]).toBe(512);
    // Log spacing: the top band is far wider than the bottom one.
    expect(bands[18][1] - bands[18][0]).toBeGreaterThan(10 * (bands[0][1] - bands[0][0]));
  });
});

describe('binSpectrum', () => {
  it('puts a bass spike in the first bar and a treble spike in the last', () => {
    const data = new Uint8Array(512);
    data[1] = 255;
    data[500] = 128;
    const levels = binSpectrum(data, 19);
    expect(levels[0]).toBe(1);
    expect(levels[18]).toBeCloseTo(128 / 255);
    expect(levels.slice(1, 18).every((level) => level === 0)).toBe(true);
  });
});

describe('fallPeaks', () => {
  it('lets caps fall by a step but never below the current level', () => {
    expect(fallPeaks([1, 0.5, 0.1], [0.2, 0.6, 0], 0.25)).toEqual([0.75, 0.6, 0]);
  });
});
