import { contextBridge, ipcRenderer } from 'electron';
import { CONTROL_PLANE_IPC, type ControlPlanePreloadApi } from '../shared/ipc.js';
import type { ControlPlaneSnapshot, ProviderMode, WindowMode } from '../shared/types.js';

const api: ControlPlanePreloadApi = {
  getSnapshot: () => ipcRenderer.invoke(CONTROL_PLANE_IPC.getSnapshot) as Promise<ControlPlaneSnapshot | undefined>,
  refreshNow: () => ipcRenderer.invoke(CONTROL_PLANE_IPC.refreshNow) as Promise<ControlPlaneSnapshot>,
  copySummary: () => ipcRenderer.invoke(CONTROL_PLANE_IPC.copySummary) as Promise<void>,
  setProviderMode: (mode: ProviderMode) => ipcRenderer.invoke(CONTROL_PLANE_IPC.setProviderMode, mode) as Promise<ControlPlaneSnapshot>,
  getWindowMode: () => ipcRenderer.invoke(CONTROL_PLANE_IPC.getWindowMode) as Promise<WindowMode>,
  toggleWindowMode: () => ipcRenderer.invoke(CONTROL_PLANE_IPC.toggleWindowMode) as Promise<WindowMode>,
  onSnapshotChanged: (callback: (snapshot: ControlPlaneSnapshot) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: ControlPlaneSnapshot) => callback(snapshot);
    ipcRenderer.on(CONTROL_PLANE_IPC.snapshotChanged, listener);
    return () => {
      ipcRenderer.removeListener(CONTROL_PLANE_IPC.snapshotChanged, listener);
    };
  },
  onWindowModeChanged: (callback: (mode: WindowMode) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, mode: WindowMode) => callback(mode);
    ipcRenderer.on(CONTROL_PLANE_IPC.windowModeChanged, listener);
    return () => {
      ipcRenderer.removeListener(CONTROL_PLANE_IPC.windowModeChanged, listener);
    };
  }
};

contextBridge.exposeInMainWorld('controlPlane', api);
