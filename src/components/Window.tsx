import { Rnd } from 'react-rnd';
import { appDefinitions } from '../apps/registry';
import { useWindowStore } from '../store/windowStore';
import type { WindowState } from '../store/windowStore';

interface Props {
  window: WindowState;
}

const TASKBAR_HEIGHT = 40;

export default function Window({ window: windowState }: Props) {
  const {
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    updatePosition,
    updateSize,
  } = useWindowStore();

  const AppComponent = appDefinitions[windowState.app].Component;

  const frame = windowState.maximized
    ? {
        x: 0,
        y: 0,
        width: globalThis.innerWidth,
        height: globalThis.innerHeight - TASKBAR_HEIGHT,
      }
    : {
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
      };

  return (
    <Rnd
      position={{ x: frame.x, y: frame.y }}
      size={{ width: frame.width, height: frame.height }}
      style={{
        zIndex: windowState.zIndex,
        display: windowState.minimized ? 'none' : 'flex',
        flexDirection: 'column',
      }}
      disableDragging={windowState.maximized}
      enableResizing={!windowState.maximized}
      minWidth={200}
      minHeight={150}
      dragHandleClassName="title-bar"
      onDragStop={(_event, dragData) => updatePosition(windowState.id, dragData.x, dragData.y)}
      onResizeStop={(_event, _direction, ref, _delta, position) => {
        updateSize(windowState.id, ref.offsetWidth, ref.offsetHeight);
        updatePosition(windowState.id, position.x, position.y);
      }}
      onMouseDown={() => focusWindow(windowState.id)}
    >
      <div className="window" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="title-bar" style={{ cursor: 'move', flexShrink: 0 }}>
          <div className="title-bar-text">{windowState.title}</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize" onClick={() => minimizeWindow(windowState.id)} />
            <button aria-label="Maximize" onClick={() => maximizeWindow(windowState.id)} />
            <button aria-label="Close" onClick={() => closeWindow(windowState.id)} />
          </div>
        </div>
        <div className="window-body" style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
          <AppComponent />
        </div>
      </div>
    </Rnd>
  );
}
