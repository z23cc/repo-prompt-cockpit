import type {
  ControlPlaneDashboard,
  ImplementationPlanItem,
  SessionTreeNodeView,
  SessionTreeView,
  StatusCounts,
  WorkspaceContextTabView,
  WorkspaceView
} from '../../domain/dashboard.js';
import type { AttentionItem } from '../../shared/types.js';
import { classNames, el } from './dom.js';
import { observationLabel, pluralize, stateLabel } from './format.js';

export interface ContextRailHandlers {
  onSelect(id: string): void;
}

export interface ContextRailOptions {
  dashboard: ControlPlaneDashboard;
  selectedId?: string;
}

export function contextRail(
  options: ContextRailOptions,
  handlers: ContextRailHandlers
): HTMLElement {
  const dashboard = options.dashboard;
  return el('aside', { class: 'context-rail', attrs: { 'aria-label': 'Workflow context' } }, [
    filesSection(dashboard.workspaces),
    promptsSection(dashboard.focusItems, options.selectedId, handlers),
    progressSection(dashboard.statusCounts),
    agentsSection(dashboard.sessionTree, options.selectedId, handlers),
    bodyAccessSection(),
    relatedSection(dashboard.implementationPlan.items, options.selectedId, handlers)
  ]);
}

/* ── Workspace/context metadata ─────────────────────────────────── */

const MAX_VISIBLE_WORKSPACE_GROUPS = 4;
const MAX_VISIBLE_CONTEXT_TABS_PER_WORKSPACE = 3;

function filesSection(workspaces: WorkspaceView[]): HTMLElement {
  const visibleWorkspaces = workspaces.slice(0, MAX_VISIBLE_WORKSPACE_GROUPS);
  const hiddenWorkspaceCount = Math.max(0, workspaces.length - visibleWorkspaces.length);
  const visibleContextCount = visibleWorkspaces.reduce(
    (count, workspace) => count + Math.min(workspace.contextTabs.length, MAX_VISIBLE_CONTEXT_TABS_PER_WORKSPACE),
    0
  );
  const hiddenContextCount = visibleWorkspaces.reduce(
    (count, workspace) => count + Math.max(0, workspace.contextTabs.length - MAX_VISIBLE_CONTEXT_TABS_PER_WORKSPACE),
    0
  );
  const body =
    workspaces.length === 0
      ? el('p', { class: 'rail-empty' }, ['No workspace or tab/context metadata in this snapshot.'])
      : el(
          'div',
          { class: 'rail-list' },
          [
            ...visibleWorkspaces.map((workspace) => workspaceContextGroup(workspace)),
            hiddenWorkspaceCount > 0 || hiddenContextCount > 0
              ? el('p', { class: 'rail-empty rail-more-note' }, [
                  `${hiddenWorkspaceCount > 0 ? `${hiddenWorkspaceCount} more workspaces` : ''}${hiddenWorkspaceCount > 0 && hiddenContextCount > 0 ? ' · ' : ''}${hiddenContextCount > 0 ? `${hiddenContextCount} more context tabs` : ''} hidden for readability.`
                ])
              : null
          ]
        );

  return el('section', { class: 'rail-section' }, [
    el('div', { class: 'rail-section-head' }, [
      el('span', { class: 'rail-section-title' }, ['Repo Prompt tabs and contexts']),
      el('span', { class: 'rail-section-sub' }, [
        `${visibleWorkspaces.length} shown · ${visibleContextCount} context tabs`
      ])
    ]),
    body
  ]);
}

function workspaceContextGroup(workspace: WorkspaceView): HTMLElement {
  const visibleTabs = workspace.contextTabs.slice(0, MAX_VISIBLE_CONTEXT_TABS_PER_WORKSPACE);
  const hiddenTabs = Math.max(0, workspace.contextTabs.length - visibleTabs.length);
  return el('div', { class: 'rail-context-group' }, [
    el('div', { class: 'rail-row is-static' }, [
      el('div', { class: 'rail-row-title' }, [
        el('span', { class: 'rail-row-icon', attrs: { 'aria-hidden': 'true' } }, ['▤']),
        el('span', { class: 'rail-row-title-text', title: workspace.workspace }, [workspace.workspace]),
        el('span', { class: `badge badge-${workspace.observation}` }, [
          observationLabel(workspace.observation)
        ])
      ]),
      el('p', { class: 'rail-row-meta' }, [
        workspace.repoPath ?? `${pluralize(workspace.windowIds.length, 'window')} · ${pluralize(workspace.tabCount, 'tab')}`
      ])
    ]),
    ...visibleTabs.map((tab) => contextTabRow(tab)),
    hiddenTabs > 0 ? el('p', { class: 'rail-empty rail-more-note' }, [`${hiddenTabs} more context tabs hidden.`]) : null
  ]);
}

function contextTabRow(tab: WorkspaceContextTabView): HTMLElement {
  const contextLabel = tab.contextId ? `context ${shortContextId(tab.contextId)}` : 'context id unavailable';
  return el('div', { class: 'rail-row rail-context-tab is-static' }, [
    el('div', { class: 'rail-row-title' }, [
      el('span', { class: 'rail-row-icon', attrs: { 'aria-hidden': 'true' } }, [tab.active ? '●' : '○']),
      el('span', { class: 'rail-row-title-text', title: tab.tabName }, [tab.tabName]),
      tab.active ? el('span', { class: 'badge badge-observed' }, ['active']) : null
    ]),
    el('p', { class: 'rail-row-meta', title: tab.contextId ?? undefined }, [
      `window ${tab.windowId} · ${contextLabel} · ${observationLabel(tab.observation)}`
    ])
  ]);
}

function shortContextId(contextId: string): string {
  return contextId.length <= 8 ? contextId : contextId.slice(0, 8);
}

/* ── Prompts (focus next) ───────────────────────────────────────── */

function promptsSection(
  items: AttentionItem[],
  selectedId: string | undefined,
  handlers: ContextRailHandlers
): HTMLElement {
  const visible = items.slice(0, 5);
  const body =
    visible.length === 0
      ? el('p', { class: 'rail-empty' }, ['No actionable focus items in this snapshot.'])
      : el(
          'div',
          { class: 'rail-list' },
          visible.map((item) => focusRow(item, selectedId, handlers))
        );

  return el('section', { class: 'rail-section' }, [
    el('div', { class: 'rail-section-head' }, [
      el('span', { class: 'rail-section-title' }, ['Prompts · focus']),
      el('span', { class: 'rail-section-sub' }, [
        items.length === 0 ? 'no actionable items' : `${visible.length} of ${items.length}`
      ])
    ]),
    body
  ]);
}

function focusRow(
  item: AttentionItem,
  selectedId: string | undefined,
  handlers: ContextRailHandlers
): HTMLElement {
  const node = el(
    'button',
    {
      class: classNames('rail-row', item.id === selectedId && 'is-selected'),
      attrs: { type: 'button' }
    },
    [
      el('div', { class: 'rail-row-title' }, [
        el('span', { class: 'rail-row-icon', attrs: { 'aria-hidden': 'true' } }, ['◆']),
        el('span', { class: 'rail-row-title-text', title: item.label }, [item.label])
      ]),
      el('p', { class: 'rail-row-meta' }, [item.detail])
    ]
  );
  node.addEventListener('click', () => handlers.onSelect(item.id));
  return node;
}

/* ── Overall snapshot progress ──────────────────────────────────── */

function progressSection(counts: StatusCounts): HTMLElement {
  const total =
    counts.running +
    counts.waiting +
    counts.blocked +
    counts.completed +
    counts.failed +
    counts.idle +
    counts.unknown;
  const completion = total === 0 ? 0 : Math.round((counts.completed / total) * 100);

  return el('section', { class: 'rail-section' }, [
    el('div', { class: 'rail-section-head' }, [
      el('span', { class: 'rail-section-title' }, ['Overall snapshot progress'])
    ]),
    el('div', { class: 'rail-progress-card' }, [
      el('div', { class: 'rail-progress-row' }, [
        el('span', { class: 'label' }, ['Completion']),
        el('span', { class: 'value' }, [`${completion}%`])
      ]),
      el('div', { class: 'rail-progress-bar', attrs: { 'aria-hidden': 'true' } }, [
        el('div', {
          class: 'rail-progress-bar-fill',
          attrs: { style: `width: ${completion}%` }
        }, [])
      ]),
      el('div', { class: 'rail-progress-row' }, [
        el('span', { class: 'label' }, ['Sessions']),
        el('span', { class: 'value' }, [String(total)])
      ]),
      el('div', { class: 'rail-progress-row' }, [
        el('span', { class: 'label' }, ['Active']),
        el('span', { class: 'value' }, [String(counts.running + counts.waiting + counts.blocked)])
      ])
    ])
  ]);
}

/* ── How to inspect body content ───────────────────────────────── */

function bodyAccessSection(): HTMLElement {
  return el('section', { class: 'rail-section' }, [
    el('div', { class: 'rail-section-head' }, [
      el('span', { class: 'rail-section-title' }, ['Where to inspect bodies']),
      el('span', { class: 'rail-section-sub' }, ['Repo Prompt is the source of truth'])
    ]),
    el('div', { class: 'rail-progress-card rail-help-card' }, [
      el('p', { class: 'rail-help-copy' }, [
        'This cockpit intentionally keeps transcript, log, artifact, and result bodies out of the desktop UI by default.'
      ]),
      el('ol', { class: 'rail-help-steps' }, [
        el('li', undefined, ['Use “Repo Prompt tabs and contexts” above to identify the matching workspace, tab, and context.']),
        el('li', undefined, ['Switch to that session inside Repo Prompt itself.']),
        el('li', undefined, ['Inspect Logs / Results / Artifacts there when you need body-level detail.'])
      ])
    ])
  ]);
}

/* ── Agents involved (visible session tree) ────────────────────── */

function agentsSection(
  tree: SessionTreeView,
  selectedId: string | undefined,
  handlers: ContextRailHandlers
): HTMLElement {
  const totalNodes = countTree(tree.roots);
  const body =
    totalNodes === 0
      ? el('p', { class: 'rail-empty' }, ['No agents reported by the provider.'])
      : el(
          'div',
          { class: 'rail-list rail-tree' },
          tree.roots.map((node) => agentTreeRow(node, selectedId, handlers, 0))
        );

  return el('section', { class: 'rail-section' }, [
    el('div', { class: 'rail-section-head' }, [
      el('span', { class: 'rail-section-title' }, ['Agents involved']),
      el('span', { class: `badge badge-tree-${tree.mode}`, title: tree.modeLabel }, [tree.modeLabel])
    ]),
    body
  ]);
}

function agentTreeRow(
  node: SessionTreeNodeView,
  selectedId: string | undefined,
  handlers: ContextRailHandlers,
  depth: number
): HTMLElement {
  const button = el(
    'button',
    {
      class: classNames(
        'rail-row',
        'rail-tree-row',
        `rail-tree-depth-${Math.min(depth, 3)}`,
        node.id === selectedId && 'is-selected'
      ),
      attrs: { type: 'button' }
    },
    [
      el('div', { class: 'rail-row-title' }, [
        el('span', { class: 'rail-row-icon rail-tree-icon', attrs: { 'aria-hidden': 'true' } }, [
          depth === 0 ? '◇' : '↳'
        ]),
        el('span', { class: 'rail-row-title-text', title: node.title }, [node.title]),
        el('span', { class: `pill pill-state pill-${node.state}` }, [stateLabel(node.state)])
      ]),
      el('p', { class: 'rail-row-meta' }, [
        [node.model, node.role, node.relationshipLabel].filter(Boolean).join(' · ')
      ])
    ]
  );
  button.addEventListener('click', () => handlers.onSelect(node.id));

  if (node.children.length === 0) return button;

  return el('div', { class: 'rail-tree-group' }, [
    button,
    el(
      'div',
      { class: 'rail-tree-children' },
      node.children.map((child) => agentTreeRow(child, selectedId, handlers, depth + 1))
    )
  ]);
}

function countTree(roots: SessionTreeNodeView[]): number {
  let n = 0;
  const walk = (node: SessionTreeNodeView): void => {
    n += 1;
    for (const child of node.children) walk(child);
  };
  for (const root of roots) walk(root);
  return n;
}

/* ── Related workflows ──────────────────────────────────────────── */

function relatedSection(
  items: ImplementationPlanItem[],
  selectedId: string | undefined,
  handlers: ContextRailHandlers
): HTMLElement {
  const others = items
    .filter((item) => item.kind === 'session' && item.id !== selectedId)
    .slice(0, 5);
  const body =
    others.length === 0
      ? el('p', { class: 'rail-empty' }, ['No related workflows in this snapshot.'])
      : el(
          'div',
          { class: 'rail-list' },
          others.map((item) => relatedRow(item, handlers))
        );

  return el('section', { class: 'rail-section' }, [
    el('div', { class: 'rail-section-head' }, [
      el('span', { class: 'rail-section-title' }, ['Related workflows']),
      el('span', { class: 'rail-section-sub' }, [pluralize(others.length, 'workflow')])
    ]),
    body
  ]);
}

function relatedRow(item: ImplementationPlanItem, handlers: ContextRailHandlers): HTMLElement {
  const button = el(
    'button',
    { class: 'rail-row', attrs: { type: 'button' } },
    [
      el('div', { class: 'rail-row-title' }, [
        el('span', { class: 'rail-row-icon', attrs: { 'aria-hidden': 'true' } }, ['⌗']),
        el('span', { class: 'rail-row-title-text', title: item.title }, [item.title]),
        el('span', { class: `pill pill-state pill-${item.state}` }, [stateLabel(item.state)])
      ]),
      el('p', { class: 'rail-row-meta' }, [item.workspace ?? item.detail])
    ]
  );
  button.addEventListener('click', () => handlers.onSelect(item.id));
  return button;
}
