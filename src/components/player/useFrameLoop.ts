import { useEffect, useRef } from 'react';

/** Calls `onFrame` from requestAnimationFrame at most `fps` times a second while `active`. */
export function useFrameLoop(onFrame: () => void, fps: number, active = true) {
  const callback = useRef(onFrame);
  useEffect(() => {
    callback.current = onFrame;
  });

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last >= 1000 / fps - 1) {
        last = now;
        callback.current();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fps, active]);
}
