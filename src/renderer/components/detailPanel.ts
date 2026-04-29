import type {
  ActivityPanelTab,
  ControlPlaneDashboard,
  ImplementationPlanItem,
  SessionTreeNodeView
} from '../../domain/dashboard.js';
import type { AgentSession, ObservationKind, SessionState } from '../../shared/types.js';
import { classNames, el } from './dom.js';
import { formatTimestamp, observationLabel, progressLabel, stateLabel } from './format.js';

interface SelectionContext {
  id: string;
  title: string;
  state: SessionState | 'unavailable';
  observation: ObservationKind;
  workspace?: string;
  model?: string;
  role?: string;
  progress?: number;
  updatedAt?: string;
  summary?: string;
  relationshipLabel?: string;
}

export function detailPanel(dashboard: ControlPlaneDashboard, selectedId: string | undefined): HTMLElement {
  const context = selectedId ? findSelection(dashboard, selectedId) : undefined;

  return el('section', { class: 'panel detail-panel' }, [
    el('header', { class: 'panel-head' }, [
      el('h2', { class: 'panel-title' }, ['Detail']),
      el('span', { class: 'panel-sub muted' }, [
        context ? `${observationLabel(context.observation)} · ${stateLabel(context.state)}` : 'no selection'
      ])
    ]),
    body(dashboard, context)
  ]);
}

function body(dashboard: ControlPlaneDashboard, context: SelectionContext | undefined): HTMLElement {
  if (!context) {
    return el('div', { class: 'detail-empty' }, [
      el('p', { class: 'muted' }, [
        'Select a focus item, session, or workflow node to see read-only metadata.'
      ]),
      tabsHelp(dashboard.activityPanel.tabs)
    ]);
  }

  const meta = [
    metaRow('Workspace', context.workspace),
    metaRow('Model', context.model),
    metaRow('Role', context.role),
    metaRow('State', stateLabel(context.state)),
    metaRow('Progress', progressLabel(context.progress)),
    metaRow('Updated', context.updatedAt ? formatTimestamp(context.updatedAt) : undefined),
    metaRow('Observation', observationLabel(context.observation)),
    metaRow('Relationship', context.relationshipLabel)
  ].filter((row): row is HTMLElement => row !== null);

  return el('div', { class: 'detail-body' }, [
    el('div', { class: 'detail-head' }, [
      el('span', { class: `badge badge-${context.observation}` }, [observationLabel(context.observation)]),
      el('h3', { class: 'detail-title' }, [context.title]),
      context.summary
        ? el('p', { class: 'detail-summary' }, [context.summary])
        : el('p', { class: 'detail-summary muted' }, [
            'No summary provided. Read-only snapshot omits transcript and log bodies by default.'
          ])
    ]),
    meta.length > 0
      ? el('dl', { class: 'detail-meta' }, meta)
      : el('p', { class: 'muted small' }, ['No additional metadata available for this item.']),
    tabsHelp(dashboard.activityPanel.tabs)
  ]);
}

function tabsHelp(tabs: ActivityPanelTab[]): HTMLElement {
  return el('div', { class: 'detail-tabs' }, [
    el(
      'div',
      { class: 'detail-tab-strip', attrs: { role: 'tablist', 'aria-label': 'Read-only data sources' } },
      tabs.map((tab) =>
        el(
          'span',
          {
            class: classNames('detail-tab-chip', tab.available ? 'is-available' : 'is-disabled'),
            attrs: { role: 'tab', 'aria-disabled': tab.available ? 'false' : 'true' }
          },
          [
            el('span', { class: 'detail-tab-label' }, [tab.label]),
            el('span', { class: 'detail-tab-state' }, [tab.available ? 'available' : 'unavailable'])
          ]
        )
      )
    ),
    el(
      'ul',
      { class: 'detail-tab-detail' },
      tabs.map((tab) =>
        el(
          'li',
          { class: classNames('detail-tab-row', !tab.available && 'is-disabled') },
          [
            el('strong', undefined, [tab.label]),
            el('p', { class: 'muted' }, [tab.detail])
          ]
        )
      )
    )
  ]);
}

function metaRow(label: string, value: string | undefined): HTMLElement | null {
  if (!value) return null;
  return el('div', { class: 'detail-meta-row' }, [
    el('dt', undefined, [label]),
    el('dd', undefined, [value])
  ]);
}

function findSelection(dashboard: ControlPlaneDashboard, id: string): SelectionContext | undefined {
  const session = findSessionInGroups(dashboard, id);
  const treeNode = findInTree(dashboard.sessionTree.roots, id);
  const planItem = dashboard.implementationPlan.items.find((item) => item.id === id);
  const focusItem = dashboard.focusItems.find((item) => item.id === id);
  const diagnostic = dashboard.diagnostics.find((entry, index) => `diagnostic-${entry.code}` === id || `diagnostic-${entry.code}-${index}` === id);

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

  if (planItem) return planItemToContext(planItem);

  if (focusItem) {
    return {
      id: focusItem.id,
      title: focusItem.label,
      state: focusItem.state === 'workspace' || focusItem.state === 'diagnostic' ? 'unavailable' : focusItem.state,
      observation: focusItem.observation,
      summary: focusItem.detail
    };
  }

  if (diagnostic) {
    return {
      id,
      title: `Diagnostic: ${diagnostic.code}`,
      state: 'unavailable',
      observation: 'observed',
      summary: diagnostic.message,
      updatedAt: diagnostic.observedAt
    };
  }

  return undefined;
}

function planItemToContext(item: ImplementationPlanItem): SelectionContext {
  return {
    id: item.id,
    title: item.title,
    state: item.state,
    observation: item.observation,
    workspace: item.workspace,
    model: item.model,
    progress: item.progress,
    summary: item.detail
  };
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
