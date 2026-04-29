import {
  createControlPlaneDashboard,
  type ControlPlaneDashboard,
  type SessionTreeNodeView
} from '../domain/dashboard.js';
import type { AgentSession, ControlPlaneSnapshot, ProviderMode, WindowMode } from '../shared/types.js';
import { activityCard, type ActivityCardSelection } from './components/activityCard.js';
import { capabilityMatrix } from './components/capabilityMatrix.js';
import { composerBar, type ComposerStatusKind } from './components/composerBar.js';
import { contextRail } from './components/contextRail.js';
import { diagnosticsPanel } from './components/diagnosticsPanel.js';
import { sidebar } from './components/sidebar.js';
import { workflowDetailsPanel } from './components/workflowDetailsPanel.js';
import { workflowToolbar, type WorkflowTabKey } from './components/workflowToolbar.js';
import { workspaceColumn, type WorkspaceFilter } from './components/workspaceColumn.js';
import { classNames, clear, el } from './components/dom.js';
import { selectDefaultSelectionId } from './selection.js';

interface RendererState {
  snapshot?: ControlPlaneSnapshot;
  dashboard?: ControlPlaneDashboard;
  selectedId?: string;
  workspaceFilter: WorkspaceFilter;
  activeTab: WorkflowTabKey;
  windowMode: WindowMode;
  status: ComposerStatusKind;
  message: string;
}

const DEFAULT_PRIVACY = {
  label: 'Read-only monitoring',
  detail: 'Transcript/log bodies are not loaded or uploaded by default.',
  severity: 'safe' as const
};

const state: RendererState = {
  workspaceFilter: 'all',
  activeTab: 'plan',
  windowMode: 'desktop',
  status: 'idle',
  message: 'Read-only monitoring. Transcript/log bodies are not loaded or uploaded by default.'
};

const root = document.querySelector<HTMLElement>('#app');

function applySnapshot(snapshot: ControlPlaneSnapshot): void {
  state.snapshot = snapshot;
  state.dashboard = createControlPlaneDashboard(snapshot);
  if (!state.selectedId || !selectionExists(state.dashboard, state.selectedId)) {
    state.selectedId = selectDefaultSelectionId(state.dashboard);
  }
  state.status = 'idle';
  state.message = `Snapshot updated ${new Date(snapshot.generatedAt).toLocaleTimeString()} via ${state.dashboard.providerLabel}.`;
  render();
}

async function handleRefresh(): Promise<void> {
  state.status = 'refreshing';
  state.message = 'Refreshing read-only snapshot…';
  render();
  try {
    const snapshot = await window.controlPlane.refreshNow();
    applySnapshot(snapshot);
  } catch (error) {
    handleError(error);
  }
}

async function handleSetMode(mode: ProviderMode): Promise<void> {
  if (state.dashboard) {
    if (mode === 'fixture' && state.dashboard.isFixture) return;
    if (mode === 'live' && state.dashboard.isLive) return;
  }
  state.status = 'refreshing';
  state.message = mode === 'fixture' ? 'Switching to fixture demo mode…' : 'Switching to live rp-cli mode…';
  state.selectedId = undefined;
  render();
  try {
    const snapshot = await window.controlPlane.setProviderMode(mode);
    applySnapshot(snapshot);
  } catch (error) {
    handleError(error);
  }
}

async function handleToggleWindowMode(): Promise<void> {
  try {
    state.windowMode = await window.controlPlane.toggleWindowMode();
    state.status = 'idle';
    state.message =
      state.windowMode === 'minimal'
        ? 'Minimal cockpit mode enabled. Window stays on top for desktop monitoring.'
        : 'Desktop cockpit mode restored.';
    render();
  } catch (error) {
    handleError(error);
  }
}

async function handleCopySummary(): Promise<void> {
  try {
    await window.controlPlane.copySummary();
    state.status = 'idle';
    state.message = 'Deterministic summary copied to clipboard.';
    render();
  } catch (error) {
    handleError(error);
  }
}

function handleError(error: unknown): void {
  state.status = 'error';
  state.message = error instanceof Error ? error.message : String(error);
  render();
}

function handleSelect(id: string): void {
  state.selectedId = id;
  if (state.activeTab === 'logs' || state.activeTab === 'artifacts' || state.activeTab === 'results') {
    // keep current tab if user explicitly chose one
  } else {
    state.activeTab = 'plan';
  }
  render();
}

function handleFilter(filter: WorkspaceFilter): void {
  state.workspaceFilter = filter;
  render();
}

function handleTabChange(tab: WorkflowTabKey): void {
  state.activeTab = tab;
  render();
}

function render(): void {
  if (!root) return;
  clear(root);

  const dashboard = state.dashboard;

  if (!dashboard) {
    root.className = 'cockpit cockpit-loading';
    root.append(
      sidebar(),
      el('section', { class: 'cockpit-loading-panel' }, [
        el('p', { class: 'eyebrow' }, ['Repo Prompt Cockpit']),
        el('h1', undefined, ['Loading cockpit snapshot…']),
        el('p', { class: 'muted' }, [
          'Read-only monitoring. Transcript and log bodies are not loaded or uploaded by default.'
        ])
      ])
    );
    return;
  }

  root.className = classNames('cockpit', state.windowMode === 'minimal' && 'is-minimal-mode');
  const selection = currentSelection(dashboard, state.selectedId);
  if (state.windowMode !== 'minimal') {
    root.append(
      sidebar({ activeId: 'cockpit', counts: dashboard.statusCounts }),
      workspaceColumn(
        {
          items: dashboard.implementationPlan.items,
          selectedId: state.selectedId,
          filter: state.workspaceFilter,
          generatedAt: dashboard.generatedAt
        },
        { onSelect: handleSelect, onFilter: handleFilter }
      )
    );
  }
  // Main content
  root.append(
    el('section', { class: 'cockpit-main', attrs: { id: 'cockpit' } }, [
      workflowToolbar(
        {
          dashboard,
          selected: selection
            ? {
                title: selection.title,
                state: selection.state,
                workspace: selection.workspace,
                model: selection.model,
                observation: selection.observation
              }
            : undefined,
          activeTab: state.activeTab,
          isFixture: dashboard.isFixture,
          windowMode: state.windowMode
        },
        {
          onTabChange: handleTabChange,
          onMode: (mode) => void handleSetMode(mode),
          onToggleWindowMode: () => void handleToggleWindowMode()
        }
      ),
      el('div', { class: 'cockpit-content' }, [
        activityCard(dashboard, selection),
        workflowDetailsPanel({
          dashboard,
          activeTab: state.activeTab,
          selectedTitle: selection?.title,
          selectedWorkspace: selection?.workspace
        }),
        ...(state.windowMode === 'minimal' ? [] : [capabilitySection(dashboard), diagnosticSection(dashboard)])
      ])
    ])
  );

  if (state.windowMode !== 'minimal') {
    root.append(
      contextRail(
        { dashboard, selectedId: state.selectedId },
        { onSelect: handleSelect }
      )
    );
  }

  // Composer
  root.append(
    composerBar(
      {
        privacy: dashboard.privacyBanner ?? DEFAULT_PRIVACY,
        status: state.status,
        message: state.message,
        refreshDisabled: state.status === 'refreshing',
        copyDisabled: !dashboard
      },
      { refresh: () => void handleRefresh(), copySummary: () => void handleCopySummary() }
    )
  );
}

function capabilitySection(dashboard: ControlPlaneDashboard): HTMLElement {
  return el('section', { class: 'card', attrs: { id: 'capabilities' } }, [
    el('header', { class: 'card-head' }, [
      el('div', { class: 'card-head-title' }, ['Capabilities']),
      el('span', { class: 'card-head-sub muted' }, [`${dashboard.capabilityRows.length} fields`])
    ]),
    capabilityMatrix(dashboard.capabilityRows)
  ]);
}

function diagnosticSection(dashboard: ControlPlaneDashboard): HTMLElement {
  return el('section', { class: 'card', attrs: { id: 'diagnostics' } }, [
    el('header', { class: 'card-head' }, [
      el('div', { class: 'card-head-title' }, ['Diagnostics']),
      el('span', { class: 'card-head-sub muted' }, [
        dashboard.diagnostics.length === 1 ? '1 entry' : `${dashboard.diagnostics.length} entries`
      ])
    ]),
    diagnosticsPanel(dashboard.diagnostics)
  ]);
}

function selectionExists(dashboard: ControlPlaneDashboard, id: string): boolean {
  if (dashboard.focusItems.some((item) => item.id === id)) return true;
  if (dashboard.implementationPlan.items.some((item) => item.kind === 'session' && item.id === id)) return true;
  for (const group of dashboard.sessionGroups) {
    if (group.sessions.some((session) => session.id === id)) return true;
  }
  return treeContains(dashboard.sessionTree.roots, id);
}

function treeContains(roots: SessionTreeNodeView[], id: string): boolean {
  for (const node of roots) {
    if (node.id === id) return true;
    if (treeContains(node.children, id)) return true;
  }
  return false;
}

function currentSelection(
  dashboard: ControlPlaneDashboard,
  id: string | undefined
): ActivityCardSelection | undefined {
  if (!id) return undefined;
  const session = findSessionInGroups(dashboard, id);
  const treeNode = findInTree(dashboard.sessionTree.roots, id);
  const planItem = dashboard.implementationPlan.items.find(
    (item) => item.kind === 'session' && item.id === id
  );
  const focusItem = dashboard.focusItems.find((item) => item.id === id);

  if (session) {
    return {
      id: session.id,
      title: session.title,
      state: session.state,
      observation: session.observation,
      workspace: session.workspace,
      model: session.model,
      role: treeNode?.role,
      progress: session.progress,
      updatedAt: session.updatedAt,
      summary: session.summary,
      relationshipLabel: treeNode?.relationshipLabel
    };
  }

  if (planItem) {
    return {
      id: planItem.id,
      title: planItem.title,
      state: planItem.state,
      observation: planItem.observation,
      workspace: planItem.workspace,
      model: planItem.model,
      progress: planItem.progress,
      summary: planItem.detail
    };
  }

  if (treeNode) {
    return {
      id: treeNode.id,
      title: treeNode.title,
      state: treeNode.state,
      observation: treeNode.observation,
      model: treeNode.model,
      role: treeNode.role,
      relationshipLabel: treeNode.relationshipLabel
    };
  }

  if (focusItem) {
    return {
      id: focusItem.id,
      title: focusItem.label,
      state: focusItem.state === 'workspace' || focusItem.state === 'diagnostic' ? 'unavailable' : focusItem.state,
      observation: focusItem.observation,
      summary: focusItem.detail
    };
  }

  return undefined;
}

function findSessionInGroups(dashboard: ControlPlaneDashboard, id: string): AgentSession | undefined {
  for (const group of dashboard.sessionGroups) {
    const match = group.sessions.find((session) => session.id === id);
    if (match) return match;
  }
  return undefined;
}

function findInTree(nodes: SessionTreeNodeView[], id: string): SessionTreeNodeView | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findInTree(node.children, id);
    if (found) return found;
  }
  return undefined;
}

void (async () => {
  render();
  try {
    const [windowMode, initial] = await Promise.all([
      window.controlPlane.getWindowMode(),
      window.controlPlane.getSnapshot()
    ]);
    state.windowMode = windowMode;
    if (initial) {
      applySnapshot(initial);
    } else {
      state.status = 'refreshing';
      state.message = 'Waiting for initial snapshot…';
      render();
    }
  } catch (error) {
    handleError(error);
  }
  window.controlPlane.onSnapshotChanged((snapshot) => {
    applySnapshot(snapshot);
  });
  window.controlPlane.onWindowModeChanged((mode) => {
    state.windowMode = mode;
    render();
  });
})();

