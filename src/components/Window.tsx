import { Rnd } from 'react-rnd';
import { appDefinitions } from '../apps/registry';
import { useActiveWindowId, useWindowStore } from '../store/windowStore';
import type { WindowState } from '../store/windowStore';
import { GLYPHS } from '../theme/glyphs';
import { DOCK_HEIGHT, MENUBAR_HEIGHT } from '../theme/layout';
import PixelIcon from './PixelIcon';

interface Props {
  window: WindowState;
}

const MIN_WIDTH = 200;
const MIN_HEIGHT = 120;

/** A System 1 window frame with Windows 3.1 minimize/zoom boxes, dragged and resized by react-rnd. */
export default function Window({ window: windowState }: Props) {
  const closeWindow = useWindowStore((state) => state.closeWindow);
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const maximizeWindow = useWindowStore((state) => state.maximizeWindow);
  const focusWindow = useWindowStore((state) => state.focusWindow);
  const updatePosition = useWindowStore((state) => state.updatePosition);
  const updateSize = useWindowStore((state) => state.updateSize);
  const active = useActiveWindowId() === windowState.id;

  const definition = appDefinitions[windowState.app];
  const AppComponent = definition.Component;
  const resizable = definition.resizable && !windowState.maximized;

  // The windows layer starts under the menubar, so a zoomed window fills from 0 to the dock.
  const frame = windowState.maximized
    ? { x: 0, y: 0, width: globalThis.innerWidth, height: globalThis.innerHeight - MENUBAR_HEIGHT - DOCK_HEIGHT }
    : { x: windowState.x, y: windowState.y, width: windowState.width, height: windowState.height };

  return (
    <Rnd
      position={{ x: frame.x, y: frame.y }}
      size={{ width: frame.width, height: frame.height }}
      style={{ zIndex: windowState.zIndex, display: windowState.minimized ? 'none' : 'block' }}
      disableDragging={windowState.maximized}
      enableResizing={resizable}
      minWidth={MIN_WIDTH}
      minHeight={MIN_HEIGHT}
      dragHandleClassName="cx-titlebar"
      cancel=".cx-titlebar__box"
      onDragStop={(_event, dragData) => updatePosition(windowState.id, dragData.x, dragData.y)}
      onResizeStop={(_event, _direction, ref, _delta, position) => {
        updateSize(windowState.id, ref.offsetWidth, ref.offsetHeight);
        updatePosition(windowState.id, position.x, position.y);
      }}
      onMouseDown={() => focusWindow(windowState.id)}
    >
      <div className="window cx-window cx-ui" data-active={active ? 'true' : 'false'} data-app={windowState.app}>
        <div className="cx-titlebar" onDoubleClick={() => definition.resizable && maximizeWindow(windowState.id)}>
          <button
            type="button"
            className="cx-titlebar__box cx-titlebar__box--close"
            aria-label="Close"
            onClick={() => closeWindow(windowState.id)}
          >
            <PixelIcon glyph={GLYPHS.closeBox} />
          </button>
          <span className="cx-titlebar__center">
            <span className="cx-titlebar__title">{windowState.title}</span>
          </span>
          <span className="cx-titlebar__controls">
            <button
              type="button"
              className="cx-titlebar__box"
              aria-label="Minimize"
              onClick={() => minimizeWindow(windowState.id)}
            >
              <PixelIcon glyph={GLYPHS.arrowDown} />
            </button>
            {definition.resizable && (
              <button
                type="button"
                className="cx-titlebar__box"
                aria-label={windowState.maximized ? 'Restore' : 'Zoom'}
                onClick={() => maximizeWindow(windowState.id)}
              >
                <PixelIcon glyph={windowState.maximized ? GLYPHS.arrowUp : GLYPHS.zoomBox} />
              </button>
            )}
          </span>
        </div>
        <div className="cx-window__body">
          <AppComponent />
        </div>
        {resizable && <PixelIcon glyph={GLYPHS.resizeGrip} className="cx-window__grip" />}
      </div>
    </Rnd>
  );
}
