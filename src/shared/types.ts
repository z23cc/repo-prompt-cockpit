export type ObservationKind = 'observed' | 'inferred' | 'fixture' | 'unavailable';

export type CapabilityStatus = 'available' | 'unavailable' | 'error' | 'unknown';

export type PrivacyClass = 'metadata' | 'log_excerpt' | 'transcript' | 'local_only';

export type SessionState = 'running' | 'waiting_for_input' | 'blocked' | 'completed' | 'failed' | 'idle' | 'unknown';

export interface ProviderDiagnostic {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  observedAt: string;
  command?: string;
}

export interface CapabilityMatrixEntry {
  field: string;
  source: string;
  command?: string;
  requiresBinding: boolean;
  parseFormat: 'text' | 'json' | 'fixture' | 'none';
  failureMode: string;
  privacyClass: PrivacyClass;
  observation: ObservationKind;
  status: CapabilityStatus;
}

export interface RepoPromptTab {
  name: string;
  contextId?: string;
  active: boolean;
  observation: ObservationKind;
}

export interface RepoPromptWindow {
  id: number;
  workspace: string;
  repoPath?: string;
  tabs: RepoPromptTab[];
  observation: ObservationKind;
}

export interface AgentSession {
  id: string;
  title: string;
  workspace?: string;
  state: SessionState;
  model?: string;
  progress?: number;
  updatedAt?: string;
  observation: ObservationKind;
  summary?: string;
}

export interface AttentionItem {
  id: string;
  label: string;
  detail: string;
  priority: number;
  state: SessionState | 'workspace' | 'diagnostic';
  observation: ObservationKind;
}

export interface ControlPlaneSnapshot {
  generatedAt: string;
  provider: 'rp-cli' | 'demo-fixture';
  windows: RepoPromptWindow[];
  sessions: AgentSession[];
  capabilities: CapabilityMatrixEntry[];
  diagnostics: ProviderDiagnostic[];
  summarySource: ObservationKind;
}

export interface ControlPlaneConfig {
  rpCliPath: string;
  pollingIntervalMs: number;
  staleAfterMinutes: number;
  enableLlmSummaries: boolean;
  summaryMaxChars: number;
  preferDemoProvider: boolean;
}

export interface RepoPromptProvider {
  readonly name: ControlPlaneSnapshot['provider'];
  collectSnapshot(): Promise<ControlPlaneSnapshot>;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type CommandRunner = (executable: string, args: string[], timeoutMs: number) => Promise<CommandResult>;
