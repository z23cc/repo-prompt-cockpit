import type { ActivityPanelTab, ControlPlaneDashboard } from '../../domain/dashboard.js';
import type { ProviderMode, SessionState, WindowMode } from '../../shared/types.js';
import { classNames, el } from './dom.js';
import { stateLabel } from './format.js';

export type WorkflowTabKey = 'plan' | 'activity' | 'artifacts' | 'logs' | 'results';

export interface SelectedSummary {
  title: string;
  state: SessionState | 'unavailable';
  workspace?: string;
  model?: string;
  observation: 'observed' | 'inferred' | 'fixture' | 'unavailable';
}

export interface WorkflowToolbarHandlers {
  onTabChange(tab: WorkflowTabKey): void;
  onMode(mode: ProviderMode): void;
  onToggleWindowMode(): void;
}

export interface WorkflowTabDescriptor {
  key: WorkflowTabKey;
  label: string;
  available: boolean;
  detail: string;
}

export interface WorkflowToolbarOptions {
  dashboard: ControlPlaneDashboard;
  selected: SelectedSummary | undefined;
  activeTab: WorkflowTabKey;
  isFixture: boolean;
  windowMode: WindowMode;
}

const WORKFLOW_TAB_ORDER: WorkflowTabKey[] = ['plan', 'activity', 'artifacts', 'logs', 'results'];

const WORKFLOW_TAB_DEFAULTS: Record<WorkflowTabKey, Omit<WorkflowTabDescriptor, 'key'>> = {
  plan: {
    label: 'Plan',
    available: true,
    detail: 'Selected workflow/session metadata when provider reports a real session; otherwise an honest empty state.'
  },
  activity: {
    label: 'Activity',
    available: true,
    detail: 'Session metadata and deterministic status only.'
  },
  artifacts: {
    label: 'Artifacts',
    available: false,
    detail: 'Artifacts are not reported by the read-only provider snapshot.'
  },
  logs: {
    label: 'Logs',
    available: false,
    detail: 'Log/transcript capability is not called by default; bodies are unavailable.'
  },
  results: {
    label: 'Results',
    available: false,
    detail: 'Results are not reported by the read-only provider snapshot.'
  }
};

export function workflowTabsFromActivityTabs(tabs: ActivityPanelTab[]): WorkflowTabDescriptor[] {
  const byKey = new Map(tabs.map((tab) => [tab.key, tab]));
  return WORKFLOW_TAB_ORDER.map((key) => {
    const tab = byKey.get(key);
    const fallback = WORKFLOW_TAB_DEFAULTS[key];
    return {
      key,
      label: tab?.label ?? fallback.label,
      available: tab?.available ?? fallback.available,
      detail: tab?.detail ?? fallback.detail
    };
  });
}

export function workflowToolbar(
  options: WorkflowToolbarOptions,
  handlers: WorkflowToolbarHandlers
): HTMLElement {
  const tabs = workflowTabsFromActivityTabs(options.dashboard.activityPanel.tabs);
  const selected = options.selected;

  return el('header', { class: 'workflow-toolbar', attrs: { 'aria-label': 'Workflow toolbar' } }, [
    el('div', { class: 'workflow-toolbar-row row-primary' }, [
      el('div', { class: 'workflow-title-block' }, [
        el('span', { class: 'workflow-eyebrow' }, [options.dashboard.providerLabel]),
        el('div', { class: 'workflow-title' }, [
          el('h1', { title: selected?.title ?? 'No selection' }, [selected?.title ?? 'No workflow selected']),
          selected?.workspace
            ? el('span', { class: 'pill pill-workspace' }, [selected.workspace])
            : null,
          selected
            ? el('span', { class: `pill pill-state pill-${selected.state}` }, [
                el('span', { class: 'pill-state-dot', attrs: { 'aria-hidden': 'true' } }, []),
                stateLabel(selected.state)
              ])
            : null
        ])
      ]),
      el('div', { class: 'workflow-controls' }, [
        modelChip(selected),
        modeSegment(options.isFixture, handlers),
        windowModeButton(options.windowMode, handlers)
      ])
    ]),
    el(
      'div',
      { class: 'workflow-tabs', attrs: { role: 'tablist', 'aria-label': 'Workflow views' } },
      tabs.map((tab) => workflowTab(tab, options.activeTab, handlers))
    )
  ]);
}

function workflowTab(
  tab: WorkflowTabDescriptor,
  activeTab: WorkflowTabKey,
  handlers: WorkflowToolbarHandlers
): HTMLButtonElement {
  const isActive = tab.key === activeTab;
  const node = el(
    'button',
    {
      class: classNames(
        'workflow-tab',
        isActive && 'is-active',
        !tab.available && 'is-unavailable-tab'
      ),
      attrs: {
        role: 'tab',
        type: 'button',
        'aria-selected': isActive ? 'true' : 'false',
        title: tab.detail
      }
    },
    [
      el('span', { class: 'workflow-tab-mark', attrs: { 'aria-hidden': 'true' } }, []),
      tab.label,
      tab.available
        ? null
        : el('span', { class: 'badge badge-unavailable', attrs: { style: 'margin-left: 0.25rem;' } }, [
            'unavailable'
          ])
    ]
  );
  node.addEventListener('click', () => handlers.onTabChange(tab.key));
  return node;
}

function modelChip(selected: SelectedSummary | undefined): HTMLElement {
  const model = selected?.model;
  return el('div', { class: 'pill', title: 'Model reported by provider' }, [
    el('span', { attrs: { 'aria-hidden': 'true' } }, ['◇']),
    el('span', undefined, [model ?? 'Model unavailable'])
  ]);
}

function modeSegment(isFixture: boolean, handlers: WorkflowToolbarHandlers): HTMLElement {
  const live = el(
    'button',
    {
      class: classNames('btn-segment', !isFixture && 'is-active'),
      attrs: { type: 'button', title: 'Live rp-cli provider' }
    },
    ['Live']
  );
  live.addEventListener('click', () => handlers.onMode('live'));
  const fixture = el(
    'button',
    {
      class: classNames('btn-segment', isFixture && 'is-active'),
      attrs: { type: 'button', title: 'Demo fixture provider (offline data)' }
    },
    ['Fixture']
  );
  fixture.addEventListener('click', () => handlers.onMode('fixture'));
  return el('div', { class: 'btn-segmented', attrs: { role: 'group', 'aria-label': 'Provider mode' } }, [
    live,
    fixture
  ]);
}

function windowModeButton(windowMode: WindowMode, handlers: WorkflowToolbarHandlers): HTMLElement {
  const label = windowMode === 'minimal' ? 'Desktop mode' : 'Minimal mode';
  const button = el(
    'button',
    {
      class: classNames('btn-segment', 'btn-window-mode', windowMode === 'minimal' && 'is-active'),
      attrs: {
        type: 'button',
        title:
          windowMode === 'minimal'
            ? 'Return to the full desktop cockpit window'
            : 'Shrink the cockpit into an always-on-top minimal window'
      }
    },
    [label]
  );
  button.addEventListener('click', () => handlers.onToggleWindowMode());
  return button;
}
