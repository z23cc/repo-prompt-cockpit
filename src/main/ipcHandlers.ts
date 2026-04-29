import type { Clipboard, IpcMain } from 'electron';
import { summarizeForClipboard } from '../domain/summary.js';
import { CONTROL_PLANE_IPC } from '../shared/ipc.js';
import type { ControlPlaneSnapshot, ProviderMode } from '../shared/types.js';
import type { ControlPlaneController } from './controlPlaneController.js';

export interface IpcHandlerDeps {
  ipcMain: IpcMain;
  clipboard: Clipboard;
  controller: ControlPlaneController;
}

export function registerControlPlaneIpcHandlers({ ipcMain, clipboard, controller }: IpcHandlerDeps): () => void {
  ipcMain.handle(CONTROL_PLANE_IPC.getSnapshot, () => controller.getSnapshot());
  ipcMain.handle(CONTROL_PLANE_IPC.refreshNow, () => controller.refreshNow('manual'));
  ipcMain.handle(CONTROL_PLANE_IPC.copySummary, () => {
    const snapshot = requireSnapshot(controller.getSnapshot());
    clipboard.writeText(summarizeForClipboard(snapshot, controller.getConfig()));
  });
  ipcMain.handle(CONTROL_PLANE_IPC.setProviderMode, (_event, mode: unknown) => controller.setProviderMode(parseProviderMode(mode)));

  return () => {
    ipcMain.removeHandler(CONTROL_PLANE_IPC.getSnapshot);
    ipcMain.removeHandler(CONTROL_PLANE_IPC.refreshNow);
    ipcMain.removeHandler(CONTROL_PLANE_IPC.copySummary);
    ipcMain.removeHandler(CONTROL_PLANE_IPC.setProviderMode);
  };
}

function parseProviderMode(mode: unknown): ProviderMode {
  if (mode === 'live' || mode === 'fixture') return mode;
  throw new Error('Invalid provider mode. Expected live or fixture.');
}

function requireSnapshot(snapshot: ControlPlaneSnapshot | undefined): ControlPlaneSnapshot {
  if (!snapshot) throw new Error('No control plane snapshot is available yet.');
  return snapshot;
}
