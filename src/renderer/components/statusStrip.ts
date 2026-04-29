import type { StatusCounts } from '../../domain/dashboard.js';
import { el } from './dom.js';

interface StatusCard {
  label: string;
  value: number;
  tone: string;
}

export function statusStrip(counts: StatusCounts): HTMLElement {
  const cards: StatusCard[] = [
    { label: 'Workspaces', value: counts.workspaces, tone: 'workspaces' },
    { label: 'Sessions', value: counts.sessions, tone: 'sessions' },
    { label: 'Running', value: counts.running, tone: 'running' },
    { label: 'Waiting', value: counts.waiting, tone: 'waiting' },
    { label: 'Blocked', value: counts.blocked, tone: 'blocked' },
    { label: 'Failed', value: counts.failed, tone: 'failed' },
    { label: 'Completed', value: counts.completed, tone: 'completed' },
    { label: 'Idle', value: counts.idle, tone: 'idle' },
    { label: 'Unknown', value: counts.unknown, tone: 'unknown' }
  ];

  return el(
    'section',
    { class: 'panel status-strip', attrs: { 'aria-label': 'Status counts' } },
    cards.map((card) =>
      el('div', { class: `status-card status-${card.tone}` }, [
        el('span', { class: 'status-card-label muted' }, [card.label]),
        el('span', { class: 'status-card-value' }, [String(card.value)])
      ])
    )
  );
}
