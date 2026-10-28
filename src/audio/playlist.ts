export interface PlayOrder {
  shuffle: boolean;
  /** Repeat the whole playlist, like Winamp's repeat button. */
  repeat: boolean;
}

/** The track after `index`, or null when playback should stop. Shuffle never picks the current track
 * twice in a row (unless it is the only one) and never runs out.
 */
export function nextIndex(index: number, count: number, order: PlayOrder, random: () => number = Math.random): number | null {
  if (count === 0) return null;
  if (count === 1) return order.shuffle || order.repeat ? 0 : null;
  if (order.shuffle) {
    const pick = Math.floor(random() * (count - 1));
    return pick >= index ? pick + 1 : pick;
  }
  if (index + 1 < count) return index + 1;
  return order.repeat ? 0 : null;
}

/** The track before `index`; the first track stays put unless repeat wraps it to the last. */
export function prevIndex(index: number, count: number, order: PlayOrder): number {
  if (index > 0) return index - 1;
  return order.repeat ? Math.max(0, count - 1) : 0;
}
