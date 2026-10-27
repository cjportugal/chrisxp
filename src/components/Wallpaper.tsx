import { useThemeStore } from '../store/themeStore';

const BASE_STYLE = { position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 } as const;

/** Desktop backdrop. Always a real <img> or a solid background-color so the boot reveal can sample it. */
export default function Wallpaper() {
  const pattern = useThemeStore((state) => state.pattern);
  const dataUrl = useThemeStore((state) => state.wallpaperDataUrl);

  if (pattern === 'gray') {
    return (
      <div
        className="desktop-wallpaper cx-dither"
        style={{ ...BASE_STYLE, background: 'var(--cx-dither)', backgroundColor: '#808080' }}
      />
    );
  }

  if (pattern === 'flat' || !dataUrl) {
    return <div className="desktop-wallpaper" style={{ ...BASE_STYLE, backgroundColor: 'var(--cx-blue)' }} />;
  }

  return (
    <img
      className="desktop-wallpaper cx-pixel"
      src={dataUrl}
      alt=""
      draggable={false}
      style={{ ...BASE_STYLE, objectFit: 'cover', display: 'block' }}
    />
  );
}
