import { useEffect, useRef, useState } from 'react';
import { ditherUrlToDataUrl } from '../effects/ditherImage';
import { useThemeStore, WALLPAPERS } from '../store/themeStore';
import type { WallpaperSource } from '../store/themeStore';

/** Thumbnails are dithered at roughly 1/24 so a 1400px photo becomes ~58px of blocks shown at 96px. */
const THUMB_SCALE = 1 / 24;
const MOODBOARDS_ON_DISK = 32;

function useDithered(url: string | null, scale: number): string | null {
  const [result, setResult] = useState<{ key: string; dataUrl: string } | null>(null);
  const key = url ? `${url}@${scale}` : null;
  useEffect(() => {
    if (!url || !key) return;
    let cancelled = false;
    ditherUrlToDataUrl(url, { scale })
      .then((dataUrl) => {
        if (!cancelled) setResult({ key, dataUrl });
      })
      .catch((error: unknown) => console.error('Photos dither failed', error));
    return () => {
      cancelled = true;
    };
  }, [url, key, scale]);
  // A stale result for a previous photo reads as "still dithering" rather than flashing the wrong image.
  return result && result.key === key ? result.dataUrl : null;
}

function Thumbnail({ photo, selected, onSelect }: { photo: WallpaperSource; selected: boolean; onSelect: () => void }) {
  const thumb = useDithered(photo.url, THUMB_SCALE);
  return (
    <button type="button" className="cx-photos__thumb" aria-pressed={selected} onClick={onSelect}>
      <span className="cx-photos__thumb-frame">
        {thumb ? <img className="cx-pixel" src={thumb} alt="" draggable={false} /> : <span className="cx-dither" />}
      </span>
      <span className="cx-photos__thumb-name">{photo.name}</span>
    </button>
  );
}

/** Finder-style browser for the moodboard photos; doubles as the wallpaper picker. */
export default function Photos() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const wallpaperId = useThemeStore((state) => state.wallpaperId);
  const pattern = useThemeStore((state) => state.pattern);
  const setWallpaper = useThemeStore((state) => state.setWallpaper);

  const selectedIndex = WALLPAPERS.findIndex((photo) => photo.id === selectedId);
  const selected = selectedIndex >= 0 ? WALLPAPERS[selectedIndex] : null;
  const dithered = useDithered(selected?.url ?? null, 1 / 3);
  const isWallpaper = !!selected && pattern === 'photo' && selected.id === wallpaperId;

  const select = (index: number) => {
    const next = WALLPAPERS[(index + WALLPAPERS.length) % WALLPAPERS.length];
    setSelectedId(next.id);
    rootRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (WALLPAPERS.length === 0) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      select(selectedIndex < 0 ? 0 : selectedIndex + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      select(selectedIndex < 0 ? WALLPAPERS.length - 1 : selectedIndex - 1);
    } else if (event.key === 'Escape') {
      setSelectedId(null);
    }
  };

  return (
    <div ref={rootRef} className="cx-photos cx-ui" tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="cx-photos__header">
        <span>{WALLPAPERS.length} items</span>
        <span>·</span>
        <span>{MOODBOARDS_ON_DISK} moodboards on disk</span>
        {selected && (
          <span className="cx-photos__header-hint">← → to browse</span>
        )}
      </div>
      <div className="cx-photos__panes" data-viewer={selected ? 'true' : 'false'}>
        <div className="cx-photos__grid">
          {WALLPAPERS.map((photo, index) => (
            <Thumbnail key={photo.id} photo={photo} selected={photo.id === selectedId} onSelect={() => select(index)} />
          ))}
        </div>
        {selected && (
          <div className="cx-photos__viewer">
            <div className="cx-photos__stage">
              {showOriginal ? (
                <img src={selected.url} alt={selected.name} draggable={false} />
              ) : dithered ? (
                <img className="cx-pixel" src={dithered} alt={selected.name} draggable={false} />
              ) : (
                <span className="cx-photos__loading">Dithering…</span>
              )}
            </div>
            <div className="cx-photos__toolbar">
              <span className="cx-photos__caption">{selected.name}</span>
              <button
                type="button"
                className="cx-button"
                aria-pressed={!showOriginal}
                onClick={() => setShowOriginal((value) => !value)}
              >
                {showOriginal ? 'Original' : 'Dithered'}
              </button>
              <button
                type="button"
                className="cx-button"
                disabled={isWallpaper}
                onClick={() => void setWallpaper(selected.id)}
              >
                {isWallpaper ? 'Current Wallpaper' : 'Set as Wallpaper'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
