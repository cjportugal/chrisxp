import { useWindowStore } from '../store/windowStore';
import { MENUBAR_HEIGHT, PLAYER_WIDTH } from '../theme/layout';
import Dock from './Dock';
import MenuBar from './MenuBar';
import PlayerPanel from './player/PlayerPanel';
import Wallpaper from './Wallpaper';
import Window from './Window';

/** The desktop after boot: wallpaper, menubar, windows, the Winamp column and the dock. While Winamp is open
 * the windows layer and the dock stop at its left edge.
 * `#desktop-root` is what the boot reveal samples; keep its id and real <img> children.
 */
export default function Desktop() {
  const windows = useWindowStore((state) => state.windows);
  const winampOpen = useWindowStore((state) => state.winampOpen);

  return (
    <div id="desktop-root" className="cx-desktop" style={{ backgroundColor: 'var(--cx-blue)' }}>
      <Wallpaper />
      <div id="desktop-foreground" className="cx-desktop__foreground">
        {/* Before the menubar: same z-index, so the menubar's menus paint over the column. */}
        {winampOpen && <PlayerPanel />}
        <MenuBar />
        <div className="cx-windows-layer" style={{ top: MENUBAR_HEIGHT, right: winampOpen ? PLAYER_WIDTH : 0 }}>
          {windows.map((windowState) => (
            <Window key={windowState.id} window={windowState} />
          ))}
        </div>
        <Dock />
      </div>
    </div>
  );
}
