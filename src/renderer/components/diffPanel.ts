import type { ControlPlaneDashboard } from '../../domain/dashboard.js';
import type { WorkflowTabKey } from './workflowToolbar.js';
import { workflowTabsFromActivityTabs } from './workflowToolbar.js';
import { el } from './dom.js';

export interface DiffPanelOptions {
  dashboard: ControlPlaneDashboard;
  activeTab: WorkflowTabKey;
  selectedTitle?: string;
  selectedWorkspace?: string;
}

export function diffPanel(options: DiffPanelOptions): HTMLElement {
  const tab = options.activeTab;

  if (tab === 'plan' || tab === 'activity') {
    return planPreviewShell(options);
  }

  const tabs = workflowTabsFromActivityTabs(options.dashboard.activityPanel.tabs);
  const descriptor = tabs.find((entry) => entry.key === tab);
  const detail =
    descriptor?.detail ?? 'No data available for this tab in the read-only provider snapshot.';

  return el('section', { class: 'diff-panel', attrs: { 'aria-label': `${descriptor?.label ?? tab} panel` } }, [
    el('header', { class: 'diff-head' }, [
      el('div', { class: 'diff-head-path' }, [`${descriptor?.label ?? tab.toUpperCase()} · unavailable`]),
      el('div', { class: 'diff-head-stats' }, [
        el('span', { class: 'badge badge-unavailable' }, ['unavailable'])
      ])
    ]),
    el('div', { class: 'diff-empty' }, [detail])
  ]);
}

function planPreviewShell(options: DiffPanelOptions): HTMLElement {
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
        el('span', { class: 'badge badge-unavailable', title: 'Provider does not report file diffs in read-only snapshots.' }, [
          'not a diff'
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
        ? `Selected workflow: ${options.selectedTitle}`
        : 'No workflow selected — counts reflect the full snapshot.'
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
      'Deterministic preview. The provider does not report file-level diffs; this view shows snapshot counts only.'
    ])
  ]);
}
