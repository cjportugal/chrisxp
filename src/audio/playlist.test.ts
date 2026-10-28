import { describe, expect, it } from 'vitest';
import { nextIndex, prevIndex } from './playlist';

const plain = { shuffle: false, repeat: false };

describe('nextIndex', () => {
  it('advances in order', () => {
    expect(nextIndex(0, 3, plain)).toBe(1);
  });

  it('stops after the last track without repeat', () => {
    expect(nextIndex(2, 3, plain)).toBeNull();
  });

  it('wraps to the first track with repeat', () => {
    expect(nextIndex(2, 3, { shuffle: false, repeat: true })).toBe(0);
  });

  it('picks a different random track when shuffling', () => {
    const random = () => 0; // would pick 0 again, so it must skip past the current one
    expect(nextIndex(0, 3, { shuffle: true, repeat: false }, random)).toBe(1);
    expect(nextIndex(1, 3, { shuffle: true, repeat: false }, () => 0.99)).toBe(2);
    expect(nextIndex(2, 3, { shuffle: true, repeat: false }, () => 0.99)).toBe(1);
  });

  it('replays the only track when shuffling or repeating a one-track list', () => {
    expect(nextIndex(0, 1, { shuffle: true, repeat: false })).toBe(0);
    expect(nextIndex(0, 1, { shuffle: false, repeat: true })).toBe(0);
    expect(nextIndex(0, 1, plain)).toBeNull();
  });

  it('has nowhere to go in an empty list', () => {
    expect(nextIndex(0, 0, { shuffle: true, repeat: true })).toBeNull();
  });
});

describe('prevIndex', () => {
  it('steps back in order', () => {
    expect(prevIndex(2, 3, plain)).toBe(1);
  });

  it('stays on the first track without repeat', () => {
    expect(prevIndex(0, 3, plain)).toBe(0);
  });

  it('wraps to the last track with repeat', () => {
    expect(prevIndex(0, 3, { shuffle: false, repeat: true })).toBe(2);
  });
});
