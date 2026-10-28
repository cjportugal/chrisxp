import { describe, expect, it } from 'vitest';
import { useWindowStore } from './windowStore';

describe('toggleWinamp', () => {
  it('opens the player column and closes it again', () => {
    useWindowStore.setState({ winampOpen: false });
    useWindowStore.getState().toggleWinamp();
    expect(useWindowStore.getState().winampOpen).toBe(true);
    useWindowStore.getState().toggleWinamp();
    expect(useWindowStore.getState().winampOpen).toBe(false);
  });
});
