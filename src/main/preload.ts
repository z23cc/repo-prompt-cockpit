import { contextBridge, ipcRenderer } from 'electron';
import { CONTROL_PLANE_IPC, type ControlPlanePreloadApi } from '../shared/ipc.js';
import type { ControlPlaneSnapshot, ProviderMode } from '../shared/types.js';

const api: ControlPlanePreloadApi = {
  getSnapshot: () => ipcRenderer.invoke(CONTROL_PLANE_IPC.getSnapshot) as Promise<ControlPlaneSnapshot | undefined>,
  refreshNow: () => ipcRenderer.invoke(CONTROL_PLANE_IPC.refreshNow) as Promise<ControlPlaneSnapshot>,
  copySummary: () => ipcRenderer.invoke(CONTROL_PLANE_IPC.copySummary) as Promise<void>,
  setProviderMode: (mode: ProviderMode) => ipcRenderer.invoke(CONTROL_PLANE_IPC.setProviderMode, mode) as Promise<ControlPlaneSnapshot>,
  onSnapshotChanged: (callback: (snapshot: ControlPlaneSnapshot) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: ControlPlaneSnapshot) => callback(snapshot);
    ipcRenderer.on(CONTROL_PLANE_IPC.snapshotChanged, listener);
    return () => {
      ipcRenderer.removeListener(CONTROL_PLANE_IPC.snapshotChanged, listener);
    };
  }
};

contextBridge.exposeInMainWorld('controlPlane', api);
