import { BrowserWindow, type Rectangle } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTROL_PLANE_IPC } from '../shared/ipc.js';
import type { ControlPlaneConfig, ControlPlaneSnapshot, WindowMode } from '../shared/types.js';

export interface DesktopWindowController {
  show(): void;
  hide(): void;
  toggle(): void;
  toggleWindowMode(): WindowMode;
  getWindowMode(): WindowMode;
  onWindowModeChange(listener: (mode: WindowMode) => void): () => void;
  sendSnapshot(snapshot: ControlPlaneSnapshot): void;
  isCreated(): boolean;
  markAppQuitting(): void;
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const rendererHtmlPath = join(currentDir, '../../../src/renderer/index.html');
const preloadPath = join(currentDir, 'preload.js');
const logoPath = join(currentDir, '../../../src/renderer/assets/repoprompt-cockpit-logo.png');
const MIN_DESKTOP_WIDTH = 1040;
const MIN_DESKTOP_HEIGHT = 700;
const MIN_MINIMAL_WIDTH = 420;
const MIN_MINIMAL_HEIGHT = 420;

export function createDesktopWindowController(config: ControlPlaneConfig): DesktopWindowController {
  let window: BrowserWindow | undefined;
  let appIsQuitting = false;
  let windowMode: WindowMode = 'desktop';
  let desktopBounds: Rectangle | undefined;
  const modeListeners = new Set<(mode: WindowMode) => void>();

  function createWindow(): BrowserWindow {
    if (window && !window.isDestroyed()) return window;

    window = new BrowserWindow({
      width: config.desktopWindowWidth,
      height: config.desktopWindowHeight,
      minWidth: MIN_DESKTOP_WIDTH,
      minHeight: MIN_DESKTOP_HEIGHT,
      title: 'Repo Prompt Cockpit',
      icon: logoPath,
      show: false,
      backgroundColor: '#f5f5f7',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        preload: preloadPath
      }
    });

    window.loadFile(rendererHtmlPath).catch((error: unknown) => {
      console.error('Failed to load cockpit window:', error);
    });

    window.webContents.on('did-finish-load', () => {
      window?.webContents.send(CONTROL_PLANE_IPC.windowModeChanged, windowMode);
    });

    window.once('ready-to-show', () => {
      applyWindowMode(window!, windowMode);
      window?.show();
    });

    window.on('resize', rememberDesktopBounds);
    window.on('move', rememberDesktopBounds);
    window.on('close', (event) => {
      if (appIsQuitting) return;
      event.preventDefault();
      window?.hide();
    });

    window.on('closed', () => {
      window = undefined;
    });

    return window;
  }

  function rememberDesktopBounds(): void {
    if (!window || windowMode !== 'desktop') return;
    desktopBounds = window.getBounds();
  }

  function applyWindowMode(activeWindow: BrowserWindow, mode: WindowMode): void {
    if (mode === 'minimal') {
      if (!desktopBounds) desktopBounds = activeWindow.getBounds();
      activeWindow.setMinimumSize(MIN_MINIMAL_WIDTH, MIN_MINIMAL_HEIGHT);
      activeWindow.setAlwaysOnTop(true, 'floating');
      activeWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      activeWindow.setBounds({
        ...activeWindow.getBounds(),
        width: Math.max(MIN_MINIMAL_WIDTH, config.minimalWindowWidth),
        height: Math.max(MIN_MINIMAL_HEIGHT, config.minimalWindowHeight)
      });
    } else {
      activeWindow.setAlwaysOnTop(false);
      activeWindow.setVisibleOnAllWorkspaces(false);
      activeWindow.setMinimumSize(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT);
      if (desktopBounds) {
        activeWindow.setBounds(desktopBounds);
      } else {
        activeWindow.setSize(config.desktopWindowWidth, config.desktopWindowHeight);
      }
    }

    activeWindow.webContents.send(CONTROL_PLANE_IPC.windowModeChanged, mode);
    for (const listener of modeListeners) listener(mode);
  }

  function setWindowMode(nextMode: WindowMode): WindowMode {
    windowMode = nextMode;
    const activeWindow = createWindow();
    applyWindowMode(activeWindow, windowMode);
    return windowMode;
  }

  return {
    show() {
      const activeWindow = createWindow();
      if (activeWindow.isMinimized()) activeWindow.restore();
      activeWindow.show();
      activeWindow.focus();
      activeWindow.webContents.send(CONTROL_PLANE_IPC.windowModeChanged, windowMode);
    },
    hide() {
      window?.hide();
    },
    toggle() {
      if (window?.isVisible()) {
        window.hide();
        return;
      }
      this.show();
    },
    toggleWindowMode() {
      return setWindowMode(windowMode === 'desktop' ? 'minimal' : 'desktop');
    },
    getWindowMode() {
      return windowMode;
    },
    onWindowModeChange(listener) {
      modeListeners.add(listener);
      return () => {
        modeListeners.delete(listener);
      };
    },
    sendSnapshot(snapshot: ControlPlaneSnapshot) {
      if (!window || window.isDestroyed()) return;
      window.webContents.send(CONTROL_PLANE_IPC.snapshotChanged, snapshot);
    },
    isCreated() {
      return Boolean(window && !window.isDestroyed());
    },
    markAppQuitting() {
      appIsQuitting = true;
    }
  };
}
