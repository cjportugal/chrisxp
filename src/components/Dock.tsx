import { useState } from 'react';
import type { AppType } from '../apps/registry';
import { dockAppIds, getAppDefinition } from '../apps/registry';
import { useTrashStore } from '../store/trashStore';
import { useWindowStore } from '../store/windowStore';
import { GLYPHS } from '../theme/glyphs';
import PixelIcon from './PixelIcon';

const ICON_SIZE = 48;
const ICON_SIZE_HOVER = 64;

const mainApps = dockAppIds.filter((id) => id !== 'trash');

/** Bottom tray of pixel icons. Hover magnifies in one step; a square under an icon marks a running app. */
export default function Dock() {
  const windows = useWindowStore((state) => state.windows);
  const winampOpen = useWindowStore((state) => state.winampOpen);
  const openWindow = useWindowStore((state) => state.openWindow);
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);
  const shakeToken = useTrashStore((state) => state.shakeToken);

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

  const renderItem = (app: AppType) => {
    const definition = getAppDefinition(app);
    const glyph = app === 'trash' ? GLYPHS.trash : definition.icon;
    return (
      <DockItem
        key={app}
        label={definition.title}
        running={isRunning(app)}
        shakeToken={app === 'trash' ? shakeToken : 0}
        onClick={() => activate(app)}
      >
        {(size) => <PixelIcon glyph={glyph} size={size} alt="" />}
      </DockItem>
    );
  };

  return (
    <div className="cx-dock-band">
      <div className="cx-dock cx-ui" role="toolbar" aria-label="Dock">
        {mainApps.map(renderItem)}
        <div className="cx-dock__separator" />
        {renderItem('trash')}
      </div>
    </div>
  );
}

interface DockItemProps {
  label: string;
  running: boolean;
  /** Remounts the icon on change so its jiggle keyframes replay; 0 means never shaken. */
  shakeToken: number;
  onClick: () => void;
  children: (size: number) => React.ReactNode;
}

function DockItem({ label, running, shakeToken, onClick, children }: DockItemProps) {
  const [hover, setHover] = useState(false);
  const size = hover ? ICON_SIZE_HOVER : ICON_SIZE;

  return (
    <div
      className="cx-dock__item"
      role="button"
      tabIndex={0}
      aria-label={label}
      data-running={running ? 'true' : 'false'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
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
        style={{ width: size, height: size }}
      >
        {children(size)}
      </span>
      <span className="cx-dock__dot" />
    </div>
  );
}
