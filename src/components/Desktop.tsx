import Winamp from '../apps/Winamp';
import { useWindowStore } from '../store/windowStore';
import { MENUBAR_HEIGHT } from '../theme/layout';
import Dock from './Dock';
import MenuBar from './MenuBar';
import Wallpaper from './Wallpaper';
import Window from './Window';

/** The desktop after boot: wallpaper, menubar, windows, Winamp (mounted at body level) and the dock.
 * `#desktop-root` is what the boot reveal samples; keep its id and real <img> children.
 */
export default function Desktop() {
  const windows = useWindowStore((state) => state.windows);
  const winampOpen = useWindowStore((state) => state.winampOpen);

  return (
    <div id="desktop-root" className="cx-desktop" style={{ backgroundColor: 'var(--cx-blue)' }}>
      <Wallpaper />
      <div id="desktop-foreground" className="cx-desktop__foreground">
        <MenuBar />
        <div className="cx-windows-layer" style={{ top: MENUBAR_HEIGHT }}>
          {windows.map((windowState) => (
            <Window key={windowState.id} window={windowState} />
          ))}
        </div>
        {winampOpen && <Winamp />}
        <Dock />
      </div>
    </div>
  );
}
