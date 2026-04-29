import type { ControlPlaneConfig, ProviderMode, RepoPromptProvider } from '../shared/types.js';
import { DemoFixtureProvider, RpCliProvider } from './providers/index.js';

export function createProvider(
  config: ControlPlaneConfig,
  mode: ProviderMode = config.preferDemoProvider ? 'fixture' : 'live'
): RepoPromptProvider {
  if (mode === 'fixture') return new DemoFixtureProvider();
  return new RpCliProvider(config);
}

export function resolveInitialProviderMode(config: Pick<ControlPlaneConfig, 'preferDemoProvider'>): ProviderMode {
  return config.preferDemoProvider ? 'fixture' : 'live';
}
