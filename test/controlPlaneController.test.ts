import { describe, expect, it } from 'vitest';
import { ControlPlaneController } from '../src/main/controlPlaneController.js';
import { loadConfig } from '../src/shared/config.js';

describe('ControlPlaneController', () => {
  it('normalizes provider collection failures into diagnostic snapshots', async () => {
    const controller = new ControlPlaneController(
      loadConfig({ RP_CLI_PATH: '/definitely/missing/rp-cli', RP_CONTROL_PLANE_POLL_MS: '600000', RP_CONTROL_PLANE_OPEN_WINDOW: '0' })
    );

    const snapshot = await controller.start();
    controller.stop();

    expect(snapshot.provider).toBe('rp-cli');
    expect(snapshot.sessions).toEqual([]);
    expect(snapshot.diagnostics.some((diagnostic) => diagnostic.severity === 'error')).toBe(true);
    expect(controller.getSnapshot()).toBe(snapshot);
  });

  it('switches to fixture mode through provider factory support', async () => {
    const controller = new ControlPlaneController(
      loadConfig({ RP_CLI_PATH: '/definitely/missing/rp-cli', RP_CONTROL_PLANE_POLL_MS: '600000', RP_CONTROL_PLANE_OPEN_WINDOW: '0' })
    );

    const snapshot = await controller.setProviderMode('fixture');
    controller.stop();

    expect(controller.getProviderMode()).toBe('fixture');
    expect(snapshot.provider).toBe('demo-fixture');
    expect(snapshot.summarySource).toBe('fixture');
  });
});
