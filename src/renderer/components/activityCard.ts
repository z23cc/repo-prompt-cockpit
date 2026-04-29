import type { ControlPlaneDashboard } from '../../domain/dashboard.js';
import type { ObservationKind, SessionState } from '../../shared/types.js';
import { classNames, el } from './dom.js';
import { formatTimestamp, observationLabel, progressLabel, stateLabel } from './format.js';

export interface ActivityCardSelection {
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

export function activityCard(
  dashboard: ControlPlaneDashboard,
  selection: ActivityCardSelection | undefined
): HTMLElement {
  if (!selection) {
    return el('section', { class: 'card activity-card' }, [
      el('header', { class: 'card-head' }, [
        el('div', { class: 'card-head-title' }, ['Activity']),
        el('span', { class: 'card-head-sub muted' }, ['Select a session to view metadata'])
      ]),
      el('p', { class: 'muted' }, [
        'Pick a session from the workspace column to inspect read-only metadata. ',
        'No transcript or log content is loaded by default.'
      ])
    ]);
  }

  const verify = verifyTone(selection);
  const snapshotProgress = activitySnapshotProgressLabel(dashboard);

  return el('section', { class: 'card activity-card' }, [
    el('header', { class: 'card-head' }, [
      el('div', { class: 'card-head-title' }, [
        'Activity',
        el('span', { class: `badge badge-${selection.observation}` }, [observationLabel(selection.observation)])
      ]),
      el('span', { class: 'card-head-sub muted' }, [
        selection.updatedAt ? `Updated ${formatTimestamp(selection.updatedAt)}` : 'Update time unavailable'
      ])
    ]),
    el('div', { class: 'activity-card-body' }, [
      el(
        'div',
        {
          class: classNames('activity-verify', verify.tone === 'warning' && 'is-warning', verify.tone === 'error' && 'is-error')
        },
        [
          el('span', { class: 'activity-verify-icon', attrs: { 'aria-hidden': 'true' } }, [verify.icon]),
          el('div', { class: 'activity-verify-text' }, [
            el('strong', undefined, [verify.headline]),
            el('span', undefined, [verify.detail])
          ])
        ]
      ),
      el('p', { class: 'activity-summary' }, [
        selection.summary
          ?? 'No summary provided in the read-only snapshot. Provider metadata is shown below.'
      ]),
      el('dl', { class: 'activity-meta' }, [
        metaRow('Workspace', selection.workspace ?? '—'),
        metaRow('Model', selection.model ?? 'Model unavailable'),
        metaRow('Role', selection.role ?? '—'),
        metaRow('Progress', progressLabel(selection.progress) ?? '—'),
        metaRow('State', stateLabel(selection.state)),
        metaRow('Overall snapshot progress', snapshotProgress),
        metaRow('Relationship', selection.relationshipLabel ?? 'flat sessions (parent link unavailable)'),
        metaRow('Observation', observationLabel(selection.observation))
      ])
    ])
  ]);
}

function metaRow(label: string, value: string): HTMLElement {
  return el('div', { class: 'activity-meta-row' }, [
    el('dt', undefined, [label]),
    el('dd', undefined, [value])
  ]);
}

interface VerifyTone {
  tone: 'safe' | 'warning' | 'error';
  icon: string;
  headline: string;
  detail: string;
}

function verifyTone(selection: ActivityCardSelection): VerifyTone {
  switch (selection.state) {
    case 'completed':
      return {
        tone: 'safe',
        icon: '✓',
        headline: 'Session completed',
        detail: 'Provider reports this session as completed.'
      };
    case 'running':
      return {
        tone: 'safe',
        icon: '◐',
        headline: 'Verification: running',
        detail: 'Session is making progress; deterministic status only — no transcript shown.'
      };
    case 'waiting_for_input':
      return {
        tone: 'warning',
        icon: '!',
        headline: 'Awaiting human input',
        detail: 'Session is paused and needs operator attention.'
      };
    case 'blocked':
      return {
        tone: 'warning',
        icon: '⌃',
        headline: 'Session blocked',
        detail: 'Provider reports a blocking dependency or check.'
      };
    case 'failed':
      return {
        tone: 'error',
        icon: '×',
        headline: 'Session failed',
        detail: 'Provider reported a failed status. Inspect diagnostics for context.'
      };
    case 'idle':
      return {
        tone: 'safe',
        icon: '◌',
        headline: 'Session idle',
        detail: 'No activity reported in the most recent snapshot.'
      };
    case 'unavailable':
      return {
        tone: 'warning',
        icon: '?',
        headline: 'Session metadata unavailable',
        detail: 'Provider did not report state for this entry. Status is unknown.'
      };
    case 'unknown':
    default:
      return {
        tone: 'warning',
        icon: '?',
        headline: 'Session state unknown',
        detail: 'Provider did not report a deterministic state for this session.'
      };
  }
}

function activitySnapshotProgressLabel(dashboard: ControlPlaneDashboard): string {
  const counts = dashboard.statusCounts;
  const total =
    counts.running +
    counts.waiting +
    counts.blocked +
    counts.completed +
    counts.failed +
    counts.idle +
    counts.unknown;
  if (total === 0) return 'No sessions reported';
  return `${counts.completed}/${total} completed · ${counts.running} running · ${counts.waiting} waiting`;
}
