import { describe, expect, it } from 'vitest';
import { formatTime } from './time';

describe('formatTime', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(201.9)).toBe('3:21');
    expect(formatTime(3725)).toBe('62:05');
  });

  it('prefixes remaining time with a minus', () => {
    expect(formatTime(61, true)).toBe('-1:01');
  });

  it('treats unknown durations as zero', () => {
    expect(formatTime(Number.NaN)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });
});
