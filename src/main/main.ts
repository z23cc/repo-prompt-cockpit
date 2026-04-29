import { app, clipboard, ipcMain, Menu, nativeImage, Tray } from 'electron';
import { loadConfig } from '../shared/config.js';
import type { ControlPlaneConfig, ControlPlaneSnapshot, ProviderMode } from '../shared/types.js';
import { createDeterministicSummary } from '../domain/summary.js';
import { ControlPlaneController } from './controlPlaneController.js';
import { createDesktopWindowController, type DesktopWindowController } from './desktopWindow.js';
import { registerControlPlaneIpcHandlers } from './ipcHandlers.js';
import { buildTrayTemplate, buildTrayTitle } from './trayMenu.js';

let tray: Tray | undefined;
let config: ControlPlaneConfig;
let controller: ControlPlaneController | undefined;
let desktopWindow: DesktopWindowController | undefined;
let latestSnapshot: ControlPlaneSnapshot | undefined;
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
  unregisterIpcHandlers = registerControlPlaneIpcHandlers({ ipcMain, clipboard, controller });

  tray = new Tray(createTemplateImage());
  tray.setToolTip('RepoPrompt Control Plane');
  tray.on('click', () => desktopWindow?.toggle());

  controller.onSnapshot((snapshot) => {
    latestSnapshot = snapshot;
    updateTray(snapshot);
    desktopWindow?.sendSnapshot(snapshot);
  });

  await controller.start();

  if (config.openWindowOnStart && process.env.RP_CONTROL_PLANE_SMOKE !== '1') {
    desktopWindow.show();
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
        openControlPlane: () => desktopWindow?.show(),
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
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="4" y="4" width="24" height="24" rx="7" fill="black"/>
      <text x="16" y="21" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="white">RP</text>
    </svg>
  `);
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${svg}`);
  image.setTemplateImage(true);
  return image;
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
