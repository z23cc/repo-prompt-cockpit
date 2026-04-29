import { deriveAttentionItems } from './attention.js';
import type {
  AgentSession,
  AttentionItem,
  CapabilityMatrixEntry,
  ControlPlaneSnapshot,
  ObservationKind,
  ProviderDiagnostic,
  SessionState
} from '../shared/types.js';

export interface StatusCounts {
  workspaces: number;
  sessions: number;
  running: number;
  waiting: number;
  blocked: number;
  failed: number;
  completed: number;
  idle: number;
  unknown: number;
}

export interface WorkspaceContextTabView {
  id: string;
  workspace: string;
  windowId: number;
  tabName: string;
  contextId?: string;
  active: boolean;
  repoPath?: string;
  observation: ObservationKind;
}

export interface WorkspaceView {
  id: string;
  workspace: string;
  repoPath?: string;
  windowIds: number[];
  tabCount: number;
  activeTabCount: number;
  contextTabs: WorkspaceContextTabView[];
  observation: ObservationKind;
}

export interface SessionGroupView {
  workspace: string;
  sessions: AgentSession[];
}

export interface SessionTreeNodeView {
  id: string;
  title: string;
  state: SessionState;
  model?: string;
  role?: string;
  observation: ObservationKind;
  relationship: 'observed' | 'inferred' | 'flat';
  relationshipLabel: string;
  children: SessionTreeNodeView[];
}

export interface SessionTreeView {
  roots: SessionTreeNodeView[];
  mode: 'observed' | 'inferred' | 'flat';
  modeLabel: string;
}

export type ImplementationPlanItemKind = 'session' | 'placeholder';

export interface ImplementationPlanItem {
  id: string;
  title: string;
  detail: string;
  state: SessionState | 'unavailable';
  observation: ObservationKind;
  progress?: number;
  workspace?: string;
  model?: string;
  updatedAt?: string;
  /**
   * `'session'` for real provider-reported sessions, `'placeholder'` for the
   * deterministic "no session state" / "no activity" rows we synthesize so the
   * UI can render an honest empty state. Placeholders MUST NOT be counted as
   * sessions in any UI.
   */
  kind: ImplementationPlanItemKind;
}

export interface ImplementationPlanView {
  items: ImplementationPlanItem[];
}

export interface ActivityPanelTab {
  key: 'plan' | 'activity' | 'artifacts' | 'logs' | 'results';
  label: string;
  available: boolean;
  detail: string;
}

export interface ActivityPanelView {
  selectedItemId?: string;
  tabs: ActivityPanelTab[];
}

export interface CapabilityRowView {
  field: string;
  status: CapabilityMatrixEntry['status'];
  observation: ObservationKind;
  source: string;
}

export interface PrivacyBannerView {
  label: string;
  detail: string;
  severity: 'safe' | 'warning';
}

export interface ControlPlaneDashboard {
  generatedAt: string;
  providerLabel: string;
  isFixture: boolean;
  isLive: boolean;
  statusCounts: StatusCounts;
  focusItems: AttentionItem[];
  workspaces: WorkspaceView[];
  sessionGroups: SessionGroupView[];
  sessionTree: SessionTreeView;
  implementationPlan: ImplementationPlanView;
  activityPanel: ActivityPanelView;
  capabilityRows: CapabilityRowView[];
  diagnostics: ProviderDiagnostic[];
  privacyBanner: PrivacyBannerView;
}

export function createControlPlaneDashboard(snapshot: ControlPlaneSnapshot): ControlPlaneDashboard {
  const isFixture = snapshot.provider === 'demo-fixture' || snapshot.summarySource === 'fixture';
  const focusItems = deriveAttentionItems(snapshot);
  const implementationItems = createImplementationPlanItems(snapshot);

  return {
    generatedAt: snapshot.generatedAt,
    providerLabel: snapshot.provider === 'demo-fixture' ? 'demo-fixture (fixture)' : 'rp-cli (live)',
    isFixture,
    isLive: !isFixture,
    statusCounts: createStatusCounts(snapshot),
    focusItems,
    workspaces: createWorkspaceViews(snapshot),
    sessionGroups: createSessionGroups(snapshot),
    sessionTree: createSessionTree(snapshot.sessions),
    implementationPlan: { items: implementationItems },
    activityPanel: {
      selectedItemId: selectActivityItemId(focusItems, implementationItems),
      tabs: [
        {
          key: 'plan',
          label: 'Plan',
          available: true,
          detail: 'Selected workflow/session metadata when provider reports a real session; otherwise an honest empty state.'
        },
        { key: 'activity', label: 'Activity', available: true, detail: 'Session metadata and deterministic status only.' },
        {
          key: 'artifacts',
          label: 'Artifacts',
          available: false,
          detail: 'Artifacts are not reported by the read-only provider snapshot.'
        },
        {
          key: 'logs',
          label: 'Logs',
          available: false,
          detail: 'Log/transcript capability is not called by default; bodies are unavailable.'
        },
        { key: 'results', label: 'Results', available: false, detail: 'Results are not reported by the read-only provider snapshot.' }
      ]
    },
    capabilityRows: snapshot.capabilities.map((capability) => ({
      field: capability.field,
      status: capability.status,
      observation: capability.observation,
      source: capability.source
    })),
    diagnostics: snapshot.diagnostics,
    privacyBanner: {
      label: 'Read-only cockpit',
      detail: 'Need transcript, log, artifact, or result bodies? Use the matching Repo Prompt tab/context listed in the right rail and inspect those views in Repo Prompt itself. This cockpit keeps body content out by default.',
      severity: 'safe'
    }
  };
}

function createStatusCounts(snapshot: ControlPlaneSnapshot): StatusCounts {
  const counts: StatusCounts = {
    workspaces: new Set(snapshot.windows.map((window) => window.workspace)).size,
    sessions: snapshot.sessions.length,
    running: 0,
    waiting: 0,
    blocked: 0,
    failed: 0,
    completed: 0,
    idle: 0,
    unknown: 0
  };

  for (const session of snapshot.sessions) {
    if (session.state === 'waiting_for_input') counts.waiting += 1;
    else if (session.state === 'running') counts.running += 1;
    else if (session.state === 'blocked') counts.blocked += 1;
    else if (session.state === 'failed') counts.failed += 1;
    else if (session.state === 'completed') counts.completed += 1;
    else if (session.state === 'idle') counts.idle += 1;
    else counts.unknown += 1;
  }

  return counts;
}

function createWorkspaceViews(snapshot: ControlPlaneSnapshot): WorkspaceView[] {
  const byWorkspace = new Map<string, WorkspaceView>();

  for (const window of snapshot.windows) {
    const current = byWorkspace.get(window.workspace);
    if (current) {
      current.windowIds.push(window.id);
      current.tabCount += window.tabs.length;
      current.activeTabCount += window.tabs.filter((tab) => tab.active).length;
      current.contextTabs.push(...createContextTabsForWindow(window));
      continue;
    }

    byWorkspace.set(window.workspace, {
      id: window.workspace,
      workspace: window.workspace,
      repoPath: window.repoPath,
      windowIds: [window.id],
      tabCount: window.tabs.length,
      activeTabCount: window.tabs.filter((tab) => tab.active).length,
      contextTabs: createContextTabsForWindow(window),
      observation: window.observation
    });
  }

  return [...byWorkspace.values()]
    .map((workspace) => ({
      ...workspace,
      contextTabs: workspace.contextTabs.sort(compareContextTabs)
    }))
    .sort((a, b) => a.workspace.localeCompare(b.workspace));
}

function createContextTabsForWindow(window: ControlPlaneSnapshot['windows'][number]): WorkspaceContextTabView[] {
  return window.tabs.map((tab, index) => ({
    id: `${window.id}:${tab.contextId ?? tab.name}:${index}`,
    workspace: window.workspace,
    windowId: window.id,
    tabName: tab.name,
    contextId: tab.contextId,
    active: tab.active,
    repoPath: window.repoPath,
    observation: tab.observation
  }));
}

function compareContextTabs(a: WorkspaceContextTabView, b: WorkspaceContextTabView): number {
  if (a.active !== b.active) return a.active ? -1 : 1;
  if (a.windowId !== b.windowId) return a.windowId - b.windowId;
  return a.tabName.localeCompare(b.tabName);
}

function createSessionGroups(snapshot: ControlPlaneSnapshot): SessionGroupView[] {
  const groups = new Map<string, AgentSession[]>();

  for (const session of snapshot.sessions) {
    const workspace = session.workspace ?? 'Unscoped';
    const list = groups.get(workspace) ?? [];
    list.push(session);
    groups.set(workspace, list);
  }

  return [...groups.entries()]
    .map(([workspace, sessions]) => ({ workspace, sessions: sessions.slice().sort((a, b) => a.title.localeCompare(b.title)) }))
    .sort((a, b) => a.workspace.localeCompare(b.workspace));
}

function createSessionTree(sessions: AgentSession[]): SessionTreeView {
  if (sessions.length === 0) {
    return {
      roots: [],
      mode: 'flat',
      modeLabel: 'flat sessions (parent link unavailable)'
    };
  }

  const nodes = new Map<string, SessionTreeNodeView>();
  const childrenByParent = new Map<string, SessionTreeNodeView[]>();
  const inferredByWorkflow = new Map<string, SessionTreeNodeView[]>();
  const childIds = new Set<string>();
  let hasObserved = false;

  for (const session of sessions) {
    const raw = session as AgentSession & Record<string, unknown>;
    const node: SessionTreeNodeView = {
      id: session.id,
      title: session.title,
      state: session.state,
      model: session.model,
      role: extractRole(raw),
      observation: session.observation,
      relationship: 'flat',
      relationshipLabel: 'flat sessions (parent link unavailable)',
      children: []
    };
    nodes.set(session.id, node);
  }

  for (const session of sessions) {
    const raw = session as AgentSession & Record<string, unknown>;
    const node = nodes.get(session.id);
    if (!node) continue;

    const explicitParentId = extractExplicitParentId(raw);
    if (explicitParentId && nodes.has(explicitParentId)) {
      node.relationship = 'observed';
      node.relationshipLabel = 'relationship observed';
      hasObserved = true;
      childIds.add(node.id);
      const children = childrenByParent.get(explicitParentId) ?? [];
      children.push(node);
      childrenByParent.set(explicitParentId, children);
      continue;
    }

    const workflowKey = extractWorkflowKey(raw);
    if (workflowKey) {
      const grouped = inferredByWorkflow.get(workflowKey) ?? [];
      grouped.push(node);
      inferredByWorkflow.set(workflowKey, grouped);
    }
  }

  for (const group of inferredByWorkflow.values()) {
    if (group.length < 2) continue;
    const sorted = group.slice().sort((a, b) => a.title.localeCompare(b.title));
    const parent = sorted[0];
    parent.relationship = parent.relationship === 'observed' ? 'observed' : 'inferred';
    parent.relationshipLabel = parent.relationship === 'observed' ? 'relationship observed' : 'relationship inferred';
    for (const child of sorted.slice(1)) {
      if (childIds.has(child.id)) continue;
      child.relationship = 'inferred';
      child.relationshipLabel = 'relationship inferred';
      childIds.add(child.id);
      const children = childrenByParent.get(parent.id) ?? [];
      children.push(child);
      childrenByParent.set(parent.id, children);
    }
  }

  for (const [parentId, children] of childrenByParent.entries()) {
    const parent = nodes.get(parentId);
    if (!parent) continue;
    parent.children = children.sort((a, b) => a.title.localeCompare(b.title));
  }

  const roots = [...nodes.values()]
    .filter((node) => !childIds.has(node.id))
    .sort((a, b) => a.title.localeCompare(b.title));

  const hasInferred = [...nodes.values()].some((node) => node.relationship === 'inferred');
  const mode: SessionTreeView['mode'] = hasObserved ? 'observed' : hasInferred ? 'inferred' : 'flat';
  const modeLabel =
    mode === 'observed'
      ? 'parent-child links observed'
      : mode === 'inferred'
        ? 'relationship inferred'
        : 'flat sessions (parent link unavailable)';

  return { roots, mode, modeLabel };
}

function extractExplicitParentId(raw: Record<string, unknown>): string | undefined {
  const direct = firstString(raw.parentSessionId, raw.parentId, raw.parent_session_id, raw.parent_session);
  if (direct) return direct;

  const metadata = asRecord(raw.metadata);
  if (!metadata) return undefined;

  return firstString(
    metadata.parentSessionId,
    metadata.parentId,
    metadata.parent_session_id,
    metadata.parent_session,
    metadata.parent
  );
}

function extractWorkflowKey(raw: Record<string, unknown>): string | undefined {
  const metadata = asRecord(raw.metadata);
  return firstString(raw.workflowId, raw.workflow, metadata?.workflowId, metadata?.workflow);
}

function extractRole(raw: Record<string, unknown>): string | undefined {
  const metadata = asRecord(raw.metadata);
  return firstString(raw.agentRole, raw.role, metadata?.agentRole, metadata?.role);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function selectActivityItemId(focusItems: AttentionItem[], implementationItems: ImplementationPlanItem[]): string | undefined {
  const sessionIds = new Set(implementationItems.filter((item) => item.kind === 'session').map((item) => item.id));
  return (
    focusItems.find((item) => sessionIds.has(item.id))?.id ??
    implementationItems.find((item) => item.kind === 'session')?.id ??
    focusItems[0]?.id
  );
}

function createImplementationPlanItems(snapshot: ControlPlaneSnapshot): ImplementationPlanItem[] {
  if (snapshot.sessions.length > 0) {
    return snapshot.sessions.map((session) => ({
      id: session.id,
      title: session.title,
      detail: session.summary ?? session.workspace ?? session.model ?? 'No session summary available from read-only snapshot.',
      state: session.state,
      observation: session.observation,
      progress: session.progress,
      workspace: session.workspace,
      model: session.model,
      updatedAt: session.updatedAt,
      kind: 'session'
    }));
  }

  if (snapshot.windows.length > 0) {
    return [
      {
        id: 'unavailable-session-state',
        title: 'No live implementation plan available',
        detail: 'RepoPrompt workspaces are visible, but agent session state is unavailable.',
        state: 'unavailable',
        observation: 'unavailable',
        kind: 'placeholder'
      }
    ];
  }

  return [
    {
      id: 'no-repoprompt-activity',
      title: 'No RepoPrompt activity available',
      detail: createNoActivityDetail(snapshot),
      state: 'unavailable',
      observation: 'unavailable',
      kind: 'placeholder'
    }
  ];
}

function createNoActivityDetail(snapshot: ControlPlaneSnapshot): string {
  const error = snapshot.diagnostics.find((diagnostic) => diagnostic.severity === 'error')?.message;
  if (error) return error;

  const warning = snapshot.diagnostics.find((diagnostic) => diagnostic.severity === 'warning')?.message;
  if (warning) return warning;

  return 'Start RepoPrompt and ensure rp-cli is available to observe windows and session metadata.';
}
