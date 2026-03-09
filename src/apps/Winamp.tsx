import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Webamp from 'webamp';
import type { WindowLayout, Track } from 'webamp';
import { useWindowStore } from '../store/windowStore';

const mp3Modules = import.meta.glob('../assets/mp3/*.{mp3,ogg,wav,flac,aac,opus,m4a}', {
  eager: true,
  import: 'default',
  query: '?url',
});
const INITIAL_TRACKS: Track[] = Object.entries(mp3Modules as Record<string, string>).map(
  ([path, url]) => ({
    url,
    metaData: {
      title: path.replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, ''),
      artist: '',
    },
  })
);

const WEBAMP_LAYOUT: WindowLayout = {
  main: { position: { top: 0, left: 0 }, closed: false },
  equalizer: { position: { top: 116, left: 0 }, closed: false },
  playlist: {
    position: { top: 232, left: 0 },
    size: { extraHeight: 4, extraWidth: 0 },
    closed: false,
  },
  milkdrop: {
    position: { top: 0, left: 275 },
    size: { extraHeight: 14, extraWidth: 8 },
    closed: false,
  },
};

const MILKDROP_DESKTOP_CLASS = 'webamp-milkdrop-desktop';
const WEBAMP_MOUNT_HOST_ID = 'webamp-mount-host';

type MilkdropDisplay = 'WINDOW' | 'DESKTOP' | 'FULLSCREEN';

interface ContextMenuPos {
  x: number;
  y: number;
}

function shouldShowDesktopContextMenu(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest('#webamp') || target.closest('#webamp-context-menu') || target.closest('#milkdrop-context-menu')) {
    return false;
  }

  if (target.closest('.window')) {
    return false;
  }

  if (target.closest('button, a, input, textarea, select, [role="button"]')) {
    return false;
  }

  return true;
}

function getMilkdropDisplay(webamp: Webamp): MilkdropDisplay {
  const state = webamp.store.getState() as {
    milkdrop?: {
      display?: MilkdropDisplay;
    };
  };

  return state.milkdrop?.display ?? 'WINDOW';
}

function ensureMilkdropWindowMode(webamp: Webamp): void {
  const display = getMilkdropDisplay(webamp);

  if (display === 'DESKTOP') {
    webamp.store.dispatch({ type: 'SET_MILKDROP_DESKTOP', enabled: false });
    return;
  }

  if (display === 'FULLSCREEN') {
    webamp.store.dispatch({ type: 'SET_MILKDROP_FULLSCREEN', enabled: false });
  }
}

function syncMilkdropDesktopClass(webamp: Webamp): void {
  const isDesktopMode = getMilkdropDisplay(webamp) === 'DESKTOP';
  document.body.classList.toggle(MILKDROP_DESKTOP_CLASS, isDesktopMode);
}

function cleanupWebampDomArtifacts(): void {
  const webampRoot = document.getElementById('webamp');
  if (webampRoot?.parentNode) {
    webampRoot.parentNode.removeChild(webampRoot);
  }

  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined);
  }
}

function ensureWebampMountHost(): HTMLElement {
  let mountHost = document.getElementById(WEBAMP_MOUNT_HOST_ID);
  if (mountHost) {
    return mountHost;
  }

  mountHost = document.createElement('div');
  mountHost.id = WEBAMP_MOUNT_HOST_ID;
  mountHost.style.position = 'fixed';
  mountHost.style.inset = '0';
  mountHost.style.zIndex = '6';
  mountHost.style.pointerEvents = 'none';
  document.body.appendChild(mountHost);

  return mountHost;
}

function createWebampMountNode(host: HTMLElement): HTMLElement {
  const mountNode = document.createElement('div');
  mountNode.className = 'webamp-instance-host';
  mountNode.style.position = 'absolute';
  mountNode.style.inset = '0';
  mountNode.style.pointerEvents = 'none';
  host.appendChild(mountNode);
  return mountNode;
}

function removeWebampMountNode(mountNode: HTMLElement | null): void {
  if (!mountNode?.parentNode) {
    return;
  }

  mountNode.parentNode.removeChild(mountNode);
}

export default function Winamp() {
  const closeWinamp = useWindowStore((state) => state.closeWinamp);
  const webampRef = useRef<Webamp | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPos | null>(null);

  const originalBackgroundRef = useRef<{
    html: string;
    body: string;
  } | null>(null);

  // Dismiss context menu on outside mousedown
  useEffect(() => {
    if (!contextMenuPos) {
      return;
    }

    const handler = () => setContextMenuPos(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenuPos]);

  useEffect(() => {
    cleanupWebampDomArtifacts();
    document.body.classList.remove(MILKDROP_DESKTOP_CLASS);

    const mountHost = ensureWebampMountHost();
    const mountNode = createWebampMountNode(mountHost);

    if (!originalBackgroundRef.current) {
      originalBackgroundRef.current = {
        html: document.documentElement.style.background,
        body: document.body.style.background,
      };
    }

    const webamp = new Webamp({
      initialTracks: INITIAL_TRACKS,
      windowLayout: WEBAMP_LAYOUT,
      __butterchurnOptions: {
        butterchurnOpen: true,
        getPresets: async () => {
          const module = (await import('butterchurn-presets')) as {
            default: { getPresets: () => Record<string, object> };
          };
          const presets = module.default.getPresets();

          return Object.keys(presets).map((name) => ({
            name,
            butterchurnPresetObject: presets[name] as object,
          }));
        },
        importButterchurn: async () => {
          const module = (await import('butterchurn')) as { default: unknown };
          return module.default;
        },
      },
    });

    webampRef.current = webamp;

    const restoreBackground = () => {
      if (!originalBackgroundRef.current) {
        return;
      }

      document.documentElement.style.background = originalBackgroundRef.current.html;
      document.body.style.background = originalBackgroundRef.current.body;
    };

    let cancelled = false;
    let stopStateWatcher: () => void = () => {};
    const handleDocumentContextMenu = (event: MouseEvent) => {
      if (cancelled || !event.isTrusted) {
        return;
      }

      if (getMilkdropDisplay(webamp) !== 'DESKTOP') {
        return;
      }

      if (!shouldShowDesktopContextMenu(event.target)) {
        return;
      }

      event.preventDefault();
      setContextMenuPos({ x: event.clientX, y: event.clientY });
    };

    document.addEventListener('contextmenu', handleDocumentContextMenu, true);

    const unsubscribeClose = webamp.onClose(() => {
      if (cancelled) {
        return;
      }

      ensureMilkdropWindowMode(webamp);
      document.body.classList.remove(MILKDROP_DESKTOP_CLASS);
      cleanupWebampDomArtifacts();
      removeWebampMountNode(mountNode);
      restoreBackground();
      closeWinamp();
    });

    void webamp
      .renderWhenReady(mountNode)
      .then(() => {
        if (cancelled) {
          return;
        }

        stopStateWatcher = webamp.__onStateChange(() => {
          if (cancelled) {
            return;
          }

          syncMilkdropDesktopClass(webamp);
        });

        webamp.store.dispatch({ type: 'SET_MILKDROP_DESKTOP', enabled: true });
        syncMilkdropDesktopClass(webamp);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error('Webamp failed to render', error);
        removeWebampMountNode(mountNode);
        closeWinamp();
      });

    return () => {
      cancelled = true;
      stopStateWatcher();
      unsubscribeClose();
      document.removeEventListener('contextmenu', handleDocumentContextMenu, true);
      ensureMilkdropWindowMode(webamp);
      document.body.classList.remove(MILKDROP_DESKTOP_CLASS);
      webamp.dispose();
      cleanupWebampDomArtifacts();
      removeWebampMountNode(mountNode);
      restoreBackground();
      webampRef.current = null;
      setContextMenuPos(null);
    };
  }, [closeWinamp]);

  const handleWindow = () => {
    webampRef.current?.store.dispatch({ type: 'SET_MILKDROP_DESKTOP', enabled: false });
    setContextMenuPos(null);
  };

  const handleFullscreen = () => {
    webampRef.current?.store.dispatch({ type: 'SET_MILKDROP_FULLSCREEN', enabled: true });
    setContextMenuPos(null);
  };

  const handleQuit = () => {
    setContextMenuPos(null);
    closeWinamp();
  };

  if (!contextMenuPos) {
    return null;
  }

  return ReactDOM.createPortal(
    <MilkdropContextMenu
      x={contextMenuPos.x}
      y={contextMenuPos.y}
      onWindow={handleWindow}
      onFullscreen={handleFullscreen}
      onQuit={handleQuit}
    />,
    document.body
  );
}

interface MilkdropContextMenuProps {
  x: number;
  y: number;
  onWindow: () => void;
  onFullscreen: () => void;
  onQuit: () => void;
}

function MilkdropContextMenu({ x, y, onWindow, onFullscreen, onQuit }: MilkdropContextMenuProps) {
  const fullscreenAvailable = document.fullscreenEnabled;

  return (
    <div
      id="milkdrop-context-menu"
      style={{
        position: 'fixed',
        top: y,
        left: x,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {fullscreenAvailable && (
        <div className="webamp-context-menu-item" onClick={onFullscreen}>
          Fullscreen
        </div>
      )}
      <div className="webamp-context-menu-item webamp-context-menu-item--checked" onClick={onWindow}>
        Desktop Mode
      </div>
      <div className="webamp-context-menu-separator" />
      <div className="webamp-context-menu-item" onClick={onQuit}>
        Quit
      </div>
    </div>
  );
}
