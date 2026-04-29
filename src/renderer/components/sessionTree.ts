import type { SessionTreeNodeView, SessionTreeView } from '../../domain/dashboard.js';
import { classNames, el } from './dom.js';
import { metaLine, observationLabel, stateLabel } from './format.js';

export interface SessionTreeHandlers {
  onSelect(id: string): void;
}

export function sessionTree(
  tree: SessionTreeView,
  selectedId: string | undefined,
  handlers: SessionTreeHandlers
): HTMLElement {
  const total = countNodes(tree.roots);
  const body = total === 0
    ? el('p', { class: 'muted panel-empty' }, [
        'No session rows available from the read-only snapshot.'
      ])
    : el('ul', { class: 'session-tree' }, tree.roots.map((node) => renderNode(node, selectedId, handlers, 0)));

  return el('section', { class: 'panel session-tree-panel', attrs: { id: 'sessions' } }, [
    el('header', { class: 'panel-head' }, [
      el('h2', { class: 'panel-title' }, ['Session & workflow tree']),
      el('span', { class: `panel-sub badge badge-tree-${tree.mode}` }, [tree.modeLabel])
    ]),
    body
  ]);
}

function renderNode(
  node: SessionTreeNodeView,
  selectedId: string | undefined,
  handlers: SessionTreeHandlers,
  depth: number
): HTMLLIElement {
  const isSelected = node.id === selectedId;
  const meta = metaLine([stateLabel(node.state), node.model, node.role]);

  const head = el(
    'div',
    {
      class: classNames(
        'session-tree-row',
        `depth-${Math.min(depth, 3)}`,
        isSelected && 'is-selected'
      ),
      attrs: { tabindex: '0', role: 'button' }
    },
    [
      el('span', { class: `badge badge-${node.observation}` }, [observationLabel(node.observation)]),
      el('span', { class: 'session-tree-title' }, [node.title]),
      meta ? el('span', { class: 'session-tree-meta muted' }, [meta]) : null,
      el('span', { class: `pill pill-relationship pill-${node.relationship}` }, [node.relationshipLabel])
    ]
  );

  head.addEventListener('click', () => handlers.onSelect(node.id));
  head.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlers.onSelect(node.id);
    }
  });

  const li = el('li', { class: 'session-tree-node' }, [
    head,
    node.children.length > 0
      ? el(
          'ul',
          { class: 'session-tree-children' },
          node.children.map((child) => renderNode(child, selectedId, handlers, depth + 1))
        )
      : null
  ]);

  return li;
}

function countNodes(roots: SessionTreeNodeView[]): number {
  let total = 0;
  const walk = (node: SessionTreeNodeView): void => {
    total += 1;
    for (const child of node.children) walk(child);
  };
  for (const root of roots) walk(root);
  return total;
}
