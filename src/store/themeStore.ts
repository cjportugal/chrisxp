import { create } from 'zustand';
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
  pattern: WallpaperPattern;
  setWallpaper: (id: string) => Promise<void>;
  setPattern: (pattern: WallpaperPattern) => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  wallpaperId: DEFAULT_WALLPAPER_ID,
  wallpaperDataUrl: null,
  pattern: 'photo',

  setWallpaper: async (id) => {
    const source = getWallpaper(id);
    if (!source) return;
    set({ wallpaperId: id, pattern: 'photo' });
    const dataUrl = await ditherUrlToDataUrl(source.url);
    await warmImage(dataUrl);
    // A later pick wins; do not clobber it with a slower earlier dither.
    if (get().wallpaperId === id) set({ wallpaperDataUrl: dataUrl });
  },

  setPattern: (pattern) => set({ pattern }),
}));

let prepared: Promise<void> | null = null;

/** Dither the default wallpaper ahead of time. Call during boot so the desktop mounts with it ready. */
export function prepareWallpaper(): Promise<void> {
  if (!prepared) {
    prepared = useThemeStore
      .getState()
      .setWallpaper(useThemeStore.getState().wallpaperId)
      .catch((error: unknown) => {
        console.error('Wallpaper dither failed', error);
      });
  }
  return prepared;
}
