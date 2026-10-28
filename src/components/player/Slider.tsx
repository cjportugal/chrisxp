import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

interface Props {
  label: string;
  value: number;
  max: number;
  /** Arrow-key step, in the same units as `value`. */
  step: number;
  /** Called while dragging when `live`, and always on release. */
  onChange: (value: number) => void;
  /** Report every move while dragging (volume), or only on release (seeking). */
  live?: boolean;
  disabled?: boolean;
  valueText?: string;
}

/** A 1-bit slider: a 1px ink rule and a paper thumb with a hard shadow. Click anywhere on it to jump. */
export default function Slider({ label, value, max, step, onChange, live = false, disabled = false, valueText }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;
  const ratio = max > 0 ? Math.min(1, Math.max(0, shown / max)) : 0;

  const valueAt = (clientX: number) => {
    const box = trackRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return 0;
    return (Math.min(1, Math.max(0, (clientX - box.left) / box.width)) || 0) * max;
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const next = valueAt(event.clientX);
    setDrag(next);
    if (live) onChange(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    onChange(Math.min(max, Math.max(0, value + delta)));
  };

  return (
    <div
      className="cx-player__slider"
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      onKeyDown={disabled ? undefined : onKeyDown}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={(event) => {
        if (drag !== null) move(event);
      }}
      onPointerUp={(event) => {
        if (drag === null) return;
        onChange(valueAt(event.clientX));
        setDrag(null);
      }}
      onPointerCancel={() => setDrag(null)}
    >
      <div ref={trackRef} className="cx-player__slider-track">
        <div className="cx-player__slider-thumb" style={{ left: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
