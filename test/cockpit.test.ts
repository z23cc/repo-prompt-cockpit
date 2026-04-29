import { describe, expect, it } from 'vitest';
import { createControlPlaneDashboard } from '../src/domain/dashboard.js';
import { DemoFixtureProvider } from '../src/repoprompt/providers/index.js';
import { workflowTabsFromActivityTabs } from '../src/renderer/components/workflowToolbar.js';
import {
  ageLabelForTesting,
  avatarInitialsForTesting,
  filterCounts,
  filterItems
} from '../src/renderer/components/workspaceColumn.js';
import type { ControlPlaneSnapshot } from '../src/shared/types.js';

const baseSnapshot: ControlPlaneSnapshot = {
  generatedAt: '2026-04-28T00:00:00Z',
  provider: 'rp-cli',
  windows: [],
  sessions: [],
  capabilities: [],
  diagnostics: [],
  summarySource: 'observed'
};

describe('cockpit workspace column helpers', () => {
  it('counts sessions per filter without inflating workspace state', async () => {
    const snapshot = await new DemoFixtureProvider(() => new Date('2026-04-28T00:00:00Z')).collectSnapshot();
    const dashboard = createControlPlaneDashboard(snapshot);

    const counts = filterCounts(dashboard.implementationPlan.items);
    expect(counts.all).toBe(dashboard.implementationPlan.items.length);
    expect(counts.running).toBe(dashboard.statusCounts.running);
    expect(counts.waiting).toBe(dashboard.statusCounts.waiting);
    expect(counts.blocked).toBe(dashboard.statusCounts.blocked);
  });

  it('filters items by state mapping (waiting maps to waiting_for_input)', async () => {
    const snapshot = await new DemoFixtureProvider(() => new Date('2026-04-28T00:00:00Z')).collectSnapshot();
    const dashboard = createControlPlaneDashboard(snapshot);

    expect(filterItems(dashboard.implementationPlan.items, 'all')).toHaveLength(
      dashboard.implementationPlan.items.length
    );
    const waiting = filterItems(dashboard.implementationPlan.items, 'waiting');
    expect(waiting.length).toBeGreaterThan(0);
    expect(waiting.every((item) => item.state === 'waiting_for_input')).toBe(true);

    const blocked = filterItems(dashboard.implementationPlan.items, 'blocked');
    expect(blocked.every((item) => item.state === 'blocked')).toBe(true);
  });

  it('renders deterministic age labels relative to snapshot time', () => {
    const now = Date.parse('2026-04-28T00:10:00Z');
    expect(ageLabelForTesting('2026-04-28T00:09:30Z', now)).toBe('30s');
    expect(ageLabelForTesting('2026-04-28T00:05:00Z', now)).toBe('5m');
    expect(ageLabelForTesting('2026-04-27T20:00:00Z', now)).toBe('4h');
    expect(ageLabelForTesting('2026-04-25T00:00:00Z', now)).toBe('3d');
    expect(ageLabelForTesting(undefined, now)).toBeUndefined();
    expect(ageLabelForTesting('2026-04-28T00:09:30Z', undefined)).toBeUndefined();
  });

  it('derives avatar initials safely without inventing characters for empty models', () => {
    expect(avatarInitialsForTesting('Claude Sonnet 4.6')).toBe('CS');
    expect(avatarInitialsForTesting('Codex')).toBe('CO');
    expect(avatarInitialsForTesting('   ')).toBe('·');
    expect(avatarInitialsForTesting('GPT-5.5')).toBe('GP');
  });
});

describe('workflow tab descriptors', () => {
  it('keeps Plan/Activity available and labels Artifacts/Logs/Results unavailable until provider supports them', () => {
    const dashboard = createControlPlaneDashboard(baseSnapshot);
    const tabs = workflowTabsFromActivityTabs(dashboard.activityPanel.tabs);
    expect(tabs.map((tab) => tab.key)).toEqual(['plan', 'activity', 'artifacts', 'logs', 'results']);
    expect(tabs.find((tab) => tab.key === 'plan')?.available).toBe(true);
    expect(tabs.find((tab) => tab.key === 'activity')?.available).toBe(true);
    expect(tabs.find((tab) => tab.key === 'artifacts')?.available).toBe(false);
    expect(tabs.find((tab) => tab.key === 'logs')?.available).toBe(false);
    expect(tabs.find((tab) => tab.key === 'results')?.available).toBe(false);
  });

  it('uses the provider-supplied detail strings for unavailable tabs (no fabricated copy)', () => {
    const dashboard = createControlPlaneDashboard(baseSnapshot);
    const tabs = workflowTabsFromActivityTabs(dashboard.activityPanel.tabs);
    expect(tabs.find((tab) => tab.key === 'logs')?.detail).toContain('not loaded');
    expect(tabs.find((tab) => tab.key === 'artifacts')?.detail).toContain('Unavailable');
  });
});

describe('implementation plan items', () => {
  it('propagates updatedAt timestamps so the cockpit can render age labels', async () => {
    const snapshot = await new DemoFixtureProvider(() => new Date('2026-04-28T00:00:00Z')).collectSnapshot();
    const dashboard = createControlPlaneDashboard(snapshot);
    const orchestrator = dashboard.implementationPlan.items.find(
      (item) => item.id === 'fixture-orchestrator-parent'
    );
    expect(orchestrator?.updatedAt).toBe('2026-04-28T00:00:00.000Z');
    expect(orchestrator?.kind).toBe('session');
  });

  it('marks synthetic empty-state rows as placeholders so the cockpit cannot count them as sessions', () => {
    const dashboardWindowsOnly = createControlPlaneDashboard({
      ...baseSnapshot,
      windows: [{ id: 12, workspace: 'RepoPrompt-control-plane', observation: 'observed', tabs: [] }]
    });
    const placeholder = dashboardWindowsOnly.implementationPlan.items[0];
    expect(placeholder?.kind).toBe('placeholder');
    expect(placeholder?.state).toBe('unavailable');

    const counts = filterCounts(dashboardWindowsOnly.implementationPlan.items);
    expect(counts.all).toBe(0);
    expect(counts.running).toBe(0);
    expect(filterItems(dashboardWindowsOnly.implementationPlan.items, 'all')).toEqual([]);

    const dashboardEmpty = createControlPlaneDashboard(baseSnapshot);
    expect(dashboardEmpty.implementationPlan.items[0]?.kind).toBe('placeholder');
    expect(filterCounts(dashboardEmpty.implementationPlan.items).all).toBe(0);
  });
});
