import type { Clipboard, IpcMain } from 'electron';
import { describe, expect, it } from 'vitest';
import { registerControlPlaneIpcHandlers } from '../src/main/ipcHandlers.js';
import { CONTROL_PLANE_IPC } from '../src/shared/ipc.js';
import type { ControlPlaneSnapshot } from '../src/shared/types.js';
import { loadConfig } from '../src/shared/config.js';
import type { ControlPlaneController } from '../src/main/controlPlaneController.js';

type Handler = (event: unknown, ...args: unknown[]) => unknown;

class FakeIpcMain {
  readonly handlers = new Map<string, Handler>();

  handle(channel: string, handler: Handler): void {
    this.handlers.set(channel, handler);
  }

  removeHandler(channel: string): void {
    this.handlers.delete(channel);
  }
}

const snapshot: ControlPlaneSnapshot = {
  generatedAt: '2026-04-28T00:00:00Z',
  provider: 'rp-cli',
  windows: [],
  sessions: [],
  capabilities: [],
  diagnostics: [],
  summarySource: 'observed'
};

describe('registerControlPlaneIpcHandlers', () => {
  it('registers typed handlers and copies deterministic summaries only', async () => {
    const fakeIpcMain = new FakeIpcMain();
    let copiedText = '';
    const clipboard = { writeText: (value: string) => { copiedText = value; } } as unknown as Clipboard;
    const controller = {
      getSnapshot: () => snapshot,
      refreshNow: async () => snapshot,
      setProviderMode: async () => snapshot,
      getConfig: () => loadConfig({ RP_CONTROL_PLANE_OPEN_WINDOW: '0' })
    } as unknown as ControlPlaneController;

    const unregister = registerControlPlaneIpcHandlers({ ipcMain: fakeIpcMain as unknown as IpcMain, clipboard, controller });

    expect(fakeIpcMain.handlers.has(CONTROL_PLANE_IPC.getSnapshot)).toBe(true);
    await fakeIpcMain.handlers.get(CONTROL_PLANE_IPC.copySummary)?.({}, undefined);
    expect(copiedText).toContain('RepoPrompt Control Plane');

    unregister();
    expect(fakeIpcMain.handlers.size).toBe(0);
  });

  it('rejects invalid provider modes before delegating', async () => {
    const fakeIpcMain = new FakeIpcMain();
    const clipboard = { writeText: () => undefined } as unknown as Clipboard;
    const controller = {
      getSnapshot: () => snapshot,
      refreshNow: async () => snapshot,
      setProviderMode: async () => snapshot,
      getConfig: () => loadConfig({ RP_CONTROL_PLANE_OPEN_WINDOW: '0' })
    } as unknown as ControlPlaneController;

    registerControlPlaneIpcHandlers({ ipcMain: fakeIpcMain as unknown as IpcMain, clipboard, controller });

    await expect(() => fakeIpcMain.handlers.get(CONTROL_PLANE_IPC.setProviderMode)?.({}, 'logs')).toThrow('Invalid provider mode');
  });
});
