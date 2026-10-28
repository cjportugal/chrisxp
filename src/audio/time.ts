/** Seconds as Winamp's `m:ss`; `remaining` adds the minus sign of the countdown display. */
export function formatTime(seconds: number, remaining = false): string {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const text = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  return remaining ? `-${text}` : text;
}
