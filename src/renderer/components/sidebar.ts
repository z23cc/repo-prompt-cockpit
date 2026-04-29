import type { StatusCounts } from '../../domain/dashboard.js';
import { classNames, el } from './dom.js';

export interface SidebarSection {
  id: string;
  label: string;
  icon: string;
  available: boolean;
  tag?: string;
}

const NAV_SECTIONS: SidebarSection[] = [
  { id: 'cockpit', label: 'Cockpit', icon: '◐', available: true },
  { id: 'workspaces', label: 'Workspaces', icon: '▤', available: true },
  { id: 'worktrees', label: 'Worktrees', icon: '⌥', available: false, tag: 'soon' },
  { id: 'agents', label: 'Agents', icon: '◇', available: false, tag: 'soon' },
  { id: 'mcp', label: 'MCP Servers', icon: '⌘', available: false, tag: 'soon' },
  { id: 'workflows', label: 'Workflows', icon: '⌗', available: false, tag: 'soon' },
  { id: 'templates', label: 'Templates', icon: '◫', available: false, tag: 'soon' },
  { id: 'integrations', label: 'Integrations', icon: '◈', available: false, tag: 'soon' },
  { id: 'settings', label: 'Settings', icon: '⚙', available: false, tag: 'soon' }
];

export interface SidebarOptions {
  activeId?: string;
  counts?: StatusCounts;
}

export function sidebar(options: SidebarOptions = {}): HTMLElement {
  const activeId = options.activeId ?? 'cockpit';
  return el('aside', { class: 'cockpit-sidebar', attrs: { 'aria-label': 'Primary' } }, [
    el('div', { class: 'brand' }, [
      el('span', { class: 'brand-mark', attrs: { 'aria-hidden': 'true' } }, ['RP']),
      el('div', { class: 'brand-text' }, [
        el('strong', undefined, ['Repo Prompt']),
        el('span', { class: 'brand-sub' }, ['Cockpit · read-only'])
      ])
    ]),
    el('div', { class: 'sidebar-section-label' }, ['Workspace']),
    el(
      'nav',
      { class: 'sidebar-nav', attrs: { 'aria-label': 'Workspace navigation' } },
      NAV_SECTIONS.map((section) => navItem(section, activeId))
    ),
    options.counts ? statusBlock(options.counts) : null,
    el('div', { class: 'sidebar-foot' }, [
      'No transcript or log bodies are fetched.'
    ])
  ]);
}

function navItem(section: SidebarSection, activeId: string): HTMLElement {
  const tag = section.available ? 'a' : 'span';
  return el(
    tag,
    {
      class: classNames(
        'sidebar-nav-item',
        section.id === activeId && 'is-active',
        !section.available && 'is-disabled'
      ),
      attrs: section.available
        ? { href: `#${section.id}`, role: 'link' }
        : { 'aria-disabled': 'true', role: 'presentation', title: 'Preview — not yet wired to a provider' }
    },
    [
      el('span', { class: 'sidebar-nav-icon', attrs: { 'aria-hidden': 'true' } }, [section.icon]),
      el('span', { class: 'sidebar-nav-label' }, [section.label]),
      section.tag ? el('span', { class: 'sidebar-nav-tag' }, [section.tag]) : null
    ]
  );
}

interface StatusRow {
  id: 'running' | 'waiting' | 'blocked' | 'completed' | 'idle';
  label: string;
  value: number;
  color: string;
}

function statusBlock(counts: StatusCounts): HTMLElement {
  const rows: StatusRow[] = [
    { id: 'running', label: 'Running', value: counts.running, color: 'var(--running)' },
    { id: 'waiting', label: 'Waiting', value: counts.waiting, color: 'var(--waiting)' },
    { id: 'blocked', label: 'Blocked', value: counts.blocked, color: 'var(--blocked)' },
    { id: 'completed', label: 'Completed', value: counts.completed, color: 'var(--completed)' },
    { id: 'idle', label: 'Idle', value: counts.idle, color: 'var(--idle)' }
  ];

  return el('div', { class: 'sidebar-status', attrs: { 'aria-label': 'Session status counts' } }, [
    el('div', { class: 'sidebar-section-label', attrs: { style: 'padding: 0.1rem 0.2rem 0.25rem' } }, [
      'Status'
    ]),
    ...rows.map((row) =>
      el('div', { class: `sidebar-status-row sidebar-status-${row.id}` }, [
        el('span', { class: 'dot', attrs: { style: `background: ${row.color}` } }, []),
        el('span', { class: 'label' }, [row.label]),
        el('span', { class: 'count' }, [String(row.value)])
      ])
    )
  ]);
}
