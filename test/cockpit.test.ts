import { describe, expect, it } from 'vitest';
import { createControlPlaneDashboard } from '../src/domain/dashboard.js';
import { DemoFixtureProvider } from '../src/repoprompt/providers/index.js';
import { contextRail } from '../src/renderer/components/contextRail.js';
import { workflowDetailsPanel } from '../src/renderer/components/workflowDetailsPanel.js';
import { sidebar } from '../src/renderer/components/sidebar.js';
import { workflowTabsFromActivityTabs } from '../src/renderer/components/workflowToolbar.js';
import { selectDefaultSelectionId } from '../src/renderer/selection.js';
import {
  ageLabelForTesting,
  avatarInitialsForTesting,
  filterCounts,
  filterItems
} from '../src/renderer/components/workspaceColumn.js';
import type { ControlPlaneSnapshot } from '../src/shared/types.js';

class TestNode {
  childNodes: TestNode[] = [];
  parentNode?: TestNode;

  appendChild(child: TestNode): TestNode {
    this.childNodes.push(child);
    child.parentNode = this;
    return child;
  }

  get firstChild(): TestNode | undefined {
    return this.childNodes[0];
  }

  removeChild(child: TestNode): TestNode {
    this.childNodes = this.childNodes.filter((node) => node !== child);
    child.parentNode = undefined;
    return child;
  }

  get textContent(): string {
    return this.childNodes.map((child) => child.textContent).join('');
  }
}

class TestText extends TestNode {
  constructor(private readonly value: string) {
    super();
  }

  override get textContent(): string {
    return this.value;
  }
}

class TestElement extends TestNode {
  className = '';
  dataset: Record<string, string> = {};
  title = '';
  private readonly attrs = new Map<string, string>();

  constructor(readonly tag: string) {
    super();
  }

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  addEventListener(): void {
    // Tests only inspect rendered text.
  }
}

function installTestDom(): void {
  Object.assign(globalThis, {
    Node: TestNode,
    document: {
      createElement: (tag: string) => new TestElement(tag),
      createTextNode: (value: string) => new TestText(value)
    }
  });
}

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

describe('sidebar rendering', () => {
  it('renders only wired navigation plus one parked note for unsupported surfaces', () => {
    installTestDom();
    const nav = sidebar();
    const text = nav.textContent ?? '';

    expect(text).toContain('Cockpit');
    expect(text).toContain('Workspaces');
    expect(text).toContain('Parked surfaces');
    expect(text).toContain('stay hidden until the provider can expose real data');
    expect(text).not.toContain('soon');
    expect(text).not.toContain('Worktrees');
    expect(text).not.toContain('MCP Servers');
    expect(text).not.toContain('Templates');
  });
});

describe('context rail rendering', () => {
  it('renders observed tab/context metadata without claiming file-level context', async () => {
    installTestDom();
    const snapshot = await new DemoFixtureProvider(() => new Date('2026-04-28T00:00:00Z')).collectSnapshot();
    const dashboard = createControlPlaneDashboard(snapshot);
    const rail = contextRail({ dashboard, selectedId: undefined }, { onSelect: () => undefined });
    const text = rail.textContent ?? '';

    expect(text).toContain('Workspace/context metadata');
    expect(text).toContain('T1');
    expect(text).toContain('context fixture-');
    expect(text).toContain('Publish plan context');
    expect(text).toContain('Overall snapshot progress');
    expect(text).not.toContain('Files in context');
    expect(text).not.toContain('Workflow progress');
  });
});

describe('workflow detail panels', () => {
  it('parks unsupported workflow views with honest unavailable copy instead of fake diff/log content', () => {
    installTestDom();
    const dashboard = createControlPlaneDashboard(baseSnapshot);
    const logs = workflowDetailsPanel({ dashboard, activeTab: 'logs' });
    const artifacts = workflowDetailsPanel({ dashboard, activeTab: 'artifacts' });
    const text = `${logs.textContent ?? ''} ${artifacts.textContent ?? ''}`;

    expect(text).toContain('Logs · unavailable');
    expect(text).toContain('Log/transcript capability is not called by default');
    expect(text).toContain('Artifacts · unavailable');
    expect(text).toContain('Artifacts are not reported by the read-only provider snapshot');
    expect(text).not.toContain('diff');
    expect(text).not.toContain('token');
  });
});

describe('workflow tab descriptors', () => {
  it('keeps only Plan and Activity in the primary toolbar descriptor list', () => {
    const dashboard = createControlPlaneDashboard(baseSnapshot);
    const tabs = workflowTabsFromActivityTabs(dashboard.activityPanel.tabs);
    expect(tabs.map((tab) => tab.key)).toEqual(['plan', 'activity']);
    expect(tabs.every((tab) => tab.available)).toBe(true);
  });

  it('keeps provider-supplied unavailable tabs parked in dashboard state (not fabricated in toolbar)', () => {
    const dashboard = createControlPlaneDashboard(baseSnapshot);
    expect(dashboard.activityPanel.tabs.map((tab) => tab.key)).not.toContain('diff');
    expect(dashboard.activityPanel.tabs.find((tab) => tab.key === 'logs')?.detail).toContain('not called');
    expect(dashboard.activityPanel.tabs.find((tab) => tab.key === 'artifacts')?.detail).toContain('not reported');
  });
});

describe('renderer selection defaults', () => {
  it('prefers real session/focus rows and never selects placeholder workflows', async () => {
    const fixtureSnapshot = await new DemoFixtureProvider(() => new Date('2026-04-28T00:00:00Z')).collectSnapshot();
    const fixtureDashboard = createControlPlaneDashboard(fixtureSnapshot);
    expect(selectDefaultSelectionId(fixtureDashboard)).toBe(fixtureDashboard.activityPanel.selectedItemId);
    expect(
      fixtureDashboard.implementationPlan.items.find((item) => item.id === selectDefaultSelectionId(fixtureDashboard))?.kind
    ).toBe('session');

    const windowsOnlyDashboard = createControlPlaneDashboard({
      ...baseSnapshot,
      windows: [{ id: 12, workspace: 'RepoPrompt-control-plane', observation: 'observed', tabs: [] }]
    });
    expect(windowsOnlyDashboard.implementationPlan.items[0]?.kind).toBe('placeholder');
    expect(selectDefaultSelectionId(windowsOnlyDashboard)).not.toBe('unavailable-session-state');

    const emptyDashboard = createControlPlaneDashboard(baseSnapshot);
    expect(emptyDashboard.implementationPlan.items[0]?.kind).toBe('placeholder');
    expect(selectDefaultSelectionId(emptyDashboard)).toBeUndefined();
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
