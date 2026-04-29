import { describe, expect, it } from 'vitest';
import { deriveAttentionItems } from '../src/domain/attention.js';
import { createControlPlaneDashboard } from '../src/domain/dashboard.js';
import { DemoFixtureProvider } from '../src/repoprompt/providers/index.js';
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

describe('createControlPlaneDashboard', () => {
  it('labels fixture snapshots and keeps deterministic privacy banner', async () => {
    const snapshot = await new DemoFixtureProvider(() => new Date('2026-04-28T00:00:00Z')).collectSnapshot();
    const dashboard = createControlPlaneDashboard(snapshot);

    expect(dashboard.isFixture).toBe(true);
    expect(dashboard.providerLabel).toContain('fixture');
    expect(dashboard.privacyBanner.detail).toContain('not loaded or uploaded by default');
    expect(dashboard.activityPanel.tabs.find((tab) => tab.key === 'logs')).toMatchObject({ available: false });

    expect(dashboard.sessionTree.mode).toBe('observed');
    const parent = dashboard.sessionTree.roots.find((node) => node.id === 'fixture-orchestrator-parent');
    expect(parent).toBeDefined();
    expect(parent?.children.length).toBeGreaterThanOrEqual(2);
    expect(parent?.children.map((node) => node.id)).toEqual(
      expect.arrayContaining(['fixture-child-dashboard-tree', 'fixture-child-security-review'])
    );
    expect(parent?.children[0]?.relationshipLabel).toBe('relationship observed');
  });

  it('creates unavailable implementation item when only workspace context is available', () => {
    const dashboard = createControlPlaneDashboard({
      ...baseSnapshot,
      windows: [{ id: 12, workspace: 'RepoPrompt-control-plane', observation: 'observed', tabs: [] }]
    });

    expect(dashboard.implementationPlan.items[0]).toMatchObject({
      title: 'No live implementation plan available',
      state: 'unavailable',
      observation: 'unavailable',
      kind: 'placeholder'
    });
  });

  it('computes status counts and keeps top focus item aligned to attention domain', () => {
    const snapshot: ControlPlaneSnapshot = {
      ...baseSnapshot,
      sessions: [
        { id: 'run', title: 'Running work', state: 'running', observation: 'observed' },
        { id: 'wait', title: 'Needs input', state: 'waiting_for_input', observation: 'observed' },
        { id: 'done', title: 'Done', state: 'completed', observation: 'observed' }
      ]
    };

    const dashboard = createControlPlaneDashboard(snapshot);
    const focus = deriveAttentionItems(snapshot);

    expect(dashboard.statusCounts).toMatchObject({ sessions: 3, running: 1, waiting: 1, completed: 1 });
    expect(dashboard.focusItems[0]?.id).toBe(focus[0]?.id);
  });

  it('counts unique workspaces in status counts when multiple windows share a workspace', () => {
    const dashboard = createControlPlaneDashboard({
      ...baseSnapshot,
      windows: [
        { id: 1, workspace: 'repo-a', observation: 'observed', tabs: [] },
        { id: 2, workspace: 'repo-a', observation: 'observed', tabs: [] },
        { id: 3, workspace: 'repo-b', observation: 'observed', tabs: [] }
      ]
    });

    expect(dashboard.statusCounts.workspaces).toBe(2);
  });

  it('marks inferred relationships when only workflow metadata can group sessions', () => {
    const dashboard = createControlPlaneDashboard({
      ...baseSnapshot,
      sessions: [
        { id: 'a', title: 'A Parent', state: 'running', observation: 'observed', workspace: 'x', workflowId: 'wf-a' },
        { id: 'b', title: 'B Child', state: 'running', observation: 'observed', workspace: 'x', workflowId: 'wf-a' }
      ]
    });

    expect(dashboard.sessionTree.mode).toBe('inferred');
    expect(dashboard.sessionTree.modeLabel).toBe('relationship inferred');
    expect(dashboard.sessionTree.roots[0]?.children[0]?.relationship).toBe('inferred');
  });

  it('falls back to flat sessions when no parent link data is available', () => {
    const dashboard = createControlPlaneDashboard({
      ...baseSnapshot,
      sessions: [{ id: 'solo', title: 'Solo Run', state: 'running', observation: 'observed' }]
    });

    expect(dashboard.sessionTree.mode).toBe('flat');
    expect(dashboard.sessionTree.modeLabel).toBe('flat sessions (parent link unavailable)');
    expect(dashboard.sessionTree.roots[0]?.relationshipLabel).toBe('flat sessions (parent link unavailable)');
  });

  it('keeps same-workspace sessions flat when workflow/parent metadata is absent', () => {
    const dashboard = createControlPlaneDashboard({
      ...baseSnapshot,
      sessions: [
        { id: 's1', title: 'Session 1', state: 'running', observation: 'observed', workspace: 'repo-a' },
        { id: 's2', title: 'Session 2', state: 'running', observation: 'observed', workspace: 'repo-a' }
      ]
    });

    expect(dashboard.sessionTree.mode).toBe('flat');
    expect(dashboard.sessionTree.modeLabel).toBe('flat sessions (parent link unavailable)');
    expect(dashboard.sessionTree.roots).toHaveLength(2);
    expect(dashboard.sessionTree.roots.every((node) => node.children.length === 0)).toBe(true);
    expect(dashboard.sessionTree.roots.every((node) => node.relationshipLabel === 'flat sessions (parent link unavailable)')).toBe(
      true
    );
  });

  it('uses diagnostics as no-activity detail when no windows or sessions are present', () => {
    const dashboard = createControlPlaneDashboard({
      ...baseSnapshot,
      diagnostics: [
        {
          code: 'rp_cli_missing',
          message: 'rp-cli was not found in PATH.',
          severity: 'error',
          observedAt: '2026-04-28T00:00:00Z'
        }
      ]
    });

    expect(dashboard.implementationPlan.items[0]?.detail).toContain('rp-cli was not found');
  });
});
