import type {
  ControlPlaneDashboard,
  ImplementationPlanItem,
  SessionTreeNodeView,
  SessionTreeView,
  StatusCounts,
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
    relatedSection(dashboard.implementationPlan.items, options.selectedId, handlers)
  ]);
}

/* ── Files in context ───────────────────────────────────────────── */

function filesSection(workspaces: WorkspaceView[]): HTMLElement {
  const body =
    workspaces.length === 0
      ? el('p', { class: 'rail-empty' }, ['No workspace metadata in this snapshot.'])
      : el(
          'div',
          { class: 'rail-list' },
          workspaces.map((workspace) =>
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
            ])
          )
        );

  return el('section', { class: 'rail-section' }, [
    el('div', { class: 'rail-section-head' }, [
      el('span', { class: 'rail-section-title' }, ['Files in context']),
      el('span', { class: 'rail-section-sub' }, [pluralize(workspaces.length, 'workspace')])
    ]),
    body
  ]);
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

/* ── Workflow progress ──────────────────────────────────────────── */

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
      el('span', { class: 'rail-section-title' }, ['Workflow progress'])
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
