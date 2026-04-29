import type { ControlPlaneSnapshot, ProviderMode } from './types.js';

export const CONTROL_PLANE_IPC = {
  getSnapshot: 'control-plane:get-snapshot',
  refreshNow: 'control-plane:refresh-now',
  copySummary: 'control-plane:copy-summary',
  setProviderMode: 'control-plane:set-provider-mode',
  snapshotChanged: 'control-plane:snapshot-changed'
} as const;

export type ControlPlaneIpcChannel = (typeof CONTROL_PLANE_IPC)[keyof typeof CONTROL_PLANE_IPC];

export interface ControlPlanePreloadApi {
  getSnapshot(): Promise<ControlPlaneSnapshot | undefined>;
  refreshNow(): Promise<ControlPlaneSnapshot>;
  copySummary(): Promise<void>;
  setProviderMode(mode: ProviderMode): Promise<ControlPlaneSnapshot>;
  onSnapshotChanged(callback: (snapshot: ControlPlaneSnapshot) => void): () => void;
}
