import { app, clipboard, ipcMain, Menu, nativeImage, Tray } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../shared/config.js';
import type { ControlPlaneConfig, ControlPlaneSnapshot, ProviderMode, WindowMode } from '../shared/types.js';
import { createDeterministicSummary } from '../domain/summary.js';
import { ControlPlaneController } from './controlPlaneController.js';
import { createDesktopWindowController, type DesktopWindowController } from './desktopWindow.js';
import { registerControlPlaneIpcHandlers } from './ipcHandlers.js';
import { buildTrayTemplate, buildTrayTitle } from './trayMenu.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const logoPath = join(currentDir, '../../../src/renderer/assets/repoprompt-cockpit-logo.png');

let tray: Tray | undefined;
let config: ControlPlaneConfig;
let controller: ControlPlaneController | undefined;
let desktopWindow: DesktopWindowController | undefined;
let latestSnapshot: ControlPlaneSnapshot | undefined;
let latestWindowMode: WindowMode = 'desktop';
let unregisterIpcHandlers: (() => void) | undefined;

if (process.env.RP_CONTROL_PLANE_SMOKE === '1') {
  setTimeout(() => {
    console.error('Tray smoke timed out before completing first refresh.');
    app.exit(latestSnapshot ? 0 : 1);
  }, 10000);
}

async function bootstrap(): Promise<void> {
  app.setName('Repo Prompt Cockpit');
  config = loadConfig();
  controller = new ControlPlaneController(config);
  desktopWindow = createDesktopWindowController(config);
  latestWindowMode = desktopWindow.getWindowMode();
  desktopWindow.onWindowModeChange((mode) => {
    latestWindowMode = mode;
    if (latestSnapshot) updateTray(latestSnapshot);
  });
  unregisterIpcHandlers = registerControlPlaneIpcHandlers({ ipcMain, clipboard, controller, desktopWindow });

  tray = new Tray(createTemplateImage());
  tray.setToolTip('Repo Prompt Cockpit');
  tray.on('click', () => desktopWindow?.toggle());

  controller.onSnapshot((snapshot) => {
    latestSnapshot = snapshot;
    updateTray(snapshot);
    desktopWindow?.sendSnapshot(snapshot);
  });

  await controller.start();

  if (config.openWindowOnStart && process.env.RP_CONTROL_PLANE_SMOKE !== '1') {
    desktopWindow.show();
    if (latestSnapshot) desktopWindow.sendSnapshot(latestSnapshot);
  }

  if (process.env.RP_CONTROL_PLANE_SMOKE === '1') {
    console.log(latestSnapshot ? createDeterministicSummary(latestSnapshot, config) : 'No snapshot generated');
    setTimeout(() => app.quit(), 500);
  }
}

function updateTray(snapshot: ControlPlaneSnapshot): void {
  if (!tray || !controller) return;
  if (process.platform === 'darwin') {
    tray.setTitle(buildTrayTitle(snapshot), { fontType: 'monospacedDigit' });
  }
  tray.setContextMenu(
    Menu.buildFromTemplate(
      buildTrayTemplate(snapshot, {
        windowMode: latestWindowMode,
        openControlPlane: () => {
          desktopWindow?.show();
          if (latestSnapshot) desktopWindow?.sendSnapshot(latestSnapshot);
        },
        toggleWindowMode: () => {
          latestWindowMode = desktopWindow?.toggleWindowMode() ?? latestWindowMode;
          if (latestSnapshot) desktopWindow?.sendSnapshot(latestSnapshot);
          if (latestSnapshot) updateTray(latestSnapshot);
        },
        refreshNow: () => {
          void controller?.refreshNow('manual');
        },
        copySummary: () => {
          if (latestSnapshot) clipboard.writeText(createDeterministicSummary(latestSnapshot, config));
        },
        switchToFixtureMode: () => {
          void switchProviderMode('fixture');
        },
        switchToLiveMode: () => {
          void switchProviderMode('live');
        },
        quit: () => app.quit()
      })
    )
  );
}

async function switchProviderMode(mode: ProviderMode): Promise<void> {
  await controller?.setProviderMode(mode);
}

function createTemplateImage() {
  const image = nativeImage.createFromPath(logoPath);
  if (!image.isEmpty()) {
    image.setTemplateImage(true);
    return image.resize({ width: 18, height: 18 });
  }

  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="4" y="4" width="24" height="24" rx="7" fill="black"/>
      <text x="16" y="21" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="white">RC</text>
    </svg>
  `);
  const fallback = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${svg}`);
  fallback.setTemplateImage(true);
  return fallback;
}

app.whenReady().then(() => {
  void bootstrap();
});

app.on('before-quit', () => {
  desktopWindow?.markAppQuitting();
  controller?.stop();
  unregisterIpcHandlers?.();
});

app.on('window-all-closed', () => {
  // Keep the process alive until the tray Quit action or smoke timeout exits.
});
