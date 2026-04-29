import type { ControlPlanePreloadApi } from '../shared/ipc.js';

declare global {
  interface Window {
    controlPlane: ControlPlanePreloadApi;
  }
}

export {};
