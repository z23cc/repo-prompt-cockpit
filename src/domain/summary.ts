import type { ControlPlaneConfig, ControlPlaneSnapshot } from '../shared/types.js';
import { DEFAULT_SUMMARY_MAX_CHARS } from '../shared/config.js';
import { deriveAttentionItems } from './attention.js';

export function createDeterministicSummary(
  snapshot: ControlPlaneSnapshot,
  config: Pick<ControlPlaneConfig, 'summaryMaxChars'> = { summaryMaxChars: DEFAULT_SUMMARY_MAX_CHARS }
): string {
  const maxChars = Math.max(160, Math.min(config.summaryMaxChars, DEFAULT_SUMMARY_MAX_CHARS));
  const attention = deriveAttentionItems(snapshot);
  const counts = countStates(snapshot);
  const focus = attention[0];
  const lines = [
    `RepoPrompt Control Plane (${snapshot.provider}${snapshot.summarySource === 'fixture' ? ', fixture-backed' : ''})`,
    `Workspaces: ${snapshot.windows.length}; Sessions: ${snapshot.sessions.length}; Running: ${counts.running}; Waiting: ${counts.waiting_for_input}; Blocked: ${counts.blocked}; Failed: ${counts.failed}; Completed: ${counts.completed}`,
    focus ? `Focus next [${focus.observation}]: ${focus.label} — ${focus.detail}` : 'Focus next: No actionable session data available',
    diagnosticsLine(snapshot),
    `Updated: ${snapshot.generatedAt}`
  ].filter(Boolean);

  return truncate(lines.join('\n'), maxChars);
}

export function summarizeForClipboard(snapshot: ControlPlaneSnapshot, config?: Pick<ControlPlaneConfig, 'summaryMaxChars'>): string {
  return createDeterministicSummary(snapshot, config);
}

function countStates(snapshot: ControlPlaneSnapshot): Record<string, number> {
  return snapshot.sessions.reduce<Record<string, number>>(
    (counts, session) => {
      counts[session.state] = (counts[session.state] ?? 0) + 1;
      return counts;
    },
    { running: 0, waiting_for_input: 0, blocked: 0, failed: 0, completed: 0 }
  );
}

function diagnosticsLine(snapshot: ControlPlaneSnapshot): string | undefined {
  const actionable = snapshot.diagnostics.filter((diagnostic) => diagnostic.severity !== 'info');
  if (actionable.length === 0) return undefined;
  return `Diagnostics: ${actionable.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join('; ')}`;
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
}

export function maybeCreateLlmSummary(): never {
  throw new Error('LLM summaries are disabled by default and are not implemented in the MVP.');
}
