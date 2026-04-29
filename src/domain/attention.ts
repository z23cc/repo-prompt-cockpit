import type { AgentSession, AttentionItem, ControlPlaneSnapshot, ProviderDiagnostic } from '../shared/types.js';

const STATE_PRIORITY: Record<string, number> = {
  waiting_for_input: 100,
  failed: 90,
  blocked: 80,
  running: 60,
  completed: 30,
  idle: 10,
  unknown: 5
};

export function deriveAttentionItems(snapshot: ControlPlaneSnapshot): AttentionItem[] {
  const sessionItems = snapshot.sessions.map(sessionToAttentionItem);
  const diagnosticItems = snapshot.diagnostics
    .filter((diagnostic) => diagnostic.severity !== 'info')
    .map(diagnosticToAttentionItem);

  if (sessionItems.length === 0) {
    const windows = snapshot.windows.length;
    if (windows > 0) {
      const workspaceFallback: AttentionItem = {
        id: 'workspace-context-only',
        label: 'No actionable session data available',
        detail: `${windows} RepoPrompt workspace${windows === 1 ? '' : 's'} observed; agent session state is unavailable.`,
        priority: 40,
        state: 'workspace',
        observation: snapshot.summarySource === 'fixture' ? 'fixture' : 'observed'
      };
      return [workspaceFallback, ...diagnosticItems].sort(sortAttention);
    }

    const unavailableFallback: AttentionItem = {
      id: 'no-actionable-data',
      label: 'No actionable session data available',
      detail: 'Provider did not return session or workspace state.',
      priority: 45,
      state: 'diagnostic',
      observation: 'unavailable'
    };
    return [unavailableFallback, ...diagnosticItems].sort(sortAttention);
  }

  return [...sessionItems, ...diagnosticItems].sort(sortAttention);
}

function sessionToAttentionItem(session: AgentSession): AttentionItem {
  const percent = typeof session.progress === 'number' ? ` (${Math.round(session.progress * 100)}%)` : '';
  const workspace = session.workspace ? ` in ${session.workspace}` : '';
  return {
    id: session.id,
    label: session.title,
    detail: `${formatState(session.state)}${percent}${workspace}`,
    priority: STATE_PRIORITY[session.state] ?? STATE_PRIORITY.unknown,
    state: session.state,
    observation: session.observation
  };
}

function diagnosticToAttentionItem(diagnostic: ProviderDiagnostic): AttentionItem {
  return {
    id: `diagnostic-${diagnostic.code}`,
    label: diagnostic.severity === 'error' ? 'Provider error' : 'Provider warning',
    detail: diagnostic.message,
    priority: diagnostic.severity === 'error' ? 95 : 55,
    state: 'diagnostic',
    observation: 'observed'
  };
}

function sortAttention(a: AttentionItem, b: AttentionItem): number {
  if (b.priority !== a.priority) return b.priority - a.priority;
  return a.label.localeCompare(b.label);
}

function formatState(state: AgentSession['state']): string {
  return state.replaceAll('_', ' ');
}
