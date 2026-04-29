import { createProvider, resolveInitialProviderMode } from '../repoprompt/providerFactory.js';
import type { ControlPlaneConfig, ControlPlaneSnapshot, ProviderDiagnostic, ProviderMode, RepoPromptProvider } from '../shared/types.js';

export type RefreshReason = 'startup' | 'timer' | 'manual' | 'provider-switch' | 'smoke';

type SnapshotListener = (snapshot: ControlPlaneSnapshot) => void;

export class ControlPlaneController {
  private provider: RepoPromptProvider;
  private providerMode: ProviderMode;
  private latestSnapshot: ControlPlaneSnapshot | undefined;
  private refreshTimer: NodeJS.Timeout | undefined;
  private refreshInFlight: Promise<ControlPlaneSnapshot> | undefined;
  private refreshSequence = 0;
  private readonly listeners = new Set<SnapshotListener>();

  constructor(private readonly config: ControlPlaneConfig) {
    this.providerMode = resolveInitialProviderMode(config);
    this.provider = createProvider(config, this.providerMode);
  }

  async start(): Promise<ControlPlaneSnapshot> {
    const snapshot = await this.refreshNow('startup');
    this.refreshTimer = setInterval(() => {
      void this.refreshNow('timer');
    }, this.config.pollingIntervalMs);
    return snapshot;
  }

  stop(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
    this.listeners.clear();
  }

  getSnapshot(): ControlPlaneSnapshot | undefined {
    return this.latestSnapshot;
  }

  getProviderMode(): ProviderMode {
    return this.providerMode;
  }

  getConfig(): ControlPlaneConfig {
    return this.config;
  }

  async refreshNow(reason: RefreshReason = 'manual'): Promise<ControlPlaneSnapshot> {
    if (this.refreshInFlight && reason !== 'provider-switch' && reason !== 'startup') return this.refreshInFlight;

    const sequence = ++this.refreshSequence;
    const activeProvider = this.provider;
    const promise = this.collectSnapshot(activeProvider).then((snapshot) => {
      if (this.provider !== activeProvider || sequence !== this.refreshSequence) {
        return this.latestSnapshot ?? snapshot;
      }

      this.latestSnapshot = snapshot;
      this.notify(snapshot);
      return snapshot;
    });

    this.refreshInFlight = promise;

    try {
      return await promise;
    } finally {
      if (this.refreshInFlight === promise) this.refreshInFlight = undefined;
    }
  }

  async setProviderMode(mode: ProviderMode): Promise<ControlPlaneSnapshot> {
    if (mode === this.providerMode && this.latestSnapshot) return this.refreshNow('manual');

    this.providerMode = mode;
    this.provider = createProvider(this.config, mode);
    this.refreshSequence += 1;
    return this.refreshNow('provider-switch');
  }

  onSnapshot(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async collectSnapshot(provider: RepoPromptProvider): Promise<ControlPlaneSnapshot> {
    try {
      return await provider.collectSnapshot();
    } catch (error) {
      const now = new Date().toISOString();
      const diagnostic: ProviderDiagnostic = {
        code: 'provider_collect_exception',
        message: error instanceof Error ? error.message : String(error),
        severity: 'error',
        observedAt: now
      };

      return {
        generatedAt: now,
        provider: provider.name,
        windows: [],
        sessions: [],
        capabilities: [],
        diagnostics: [diagnostic],
        summarySource: 'unavailable'
      };
    }
  }

  private notify(snapshot: ControlPlaneSnapshot): void {
    for (const listener of this.listeners) listener(snapshot);
  }
}
