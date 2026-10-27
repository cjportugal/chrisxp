import { create } from 'zustand';
import type { AppType } from '../apps/registry';
import { getAppDefinition } from '../apps/registry';

export interface WindowState {
  id: string;
  title: string;
  app: AppType;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

interface WindowStore {
  windows: WindowState[];
  topZ: number;
  winampOpen: boolean;
  openWindow: (app: AppType) => void;
  closeWinamp: () => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  updateSize: (id: string, width: number, height: number) => void;
  restoreWindow: (id: string) => void;
}

const WINDOW_BASE_X = 100;
const WINDOW_BASE_Y = 40;
const WINDOW_CASCADE_STEP = 30;

let idCounter = 0;

const mapWindowById = (
  windows: WindowState[],
  id: string,
  mapFn: (windowState: WindowState) => WindowState
): WindowState[] => windows.map((windowState) => (windowState.id === id ? mapFn(windowState) : windowState));

/** Id of the frontmost non-minimized window, or null when the desktop is bare. */
export function selectActiveWindowId(state: { windows: WindowState[] }): string | null {
  let active: WindowState | null = null;
  for (const windowState of state.windows) {
    if (windowState.minimized) continue;
    if (!active || windowState.zIndex > active.zIndex) active = windowState;
  }
  return active?.id ?? null;
}

export const useActiveWindowId = () => useWindowStore(selectActiveWindowId);

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  topZ: 10,
  winampOpen: false,

  openWindow: (app) => {
    if (app === 'winamp') {
      set({ winampOpen: true });
      return;
    }

    const { topZ, windows, focusWindow, restoreWindow } = get();
    const appDefinition = getAppDefinition(app);

    if (appDefinition.singleInstance) {
      const existing = windows.find((windowState) => windowState.app === app);
      if (existing) {
        if (existing.minimized) restoreWindow(existing.id);
        focusWindow(existing.id);
        return;
      }
    }

    const offset = (windows.length % 8) * WINDOW_CASCADE_STEP;

    const newWindow: WindowState = {
      id: `window-${++idCounter}`,
      title: appDefinition.title,
      app,
      x: WINDOW_BASE_X + offset,
      y: WINDOW_BASE_Y + offset,
      width: appDefinition.defaultWidth,
      height: appDefinition.defaultHeight,
      minimized: false,
      maximized: false,
      zIndex: topZ + 1,
    };

    set({ windows: [...windows, newWindow], topZ: topZ + 1 });
  },

  closeWinamp: () => set({ winampOpen: false }),

  closeWindow: (id) =>
    set((state) => ({ windows: state.windows.filter((windowState) => windowState.id !== id) })),

  minimizeWindow: (id) =>
    set((state) => ({
      windows: mapWindowById(state.windows, id, (windowState) => ({ ...windowState, minimized: true })),
    })),

  maximizeWindow: (id) =>
    set((state) => ({
      windows: mapWindowById(state.windows, id, (windowState) => ({
        ...windowState,
        maximized: !windowState.maximized,
      })),
    })),

  focusWindow: (id) => {
    const { topZ } = get();
    const nextZ = topZ + 1;

    set((state) => ({
      windows: mapWindowById(state.windows, id, (windowState) => ({ ...windowState, zIndex: nextZ })),
      topZ: nextZ,
    }));
  },

  updatePosition: (id, x, y) =>
    set((state) => ({
      windows: mapWindowById(state.windows, id, (windowState) => ({ ...windowState, x, y })),
    })),

  updateSize: (id, width, height) =>
    set((state) => ({
      windows: mapWindowById(state.windows, id, (windowState) => ({ ...windowState, width, height })),
    })),

  restoreWindow: (id) =>
    set((state) => ({
      windows: mapWindowById(state.windows, id, (windowState) => ({ ...windowState, minimized: false })),
    })),
}));
