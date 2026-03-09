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
const WINDOW_BASE_Y = 80;
const WINDOW_CASCADE_STEP = 30;

let idCounter = 0;

const mapWindowById = (
  windows: WindowState[],
  id: string,
  mapFn: (windowState: WindowState) => WindowState
): WindowState[] => windows.map((windowState) => (windowState.id === id ? mapFn(windowState) : windowState));

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  topZ: 10,
  winampOpen: false,

  openWindow: (app) => {
    if (app === 'winamp') {
      set({ winampOpen: true });
      return;
    }

    const { topZ, windows } = get();
    const appDefinition = getAppDefinition(app);
    const offset = windows.length * WINDOW_CASCADE_STEP;

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
