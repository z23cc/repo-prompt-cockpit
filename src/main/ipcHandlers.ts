import type { Clipboard, IpcMain } from 'electron';
import { summarizeForClipboard } from '../domain/summary.js';
import { CONTROL_PLANE_IPC } from '../shared/ipc.js';
import type { ControlPlaneSnapshot, ProviderMode } from '../shared/types.js';
import type { ControlPlaneController } from './controlPlaneController.js';
import type { DesktopWindowController } from './desktopWindow.js';

export interface IpcHandlerDeps {
  ipcMain: IpcMain;
  clipboard: Clipboard;
  controller: ControlPlaneController;
  desktopWindow: DesktopWindowController;
}

export function registerControlPlaneIpcHandlers({ ipcMain, clipboard, controller, desktopWindow }: IpcHandlerDeps): () => void {
  ipcMain.handle(CONTROL_PLANE_IPC.getSnapshot, () => controller.getSnapshot());
  ipcMain.handle(CONTROL_PLANE_IPC.refreshNow, () => controller.refreshNow('manual'));
  ipcMain.handle(CONTROL_PLANE_IPC.copySummary, () => {
    const snapshot = requireSnapshot(controller.getSnapshot());
    clipboard.writeText(summarizeForClipboard(snapshot, controller.getConfig()));
  });
  ipcMain.handle(CONTROL_PLANE_IPC.setProviderMode, (_event, mode: unknown) => controller.setProviderMode(parseProviderMode(mode)));
  ipcMain.handle(CONTROL_PLANE_IPC.getWindowMode, () => desktopWindow.getWindowMode());
  ipcMain.handle(CONTROL_PLANE_IPC.toggleWindowMode, () => desktopWindow.toggleWindowMode());

  return () => {
    ipcMain.removeHandler(CONTROL_PLANE_IPC.getSnapshot);
    ipcMain.removeHandler(CONTROL_PLANE_IPC.refreshNow);
    ipcMain.removeHandler(CONTROL_PLANE_IPC.copySummary);
    ipcMain.removeHandler(CONTROL_PLANE_IPC.setProviderMode);
    ipcMain.removeHandler(CONTROL_PLANE_IPC.getWindowMode);
    ipcMain.removeHandler(CONTROL_PLANE_IPC.toggleWindowMode);
  };
}

function parseProviderMode(mode: unknown): ProviderMode {
  if (mode === 'live' || mode === 'fixture') return mode;
  throw new Error('Invalid provider mode. Expected live or fixture.');
}

function requireSnapshot(snapshot: ControlPlaneSnapshot | undefined): ControlPlaneSnapshot {
  if (!snapshot) throw new Error('No cockpit snapshot is available yet.');
  return snapshot;
}
