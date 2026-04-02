import { useState } from 'react';
import type { AppType } from '../apps/registry';
import { getAppDefinition } from '../apps/registry';
import Winamp from '../apps/Winamp';
import { useWindowStore } from '../store/windowStore';
import DesktopIcon from './DesktopIcon';
import Taskbar from './Taskbar';
import Window from './Window';

const bgModules = import.meta.glob('../assets/bg/*.{jpg,jpeg,png,gif,webp,avif}', {
  eager: true,
  import: 'default',
  query: '?url',
});
const bgList = Object.values(bgModules as Record<string, string>).sort();

type DesktopOrderItem = AppType | 'recycle-bin' | 'change-background';

const DESKTOP_ICON_ORDER: DesktopOrderItem[] = [
  'terminal',
  'recycle-bin',
  'winamp',
  'change-background',
  'diablo',
];

interface DesktopIconItem {
  key: string;
  label: string;
  img: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

export default function Desktop() {
  const { windows, winampOpen, openWindow } = useWindowStore();
  const [bgIndex, setBgIndex] = useState<number | null>(null);

  const handleChangeBackground = () => {
    if (bgList.length === 0) {
      return;
    }

    setBgIndex((currentIndex) => {
      if (currentIndex === null) {
        return 0;
      }

      if (currentIndex >= bgList.length - 1) {
        return null;
      }

      return currentIndex + 1;
    });
  };

  const desktopIconItems: DesktopIconItem[] = [];

  for (const item of DESKTOP_ICON_ORDER) {
    if (item === 'recycle-bin') {
      desktopIconItems.push({ key: item, label: 'Recycle Bin', img: `${import.meta.env.BASE_URL}icon-recycle-bin.png` });
      continue;
    }

    if (item === 'change-background') {
      desktopIconItems.push({
        key: item,
        label: 'Change Background',
        img: `${import.meta.env.BASE_URL}icon-change-bg.png`,
        onClick: handleChangeBackground,
      });
      continue;
    }

    const appDefinition = getAppDefinition(item);
    if (!appDefinition.desktopIcon) {
      continue;
    }

    desktopIconItems.push({
      key: appDefinition.id,
      label: appDefinition.desktopIcon.label,
      img: appDefinition.desktopIcon.img,
      onClick: () => openWindow(appDefinition.id),
    });
  }

  const bgImage = bgIndex !== null ? `url(${bgList[bgIndex]})` : 'none';

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
      <div
        className="desktop-wallpaper"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: bgImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0,
        }}
      />

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
