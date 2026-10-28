import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AppType } from '../apps/registry';
import { dockAppIds, getAppDefinition } from '../apps/registry';
import { bayerRampSvg } from '../effects/dither';
import { useThemeStore } from '../store/themeStore';
import { useTrashStore } from '../store/trashStore';
import { useWindowStore } from '../store/windowStore';
import { GLYPHS } from '../theme/glyphs';
import { PLAYER_WIDTH } from '../theme/layout';
import PixelIcon from './PixelIcon';

const ICON_SIZE = 48;
const ICON_SIZE_MAX = 96;
/** Height of an icon's slot in the tray. Shorter than the icon, so even resting icons peek over the top. */
const ICON_SLOT = 36;
/** Sizes snap to this grid so the magnification moves in visible steps. */
const SIZE_STEP = 2;
/** How far from the pointer, in px of the resting layout, an icon still swells. */
const MAGNIFY_RADIUS = 240;
/** The magnification is deliberately a little choppy: it only advances this many times a second. */
const MAGNIFY_FPS = 12;
/** Share of the remaining gap an icon closes each frame. */
const MAGNIFY_EASE = 0.7;

const mainApps = dockAppIds.filter((id) => id !== 'trash');
const dockApps: AppType[] = [...mainApps, 'trash'];

/** Paper screen-door over the glass, in 2px cells: a solid rim, a sheen fading into a thin body, and a
 * denser floor below the shelf line (cell 18, 36px down) for the reflections to sit on.
 */
const FROST = bayerRampSvg(4, 64, '#f2f1ea', (y) => {
  if (y < 1) return 1;
  if (y >= 18) return 0.45;
  return 0.3 + 0.35 * Math.max(0, 1 - (y - 1) / 10);
});
/** The reflection fades out as it falls away from the shelf. */
const REFLECTION_MASK = bayerRampSvg(4, 12, '#000', (y) => 0.55 * (1 - y / 10));

const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

function targetSize(distance: number | null): number {
  if (distance === null || Math.abs(distance) >= MAGNIFY_RADIUS) return ICON_SIZE;
  const falloff = (Math.cos((Math.PI * distance) / MAGNIFY_RADIUS) + 1) / 2;
  return Math.round((ICON_SIZE + (ICON_SIZE_MAX - ICON_SIZE) * falloff) / SIZE_STEP) * SIZE_STEP;
}

/** One frame: close part of the gap, but always move at least one grid step so it lands. */
function approach(size: number, target: number): number {
  if (reducedMotion?.matches) return target;
  const delta = target - size;
  if (Math.abs(delta) <= SIZE_STEP) return target;
  const step = Math.max(SIZE_STEP, Math.round((Math.abs(delta) * MAGNIFY_EASE) / SIZE_STEP) * SIZE_STEP);
  return size + Math.sign(delta) * step;
}

/** Bottom tray of pixel icons on fake frosted glass. Icons near the pointer swell, macOS style, at 12fps. */
export default function Dock() {
  const windows = useWindowStore((state) => state.windows);
  const winampOpen = useWindowStore((state) => state.winampOpen);
  const openWindow = useWindowStore((state) => state.openWindow);
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);
  const shakeToken = useTrashStore((state) => state.shakeToken);
  const pattern = useThemeStore((state) => state.pattern);
  const glassDataUrl = useThemeStore((state) => state.glassDataUrl);

  const trayRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  /** Item centers relative to the tray center, measured once while every icon is at rest. */
  const restOffsets = useRef<number[]>([]);
  /** Pointer x relative to the tray center, or null when nothing is magnified. */
  const pointer = useRef<number | null>(null);
  const frame = useRef(0);
  const [sizes, setSizes] = useState<number[]>(() => dockApps.map(() => ICON_SIZE));
  const sizesRef = useRef(sizes);

  useLayoutEffect(() => {
    const tray = trayRef.current;
    if (!tray) return;
    const box = tray.getBoundingClientRect();
    const center = box.left + box.width / 2;
    restOffsets.current = itemRefs.current.map((item) => {
      const itemBox = item?.getBoundingClientRect();
      return itemBox ? itemBox.left + itemBox.width / 2 - center : 0;
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /** Runs a rAF loop that only steps every 1/15s, and stops once every icon has reached its target. */
  const animate = () => {
    if (frame.current) return;
    let last = 0;
    const tick = (now: number) => {
      if (now - last >= 1000 / MAGNIFY_FPS) {
        last = now;
        const x = pointer.current;
        const targets = restOffsets.current.map((offset) => targetSize(x === null ? null : x - offset));
        const next = sizesRef.current.map((size, i) => approach(size, targets[i] ?? ICON_SIZE));
        sizesRef.current = next;
        setSizes(next);
        if (next.every((size, i) => size === (targets[i] ?? ICON_SIZE))) {
          frame.current = 0;
          return;
        }
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  const pointAt = (x: number | null) => {
    pointer.current = x;
    animate();
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const box = trayRef.current?.getBoundingClientRect();
    if (box) pointAt(event.clientX - (box.left + box.width / 2));
  };

  const isRunning = (app: AppType) => (app === 'winamp' ? winampOpen : windows.some((w) => w.app === app));

  const activate = (app: AppType) => {
    const own = windows.filter((w) => w.app === app);
    if (app === 'winamp' || own.length === 0) {
      openWindow(app);
      return;
    }
    const minimized = own.find((w) => w.minimized);
    if (minimized) {
      restoreWindow(minimized.id);
      focusWindow(minimized.id);
      return;
    }
    const top = own.reduce((best, w) => (w.zIndex > best.zIndex ? w : best));
    focusWindow(top.id);
  };

  const renderItem = (app: AppType, index: number) => {
    const definition = getAppDefinition(app);
    const glyph = app === 'trash' ? GLYPHS.trash : definition.icon;
    return (
      <DockItem
        key={app}
        ref={(node) => {
          itemRefs.current[index] = node;
        }}
        label={definition.title}
        size={sizes[index]}
        running={isRunning(app)}
        shakeToken={app === 'trash' ? shakeToken : 0}
        onClick={() => activate(app)}
        onFocus={(event) => {
          // Keyboard focus magnifies like a hover; a click's focus leaves the pointer in charge.
          if (event.currentTarget.matches(':focus-visible')) pointAt(restOffsets.current[index] ?? null);
        }}
        onBlur={() => pointAt(null)}
      >
        {(size) => <PixelIcon glyph={glyph} size={size} alt="" />}
      </DockItem>
    );
  };

  const glassStyle = {
    '--cx-glass-frost': FROST,
    '--cx-glass-image': glassDataUrl ? `url("${glassDataUrl}")` : 'none',
  } as CSSProperties;

  return (
    <div className="cx-dock-band" style={{ right: winampOpen ? PLAYER_WIDTH : 0 }}>
      <div
        ref={trayRef}
        className="cx-dock cx-ui"
        role="toolbar"
        aria-label="Dock"
        style={glassStyle}
        onPointerMove={onPointerMove}
        onPointerLeave={() => pointAt(null)}
      >
        {/* Keeps the pointer "in" the dock while it is over the magnified icons poking above the tray. */}
        <div
          className="cx-dock__hitzone"
          data-active={sizes.some((size) => size > ICON_SIZE) ? 'true' : 'false'}
          style={{ height: ICON_SIZE_MAX - ICON_SLOT + 8 }}
        />
        <div className="cx-dock__glass" data-pattern={glassDataUrl ? pattern : 'flat'} aria-hidden="true" />
        {mainApps.map(renderItem)}
        <div className="cx-dock__separator" />
        {renderItem('trash', mainApps.length)}
      </div>
    </div>
  );
}

interface DockItemProps {
  ref: React.Ref<HTMLDivElement>;
  label: string;
  /** Current icon width in px; the slot widens with it so neighbors make room. */
  size: number;
  running: boolean;
  /** Remounts the icon on change so its jiggle keyframes replay; 0 means never shaken. */
  shakeToken: number;
  onClick: () => void;
  onFocus: (event: React.FocusEvent<HTMLDivElement>) => void;
  onBlur: () => void;
  children: (size: number) => React.ReactNode;
}

function DockItem({ ref, label, size, running, shakeToken, onClick, onFocus, onBlur, children }: DockItemProps) {
  const [hover, setHover] = useState(false);

  return (
    <div
      ref={ref}
      className="cx-dock__item"
      role="button"
      tabIndex={0}
      aria-label={label}
      data-running={running ? 'true' : 'false'}
      style={{ width: size + 8, '--cx-dock-lift': `${size - ICON_SLOT}px` } as CSSProperties}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {hover && <span className="cx-dock__tooltip">{label}</span>}
      <span
        key={shakeToken}
        className="cx-dock__icon"
        data-shaking={shakeToken > 0 ? 'true' : 'false'}
      >
        {children(size)}
      </span>
      <span className="cx-dock__reflection" style={{ '--cx-reflection-mask': REFLECTION_MASK } as CSSProperties}>
        {children(size)}
      </span>
      <span className="cx-dock__dot" />
    </div>
  );
}
