import { BrowserWindow } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTROL_PLANE_IPC } from '../shared/ipc.js';
import type { ControlPlaneConfig, ControlPlaneSnapshot } from '../shared/types.js';

export interface DesktopWindowController {
  show(): void;
  hide(): void;
  toggle(): void;
  sendSnapshot(snapshot: ControlPlaneSnapshot): void;
  isCreated(): boolean;
  markAppQuitting(): void;
}

const currentDir = dirname(fileURLToPath(import.meta.url));
const rendererHtmlPath = join(currentDir, '../../../src/renderer/index.html');
const preloadPath = join(currentDir, 'preload.js');

export function createDesktopWindowController(config: ControlPlaneConfig): DesktopWindowController {
  let window: BrowserWindow | undefined;
  let appIsQuitting = false;

  function createWindow(): BrowserWindow {
    if (window && !window.isDestroyed()) return window;

    window = new BrowserWindow({
      width: config.desktopWindowWidth,
      height: config.desktopWindowHeight,
      minWidth: 1040,
      minHeight: 700,
      title: 'RepoPrompt Control Plane',
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        preload: preloadPath
      }
    });

    window.loadFile(rendererHtmlPath).catch((error: unknown) => {
      console.error('Failed to load control plane window:', error);
    });

    window.once('ready-to-show', () => {
      window?.show();
    });

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

  return {
    show() {
      const activeWindow = createWindow();
      if (activeWindow.isMinimized()) activeWindow.restore();
      activeWindow.show();
      activeWindow.focus();
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
