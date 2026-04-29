import { app, clipboard, Menu, nativeImage, Tray } from 'electron';
import { loadConfig } from '../shared/config.js';
import type { ControlPlaneConfig, ControlPlaneSnapshot, RepoPromptProvider } from '../shared/types.js';
import { createDeterministicSummary } from '../domain/summary.js';
import { createProvider } from '../repoprompt/providerFactory.js';
import { DemoFixtureProvider } from '../repoprompt/providers/index.js';
import { buildTrayTemplate, buildTrayTitle } from './trayMenu.js';

let tray: Tray | undefined;
let provider: RepoPromptProvider;
let config: ControlPlaneConfig;
let latestSnapshot: ControlPlaneSnapshot | undefined;
let refreshTimer: NodeJS.Timeout | undefined;

if (process.env.RP_CONTROL_PLANE_SMOKE === '1') {
  setTimeout(() => {
    console.error('Tray smoke timed out before completing first refresh.');
    app.exit(latestSnapshot ? 0 : 1);
  }, 10000);
}

async function bootstrap(): Promise<void> {
  config = loadConfig();
  provider = createProvider(config);
  tray = new Tray(createTemplateImage());
  tray.setToolTip('RepoPrompt Control Plane');
  await refresh();
  refreshTimer = setInterval(() => {
    void refresh();
  }, config.pollingIntervalMs);

  if (process.env.RP_CONTROL_PLANE_SMOKE === '1') {
    console.log(latestSnapshot ? createDeterministicSummary(latestSnapshot, config) : 'No snapshot generated');
    setTimeout(() => app.quit(), 500);
  }
}

async function refresh(): Promise<void> {
  latestSnapshot = await provider.collectSnapshot();
  if (!tray) return;
  if (process.platform === 'darwin') {
    tray.setTitle(buildTrayTitle(latestSnapshot), { fontType: 'monospacedDigit' });
  }
  tray.setContextMenu(
    Menu.buildFromTemplate(
      buildTrayTemplate(latestSnapshot, {
        refreshNow: () => {
          void refresh();
        },
        copySummary: () => {
          if (latestSnapshot) clipboard.writeText(createDeterministicSummary(latestSnapshot, config));
        },
        switchToFixtureMode: () => {
          provider = new DemoFixtureProvider();
          void refresh();
        },
        quit: () => app.quit()
      })
    )
  );
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
  if (refreshTimer) clearInterval(refreshTimer);
});

app.on('window-all-closed', () => {
  // Tray-only app: keep the process alive until the tray Quit action or smoke timeout exits.
});
