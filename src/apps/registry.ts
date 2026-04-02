import type { ComponentType } from 'react';
import Terminal from './Terminal';
import Winamp from './Winamp';
import Diablo from './Diablo';

export type AppType = 'terminal' | 'winamp' | 'diablo';

export interface AppDefinition {
  id: AppType;
  title: string;
  defaultWidth: number;
  defaultHeight: number;
  Component: ComponentType;
  desktopIcon: {
    label: string;
    img: string;
  } | null;
  startMenuItem: {
    label: string;
    icon: string;
    showArrow: boolean;
  } | null;
}

export const appDefinitions: Record<AppType, AppDefinition> = {
  terminal: {
    id: 'terminal',
    title: 'Command Prompt',
    defaultWidth: 600,
    defaultHeight: 400,
    Component: Terminal,
    desktopIcon: {
      label: 'My Computer',
      img: `${import.meta.env.BASE_URL}icon-my-computer.png`,
    },
    startMenuItem: {
      label: 'Command Prompt',
      icon: `${import.meta.env.BASE_URL}icon-my-computer.png`,
      showArrow: true,
    },
  },
  winamp: {
    id: 'winamp',
    title: 'Winamp',
    defaultWidth: 275,
    defaultHeight: 500,
    Component: Winamp,
    desktopIcon: {
      label: 'Winamp',
      img: `${import.meta.env.BASE_URL}icon-winamp.png`,
    },
    startMenuItem: {
      label: 'Winamp',
      icon: `${import.meta.env.BASE_URL}icon-winamp.png`,
      showArrow: true,
    },
  },
  diablo: {
    id: 'diablo',
    title: 'Diablo',
    defaultWidth: 800,
    defaultHeight: 600,
    Component: Diablo,
    desktopIcon: {
      label: 'Diablo',
      img: `${import.meta.env.BASE_URL}icon-diablo.png`,
    },
    startMenuItem: {
      label: 'Diablo',
      icon: `${import.meta.env.BASE_URL}icon-diablo.png`,
      showArrow: true,
    },
  },
};

export const appIds = Object.keys(appDefinitions) as AppType[];

export function getAppDefinition(appId: AppType): AppDefinition {
  return appDefinitions[appId];
}
