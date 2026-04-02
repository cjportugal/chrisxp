import { useEffect, useRef } from 'react';
import type { AppType } from '../apps/registry';
import { appIds, getAppDefinition } from '../apps/registry';
import { useWindowStore } from '../store/windowStore';

interface Props {
  onClose: () => void;
}

interface StartMenuEntry {
  appId: AppType;
  label: string;
  icon: string;
  showArrow: boolean;
}

const START_MENU_ITEMS: StartMenuEntry[] = appIds.flatMap((appId) => {
  const appDefinition = getAppDefinition(appId);
  if (!appDefinition.startMenuItem) {
    return [];
  }

  return [
    {
      appId,
      label: appDefinition.startMenuItem.label,
      icon: appDefinition.startMenuItem.icon,
      showArrow: appDefinition.startMenuItem.showArrow,
    },
  ];
});

export default function StartMenu({ onClose }: Props) {
  const { openWindow } = useWindowStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const assetBase = import.meta.env.BASE_URL;

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

  const handleOpenApp = (appId: AppType) => {
    openWindow(appId);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        bottom: 29,
        left: 0,
        width: 274,
        background: '#b8c0c1',
        zIndex: 10000,
        overflow: 'hidden',
        fontFamily: "'MS Sans Serif', Tahoma, sans-serif",
        boxShadow:
          'inset -1px -1px 0 0 #0a0a0a, inset 1px 1px 0 0 #dfdfdf, inset -2px -2px 0 0 #808080, inset 2px 2px 0 0 white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', flex: 1 }}>
        <div
          style={{
            width: 21,
            background: '#000a71',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: 8,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: 16,
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              letterSpacing: 2,
              userSelect: 'none',
            }}
          >
            ChrisXP
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {START_MENU_ITEMS.map((menuItem) => (
            <div
              key={menuItem.appId}
              className="start-menu-item"
              onClick={() => handleOpenApp(menuItem.appId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '3px 8px',
                cursor: 'pointer',
                height: 54,
                boxSizing: 'border-box',
              }}
            >
              <img src={menuItem.icon} alt="" style={{ width: 32, height: 32 }} />
              <span className="start-menu-label" style={{ fontSize: 13, color: '#000000', flex: 1 }}>
                {menuItem.label}
              </span>
              {menuItem.showArrow ? (
                <span className="start-menu-arrow" style={{ fontSize: 10, color: '#000000' }}>
                  {'>'}
                </span>
              ) : null}
            </div>
          ))}

          <div style={{ borderTop: '1px solid #808080', borderBottom: '1px solid #dfdfdf' }} />

          <div
            className="start-menu-item"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '3px 8px',
              cursor: 'pointer',
              height: 54,
              boxSizing: 'border-box',
            }}
          >
            <img src={`${import.meta.env.BASE_URL}windows-logo.png`} alt="" style={{ width: 32, height: 32 }} />
            <span className="start-menu-label" style={{ fontSize: 13, color: '#000000', flex: 1 }}>
              Shut Down...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
