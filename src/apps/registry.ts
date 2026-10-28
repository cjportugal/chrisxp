import type { ComponentType } from 'react';
import { GLYPHS } from '../theme/glyphs';
import type { PixelGlyph } from '../theme/glyphs';
import About from './About';
import Diablo from './Diablo';
import Photos from './Photos';
import Trash from './Trash';

export type AppType = 'winamp' | 'diablo' | 'photos' | 'about' | 'trash';

export interface AppDefinition {
  id: AppType;
  title: string;
  defaultWidth: number;
  defaultHeight: number;
  Component: ComponentType;
  icon: PixelGlyph;
  /** Shown in the dock. */
  dock: boolean;
  /** Opening again focuses the existing window instead of making another. */
  singleInstance: boolean;
  resizable: boolean;
}

/** Winamp is the docked player column (PlayerPanel), special-cased in openWindow and never windowed. */
const NoWindow: ComponentType = () => null;

export const appDefinitions: Record<AppType, AppDefinition> = {
  about: {
    id: 'about',
    title: 'About ChrisXP',
    defaultWidth: 380,
    defaultHeight: 260,
    Component: About,
    icon: GLYPHS.about,
    dock: true,
    singleInstance: true,
    resizable: false,
  },
  photos: {
    id: 'photos',
    title: 'Photos',
    defaultWidth: 560,
    defaultHeight: 420,
    Component: Photos,
    icon: GLYPHS.photos,
    dock: true,
    singleInstance: true,
    resizable: true,
  },
  winamp: {
    id: 'winamp',
    title: 'ChrisAMP',
    defaultWidth: 275,
    defaultHeight: 500,
    Component: NoWindow,
    icon: GLYPHS.winamp,
    dock: true,
    singleInstance: true,
    resizable: false,
  },
  diablo: {
    id: 'diablo',
    title: 'Diablo',
    defaultWidth: 800,
    defaultHeight: 600,
    Component: Diablo,
    icon: GLYPHS.diablo,
    dock: true,
    singleInstance: true,
    resizable: true,
  },
  trash: {
    id: 'trash',
    title: 'Trash',
    defaultWidth: 320,
    defaultHeight: 200,
    Component: Trash,
    icon: GLYPHS.trash,
    dock: true,
    singleInstance: true,
    resizable: false,
  },
};

/** Registry order is dock order. */
export const appIds = Object.keys(appDefinitions) as AppType[];

export const dockAppIds = appIds.filter((id) => appDefinitions[id].dock);

export function getAppDefinition(appId: AppType): AppDefinition {
  return appDefinitions[appId];
}
