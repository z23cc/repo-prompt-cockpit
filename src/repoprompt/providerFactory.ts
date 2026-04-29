import type { ControlPlaneConfig, RepoPromptProvider } from '../shared/types.js';
import { DemoFixtureProvider, RpCliProvider } from './providers/index.js';

export function createProvider(config: ControlPlaneConfig): RepoPromptProvider {
  if (config.preferDemoProvider) return new DemoFixtureProvider();
  return new RpCliProvider(config);
}
