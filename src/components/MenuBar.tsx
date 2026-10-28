import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useThemeStore, WALLPAPERS } from '../store/themeStore';
import type { WallpaperPattern } from '../store/themeStore';
import { useTrashStore } from '../store/trashStore';
import { useWindowStore, selectActiveWindowId } from '../store/windowStore';
import { GLYPHS } from '../theme/glyphs';
import { MENUBAR_HEIGHT } from '../theme/layout';
import PixelIcon from './PixelIcon';

type MenuEntry =
  | 'separator'
  | {
      label: string;
      action?: () => void;
      checked?: boolean;
      disabled?: boolean;
      submenu?: MenuEntry[];
    };

interface Menu {
  id: string;
  label: ReactNode;
  items: MenuEntry[];
}

/** Click opens a menu, hovering another title switches while one is open, any outside mousedown closes. */
function useMenuState() {
  const [openId, setOpenId] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openId) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) setOpenId(null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [openId]);

  return {
    openId,
    barRef,
    toggle: (id: string) => setOpenId((current) => (current === id ? null : id)),
    hover: (id: string) => setOpenId((current) => (current ? id : current)),
    close: () => setOpenId(null),
  };
}

function formatClock(date: Date): string {
  const day = date.toLocaleDateString([], { weekday: 'short' });
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${day} ${time}`;
}

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return formatClock(now);
}

export default function MenuBar() {
  const { barRef, openId, toggle, hover, close } = useMenuState();
  const clock = useClock();
  const openWindow = useWindowStore((state) => state.openWindow);
  const closeWindow = useWindowStore((state) => state.closeWindow);
  const closeAll = useWindowStore((state) => state.closeAll);
  const activeWindowId = useWindowStore(selectActiveWindowId);
  const hasWindows = useWindowStore((state) => state.windows.length > 0);
  const wallpaperId = useThemeStore((state) => state.wallpaperId);
  const pattern = useThemeStore((state) => state.pattern);
  const setWallpaper = useThemeStore((state) => state.setWallpaper);
  const setPattern = useThemeStore((state) => state.setPattern);
  const shakeTrash = useTrashStore((state) => state.shake);
  const winampOpen = useWindowStore((state) => state.winampOpen);
  const toggleWinamp = useWindowStore((state) => state.toggleWinamp);
  const playing = usePlayerStore((state) => state.status === 'playing');
  const canStepPreset = usePlayerStore((state) => state.presetStepper !== null);
  const player = usePlayerStore.getState();

  const restart = () => location.reload();
  const patternItem = (label: string, value: WallpaperPattern): MenuEntry => ({
    label,
    checked: pattern === value,
    action: () => setPattern(value),
  });

  const menus: Menu[] = [
    {
      id: 'chrisxp',
      label: <PixelIcon glyph={GLYPHS.chrisxp} alt="ChrisXP" />,
      items: [{ label: 'About ChrisXP…', action: () => openWindow('about') }, 'separator', { label: 'Restart…', action: restart }],
    },
    {
      id: 'file',
      label: 'File',
      items: [
        { label: 'Close Window', disabled: !activeWindowId, action: () => activeWindowId && closeWindow(activeWindowId) },
        { label: 'Close All', disabled: !hasWindows, action: closeAll },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          label: 'Wallpaper',
          submenu: WALLPAPERS.map((wallpaper) => ({
            label: wallpaper.name,
            checked: pattern === 'photo' && wallpaper.id === wallpaperId,
            action: () => void setWallpaper(wallpaper.id),
          })),
        },
        'separator',
        patternItem('Photo', 'photo'),
        patternItem('Gray', 'gray'),
        patternItem('Flat', 'flat'),
      ],
    },
    {
      id: 'winamp',
      label: 'Winamp',
      items: [
        { label: playing ? 'Pause' : 'Play', disabled: !winampOpen, action: () => void player.togglePlay() },
        { label: 'Stop', disabled: !winampOpen, action: player.stop },
        { label: 'Previous', disabled: !winampOpen, action: () => void player.prev() },
        { label: 'Next', disabled: !winampOpen, action: () => void player.next() },
        'separator',
        { label: 'Next Preset', disabled: !canStepPreset, action: player.nextPreset },
        'separator',
        { label: 'Show Winamp', checked: winampOpen, action: toggleWinamp },
      ],
    },
    {
      id: 'special',
      label: 'Special',
      items: [{ label: 'Empty Trash', action: shakeTrash }, 'separator', { label: 'Restart…', action: restart }],
    },
  ];

  return (
    <div ref={barRef} className="cx-menubar cx-ui" style={{ height: MENUBAR_HEIGHT }} role="menubar">
      {menus.map((item) => (
        <MenuTitle
          key={item.id}
          menu={item}
          open={openId === item.id}
          onToggle={() => toggle(item.id)}
          onHover={() => hover(item.id)}
          onClose={close}
        />
      ))}
      <span className="cx-menubar__clock">{clock}</span>
    </div>
  );
}

interface MenuTitleProps {
  menu: Menu;
  open: boolean;
  onToggle: () => void;
  onHover: () => void;
  onClose: () => void;
}

function MenuTitle({ menu, open, onToggle, onHover, onClose }: MenuTitleProps) {
  return (
    <div className="cx-menu" data-open={open ? 'true' : 'false'}>
      <div
        className="cx-menu__title"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(event) => {
          event.preventDefault();
          onToggle();
        }}
        onMouseEnter={onHover}
      >
        {menu.label}
      </div>
      {open && <MenuList items={menu.items} onClose={onClose} />}
    </div>
  );
}

function MenuList({ items, onClose }: { items: MenuEntry[]; onClose: () => void }) {
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);

  return (
    <div className="cx-menu__list" role="menu">
      {items.map((item, index) => {
        if (item === 'separator') return <div key={index} className="cx-menu__separator" role="separator" />;
        const submenuOpen = openSubmenu === index && !!item.submenu;
        return (
          <div
            key={index}
            className="cx-menu__item"
            role="menuitem"
            aria-disabled={item.disabled || undefined}
            data-checked={item.checked ? 'true' : undefined}
            data-submenu={item.submenu ? 'true' : undefined}
            onMouseEnter={() => setOpenSubmenu(item.submenu ? index : null)}
            onMouseUp={() => {
              if (item.disabled || item.submenu) return;
              item.action?.();
              onClose();
            }}
          >
            <span className="cx-menu__check">{item.checked ? '✓' : ''}</span>
            <span className="cx-menu__label">{item.label}</span>
            {item.submenu && <span className="cx-menu__arrow">▶</span>}
            {submenuOpen && item.submenu && (
              <div className="cx-menu__submenu">
                <MenuList items={item.submenu} onClose={onClose} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
