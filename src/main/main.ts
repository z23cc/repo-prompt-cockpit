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


app.setName('Repo Prompt Cockpit');
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
  config = loadConfig();
  controller = new ControlPlaneController(config);
  desktopWindow = createDesktopWindowController(config);
  latestWindowMode = desktopWindow.getWindowMode();
  desktopWindow.onWindowModeChange((mode) => {
    latestWindowMode = mode;
    if (latestSnapshot) updateTray(latestSnapshot);
  });
  unregisterIpcHandlers = registerControlPlaneIpcHandlers({ ipcMain, clipboard, controller, desktopWindow });

  app.setAboutPanelOptions({ applicationName: 'Repo Prompt Cockpit' });
  app.dock?.setIcon(logoPath);
  tray = new Tray(createTrayImage());
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

function createTrayImage() {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="7" y="6" width="18" height="20" rx="5" fill="black" opacity="0.94"/>
      <path d="M12 12h4.4c2.9 0 4.6 1.7 4.6 4.2s-1.7 4.2-4.6 4.2H12V12zm3.9 6c1.7 0 2.8-.95 2.8-2.65 0-1.7-1.1-2.65-2.8-2.65H14.4V18h1.5z" fill="white"/>
    </svg>
  `);
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${svg}`);
  image.setTemplateImage(true);
  return image.resize({ width: 18, height: 18 });
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
