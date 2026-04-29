import type { ControlPlaneSnapshot, ProviderMode, WindowMode } from './types.js';

export const CONTROL_PLANE_IPC = {
  getSnapshot: 'control-plane:get-snapshot',
  refreshNow: 'control-plane:refresh-now',
  copySummary: 'control-plane:copy-summary',
  setProviderMode: 'control-plane:set-provider-mode',
  getWindowMode: 'control-plane:get-window-mode',
  toggleWindowMode: 'control-plane:toggle-window-mode',
  snapshotChanged: 'control-plane:snapshot-changed',
  windowModeChanged: 'control-plane:window-mode-changed'
} as const;

export type ControlPlaneIpcChannel = (typeof CONTROL_PLANE_IPC)[keyof typeof CONTROL_PLANE_IPC];

export interface ControlPlanePreloadApi {
  getSnapshot(): Promise<ControlPlaneSnapshot | undefined>;
  refreshNow(): Promise<ControlPlaneSnapshot>;
  copySummary(): Promise<void>;
  setProviderMode(mode: ProviderMode): Promise<ControlPlaneSnapshot>;
  getWindowMode(): Promise<WindowMode>;
  toggleWindowMode(): Promise<WindowMode>;
  onSnapshotChanged(callback: (snapshot: ControlPlaneSnapshot) => void): () => void;
  onWindowModeChanged(callback: (mode: WindowMode) => void): () => void;
}
