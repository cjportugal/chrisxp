import { create } from 'zustand';
import { GLASS_PALETTE } from '../effects/dither';
import { ditherUrlToDataUrl, warmImage } from '../effects/ditherImage';

export type WallpaperPattern = 'photo' | 'gray' | 'flat';

export interface WallpaperSource {
  id: string;
  name: string;
  url: string;
}

const wallpaperModules = import.meta.glob('../assets/wallpapers/*.{jpg,jpeg,png}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

export const WALLPAPERS: WallpaperSource[] = Object.entries(wallpaperModules)
  .map(([path, url]) => {
    const file = path.replace(/^.*[\\/]/, '');
    const id = file.replace(/\.[^/.]+$/, '');
    return { id, name: file, url };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export const DEFAULT_WALLPAPER_ID = WALLPAPERS.find((w) => w.id === 'csms-019')?.id ?? WALLPAPERS[0]?.id ?? '';

export function getWallpaper(id: string): WallpaperSource | undefined {
  return WALLPAPERS.find((w) => w.id === id);
}

interface ThemeStore {
  wallpaperId: string;
  wallpaperDataUrl: string | null;
  /** The same wallpaper re-dithered without ink, pixel-aligned with it, for the dock's fake glass. */
  glassDataUrl: string | null;
  pattern: WallpaperPattern;
  setWallpaper: (id: string) => Promise<void>;
  setPattern: (pattern: WallpaperPattern) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  wallpaperId: DEFAULT_WALLPAPER_ID,
  wallpaperDataUrl: null,
  glassDataUrl: null,
  pattern: 'gray',

  setWallpaper: async (id) => {
    if (!getWallpaper(id)) return;
    set({ pattern: 'photo' });
    await loadWallpaper(id);
  },

  setPattern: (pattern) => set({ pattern }),
}));

/** Dither a wallpaper and make it current without switching the pattern to it. */
async function loadWallpaper(id: string): Promise<void> {
  const source = getWallpaper(id);
  if (!source) return;
  useThemeStore.setState({ wallpaperId: id });
  const [dataUrl, glassDataUrl] = await Promise.all([
    ditherUrlToDataUrl(source.url),
    ditherUrlToDataUrl(source.url, { palette: GLASS_PALETTE }),
  ]);
  await Promise.all([warmImage(dataUrl), warmImage(glassDataUrl)]);
  // A later pick wins; do not clobber it with a slower earlier dither.
  if (useThemeStore.getState().wallpaperId === id) useThemeStore.setState({ wallpaperDataUrl: dataUrl, glassDataUrl });
}

let prepared: Promise<void> | null = null;

/** Dither the default photo wallpaper ahead of time, so picking Photo is instant. The desktop starts on gray. */
export function prepareWallpaper(): Promise<void> {
  if (!prepared) {
    prepared = loadWallpaper(useThemeStore.getState().wallpaperId).catch((error: unknown) => {
      console.error('Wallpaper dither failed', error);
    });
  }
  return prepared;
}
