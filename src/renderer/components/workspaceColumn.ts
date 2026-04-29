import type { ImplementationPlanItem } from '../../domain/dashboard.js';
import type { SessionState } from '../../shared/types.js';
import { classNames, el } from './dom.js';
import { stateLabel } from './format.js';

export type WorkspaceFilter = 'all' | 'running' | 'waiting' | 'blocked';

export interface WorkspaceColumnHandlers {
  onSelect(id: string): void;
  onFilter(filter: WorkspaceFilter): void;
}

export interface WorkspaceColumnOptions {
  items: ImplementationPlanItem[];
  selectedId?: string;
  filter: WorkspaceFilter;
  generatedAt: string;
}

const FILTERS: ReadonlyArray<{ id: WorkspaceFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'blocked', label: 'Blocked' }
];

const FILTER_STATE_MAP: Record<Exclude<WorkspaceFilter, 'all'>, SessionState> = {
  running: 'running',
  waiting: 'waiting_for_input',
  blocked: 'blocked'
};

const MAX_VISIBLE_SESSION_CARDS = 10;

export function workspaceColumn(
  options: WorkspaceColumnOptions,
  handlers: WorkspaceColumnHandlers
): HTMLElement {
  const realSessions = options.items.filter((item) => item.kind === 'session');
  const placeholders = options.items.filter((item) => item.kind === 'placeholder');
  const counts = filterCounts(options.items);
  const filtered = filterItems(options.items, options.filter);
  const visibleItems = filtered.slice(0, MAX_VISIBLE_SESSION_CARDS);
  const hiddenCount = Math.max(0, filtered.length - visibleItems.length);
  const now = parseTimestamp(options.generatedAt);

  const head = el('header', { class: 'workspace-column-head' }, [
    el('div', { class: 'workspace-column-title' }, [
      el('h2', undefined, ['Workspaces']),
      el('span', { class: 'panel-sub' }, [sessionCountLabel(realSessions.length, visibleItems.length, filtered.length)])
    ]),
    el(
      'div',
      { class: 'tab-strip', attrs: { role: 'tablist', 'aria-label': 'Filter sessions by state' } },
      FILTERS.map((tab) => filterTab(tab.id, tab.label, counts[tab.id], options.filter, handlers))
    )
  ]);

  const body =
    filtered.length === 0
      ? el('p', { class: 'workspace-column-empty' }, [
          realSessions.length === 0
            ? placeholders[0]?.detail ?? 'No sessions in the current snapshot.'
            : `No sessions match the “${labelOf(options.filter)}” filter.`
        ])
      : el(
          'div',
          { class: 'workspace-column-list', attrs: { role: 'list' } },
          [
            ...visibleItems.map((item) => sessionCard(item, options.selectedId, now, handlers)),
            hiddenCount > 0
              ? el('p', { class: 'workspace-column-more muted small' }, [
                  `Showing ${visibleItems.length} of ${filtered.length} sessions in this view.`
                ])
              : null
          ]
        );

  return el('section', { class: 'workspace-column', attrs: { id: 'workspaces', 'aria-label': 'Workspaces and sessions' } }, [
    head,
    body
  ]);
}

function sessionCountLabel(totalCount: number, visibleCount: number, filteredCount: number): string {
  if (totalCount === 0) return 'session state unavailable';
  if (filteredCount > visibleCount) return `${totalCount} sessions · showing ${visibleCount}`;
  return totalCount === 1 ? '1 session' : `${totalCount} sessions`;
}

function filterTab(
  id: WorkspaceFilter,
  label: string,
  count: number,
  active: WorkspaceFilter,
  handlers: WorkspaceColumnHandlers
): HTMLButtonElement {
  const node = el(
    'button',
    {
      class: classNames('tab-chip', id === active && 'is-active'),
      attrs: { role: 'tab', type: 'button', 'aria-selected': id === active ? 'true' : 'false' }
    },
    [label, el('span', { class: 'tab-chip-count' }, [String(count)])]
  );
  node.addEventListener('click', () => handlers.onFilter(id));
  return node;
}

function sessionCard(
  item: ImplementationPlanItem,
  selectedId: string | undefined,
  now: number | undefined,
  handlers: WorkspaceColumnHandlers
): HTMLElement {
  const isSelected = item.id === selectedId;
  const workspace = workspaceLabel(item);
  const age = ageLabel(item.updatedAt, now);
  const progress = clampProgress(item.progress);
  const stateClass = `pill-${item.state}`;

  const card = el(
    'article',
    {
      class: classNames('session-card', isSelected && 'is-selected'),
      attrs: { tabindex: '0', role: 'listitem' }
    },
    [
      el('div', { class: 'session-card-head' }, [
        el('span', { class: 'session-card-title', title: item.title }, [item.title]),
        age ? el('span', { class: 'session-card-age' }, [age]) : null
      ]),
      el('div', { class: 'session-card-meta' }, [
        el('span', { class: `pill pill-state ${stateClass}` }, [
          el('span', { class: 'pill-state-dot', attrs: { 'aria-hidden': 'true' } }, []),
          stateLabel(item.state)
        ]),
        workspace ? el('span', { class: 'pill pill-workspace' }, [workspace]) : null
      ]),
      el('p', { class: 'session-card-summary' }, [item.detail]),
      el('div', { class: 'session-card-foot' }, [agentBlock(item), progressBlock(progress)]),
      el(
        'div',
        {
          class: classNames('session-card-progress', progress === undefined && 'is-indeterminate'),
          attrs: { 'aria-hidden': 'true' }
        },
        [
          el('div', {
            class: 'session-card-progress-bar',
            attrs: { style: `width: ${progress === undefined ? 100 : Math.round(progress * 100)}%` }
          }, [])
        ]
      )
    ]
  );

  card.addEventListener('click', () => handlers.onSelect(item.id));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlers.onSelect(item.id);
    }
  });
  return card;
}

function agentBlock(item: ImplementationPlanItem): HTMLElement {
  const initials = item.model ? avatarInitials(item.model) : '·';
  return el('div', { class: 'session-card-agent' }, [
    el('span', { class: 'session-card-avatar', attrs: { 'aria-hidden': 'true' } }, [initials]),
    el('span', { class: 'session-card-agent-name' }, [item.model ?? 'Agent unavailable']),
    item.workspace ? el('span', { class: 'session-card-agent-model' }, [`· ${item.workspace}`]) : null
  ]);
}

function progressBlock(progress: number | undefined): HTMLElement {
  return el('div', { class: 'session-card-metrics', attrs: { 'aria-label': 'Reported progress' } }, [
    el('span', { class: 'session-card-metric', title: 'Progress reported by provider' }, [
      el('span', { attrs: { 'aria-hidden': 'true' } }, ['◷']),
      el('span', undefined, [progress === undefined ? 'progress unavailable' : `${Math.round(progress * 100)}%`])
    ])
  ]);
}

function avatarInitials(model: string): string {
  const cleaned = model.replace(/[^A-Za-z0-9 ]+/g, ' ').trim();
  if (!cleaned) return '·';
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  // Prefer letter-led tokens so model identifiers like "GPT-5.5" yield "GP", not "G5".
  const letterTokens = tokens.filter((token) => /^[A-Za-z]/.test(token));
  if (letterTokens.length >= 2) {
    return (letterTokens[0]![0]! + letterTokens[1]![0]!).toUpperCase();
  }
  if (letterTokens.length === 1) return letterTokens[0]!.slice(0, 2).toUpperCase();
  if (tokens.length === 0) return '·';
  if (tokens.length === 1) return tokens[0]!.slice(0, 2).toUpperCase();
  return (tokens[0]![0]! + tokens[1]![0]!).toUpperCase();
}

function workspaceLabel(item: ImplementationPlanItem): string | undefined {
  if (item.workspace) return item.workspace;
  return undefined;
}

function clampProgress(progress: number | undefined): number | undefined {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return undefined;
  return Math.max(0, Math.min(1, progress));
}

function ageLabel(updatedAt: string | undefined, now: number | undefined): string | undefined {
  if (!updatedAt || now === undefined) return undefined;
  const ts = parseTimestamp(updatedAt);
  if (ts === undefined) return undefined;
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 60) return `${diff}s`;
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function parseTimestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

export function filterCounts(items: ImplementationPlanItem[]): Record<WorkspaceFilter, number> {
  const sessions = items.filter((item) => item.kind === 'session');
  const counts: Record<WorkspaceFilter, number> = {
    all: sessions.length,
    running: 0,
    waiting: 0,
    blocked: 0
  };
  for (const item of sessions) {
    if (item.state === 'running') counts.running += 1;
    else if (item.state === 'waiting_for_input') counts.waiting += 1;
    else if (item.state === 'blocked') counts.blocked += 1;
  }
  return counts;
}

export function filterItems(items: ImplementationPlanItem[], filter: WorkspaceFilter): ImplementationPlanItem[] {
  const sessions = items.filter((item) => item.kind === 'session');
  if (filter === 'all') return sessions;
  const target = FILTER_STATE_MAP[filter];
  return sessions.filter((item) => item.state === target);
}

export function ageLabelForTesting(updatedAt: string | undefined, now: number | undefined): string | undefined {
  return ageLabel(updatedAt, now);
}

export function avatarInitialsForTesting(model: string): string {
  return avatarInitials(model);
}

function labelOf(filter: WorkspaceFilter): string {
  return FILTERS.find((entry) => entry.id === filter)?.label ?? 'All';
}
