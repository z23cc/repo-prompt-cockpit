import type { ControlPlaneDashboard } from '../../domain/dashboard.js';
import type { ProviderMode } from '../../shared/types.js';
import { classNames, el } from './dom.js';

export type RefreshState = 'idle' | 'refreshing' | 'error';

export interface TopBarHandlers {
  refresh(): void;
  copySummary(): void;
  setMode(mode: ProviderMode): void;
}

export function topBar(
  dashboard: ControlPlaneDashboard | undefined,
  refreshState: RefreshState,
  message: string,
  handlers: TopBarHandlers
): HTMLElement {
  const isFixture = dashboard?.isFixture ?? false;
  const providerLabel = dashboard?.providerLabel ?? 'Loading provider…';
  const generatedAt = dashboard ? new Date(dashboard.generatedAt).toLocaleTimeString() : '—';
  const liveDisabled = !dashboard;
  const fixtureDisabled = !dashboard;

  return el('header', { class: 'topbar' }, [
    el('div', { class: 'topbar-identity' }, [
      el('p', { class: 'eyebrow' }, ['RepoPrompt Control Plane']),
      el('h1', { class: 'topbar-title' }, [providerLabel])
    ]),
    el('div', { class: 'topbar-meta' }, [
      el('span', { class: 'topbar-meta-label muted' }, ['Snapshot']),
      el('span', { class: 'topbar-meta-value' }, [generatedAt])
    ]),
    el('div', { class: 'topbar-toggle', attrs: { role: 'group', 'aria-label': 'Provider mode' } }, [
      modeButton('Live rp-cli', !isFixture, liveDisabled, () => handlers.setMode('live')),
      modeButton('Fixture demo', isFixture, fixtureDisabled, () => handlers.setMode('fixture'))
    ]),
    el('div', { class: 'topbar-actions' }, [
      actionButton(
        refreshState === 'refreshing' ? 'Refreshing…' : 'Refresh',
        () => handlers.refresh(),
        refreshState === 'refreshing'
      ),
      actionButton('Copy summary', () => handlers.copySummary(), !dashboard)
    ]),
    el('p', { class: classNames('topbar-status', `status-${refreshState}`) }, [message])
  ]);
}

function modeButton(label: string, active: boolean, disabled: boolean, onClick: () => void): HTMLButtonElement {
  const node = el('button', { class: classNames('btn', 'btn-toggle', active && 'is-active') }, [label]);
  node.disabled = disabled;
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function actionButton(label: string, onClick: () => void, disabled: boolean): HTMLButtonElement {
  const node = el('button', { class: 'btn btn-ghost' }, [label]);
  node.disabled = disabled;
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}
