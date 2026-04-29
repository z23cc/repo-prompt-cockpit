import type { ControlPlaneDashboard } from '../../domain/dashboard.js';
import type { WorkflowTabKey } from './workflowToolbar.js';
import { workflowTabsFromActivityTabs } from './workflowToolbar.js';
import { el } from './dom.js';

export interface WorkflowDetailsPanelOptions {
  dashboard: ControlPlaneDashboard;
  activeTab: WorkflowTabKey;
  selectedTitle?: string;
  selectedWorkspace?: string;
}

export function workflowDetailsPanel(options: WorkflowDetailsPanelOptions): HTMLElement {
  const tab = options.activeTab;

  if (tab === 'plan' || tab === 'activity') {
    return planPreviewShell(options);
  }

  const directTab = options.dashboard.activityPanel.tabs.find((entry) => entry.key === tab);
  const tabs = workflowTabsFromActivityTabs(options.dashboard.activityPanel.tabs);
  const descriptor = tabs.find((entry) => entry.key === tab) ?? directTab;
  const detail = descriptor?.detail ?? 'No data available for this view in the read-only provider snapshot.';

  return el('section', { class: 'workflow-detail-panel', attrs: { 'aria-label': `${descriptor?.label ?? tab} panel` } }, [
    el('header', { class: 'workflow-detail-head' }, [
      el('div', { class: 'workflow-detail-title' }, [`${descriptor?.label ?? titleCase(tab)} · unavailable`]),
      el('div', { class: 'workflow-detail-state' }, [
        el('span', { class: 'badge badge-unavailable' }, ['unavailable'])
      ])
    ]),
    el('div', { class: 'workflow-detail-empty' }, [detail])
  ]);
}

function planPreviewShell(options: WorkflowDetailsPanelOptions): HTMLElement {
  const counts = options.dashboard.statusCounts;
  const total =
    counts.running +
    counts.waiting +
    counts.blocked +
    counts.completed +
    counts.failed +
    counts.idle +
    counts.unknown;

  const rows: Array<{ label: string; value: string; tone?: string }> = [
    { label: 'Sessions', value: String(counts.sessions) },
    { label: 'Running', value: String(counts.running), tone: 'tone-running' },
    { label: 'Waiting', value: String(counts.waiting), tone: 'tone-waiting' },
    { label: 'Blocked', value: String(counts.blocked), tone: 'tone-blocked' },
    { label: 'Completed', value: String(counts.completed), tone: 'tone-completed' },
    { label: 'Failed', value: String(counts.failed), tone: 'tone-failed' },
    { label: 'Idle', value: String(counts.idle), tone: 'tone-idle' },
    { label: 'Unknown', value: String(counts.unknown), tone: 'tone-unknown' }
  ];

  return el('section', { class: 'preview-panel', attrs: { 'aria-label': 'Status preview' } }, [
    el('header', { class: 'preview-head' }, [
      el('div', { class: 'preview-head-title' }, [
        el('span', undefined, ['Status preview']),
        el('span', { class: 'badge badge-unavailable', title: 'Provider reports deterministic snapshot status only.' }, [
          'snapshot only'
        ])
      ]),
      el('div', { class: 'preview-head-meta' }, [
        options.selectedWorkspace ?? options.dashboard.providerLabel,
        ' · ',
        `total ${total}`
      ])
    ]),
    el('div', { class: 'preview-meta-line' }, [
      options.selectedTitle
        ? `Selected session: ${options.selectedTitle}`
        : 'No session selected — counts reflect the full snapshot.'
    ]),
    el(
      'dl',
      { class: 'preview-grid', attrs: { 'aria-label': 'Snapshot counts' } },
      rows.flatMap((row) => [
        el('dt', undefined, [row.label]),
        el('dd', { class: row.tone ?? '' }, [row.value])
      ])
    ),
    el('p', { class: 'preview-note muted small' }, [
      'Deterministic preview. This view shows provider-reported session counts only.'
    ])
  ]);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
