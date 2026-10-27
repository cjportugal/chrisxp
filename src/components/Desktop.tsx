import { dockAppIds, getAppDefinition } from '../apps/registry';
import { glyphToSvgDataUrl } from '../theme/glyphs';
import Winamp from '../apps/Winamp';
import { useWindowStore } from '../store/windowStore';
import DesktopIcon from './DesktopIcon';
import Taskbar from './Taskbar';
import Wallpaper from './Wallpaper';
import Window from './Window';

interface DesktopIconItem {
  key: string;
  label: string;
  img: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

export default function Desktop() {
  const { windows, winampOpen, openWindow } = useWindowStore();
  const desktopIconItems: DesktopIconItem[] = [];

  for (const appId of dockAppIds) {
    const appDefinition = getAppDefinition(appId);
    desktopIconItems.push({
      key: appDefinition.id,
      label: appDefinition.title,
      img: glyphToSvgDataUrl(appDefinition.icon),
      onClick: () => openWindow(appDefinition.id),
    });
  }

  return (
    <div
      id="desktop-root"
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#3a6ea5',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Wallpaper />

      <div
        id="webamp-host"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          pointerEvents: 'none',
        }}
      />

      <div
        id="desktop-foreground"
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              width: 75,
              padding: '8px 0',
              zIndex: 2,
            }}
          >
            {desktopIconItems.map((icon) => (
              <DesktopIcon
                key={icon.key}
                label={icon.label}
                img={icon.img}
                onClick={icon.onClick}
                onDoubleClick={icon.onDoubleClick}
              />
            ))}
          </div>

          {windows.map((windowState) => (
            <Window key={windowState.id} window={windowState} />
          ))}

          {winampOpen && <Winamp />}
        </div>

        <Taskbar />
      </div>
    </div>
  );
}
