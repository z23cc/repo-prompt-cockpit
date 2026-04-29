import type { MenuItemConstructorOptions } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import { DemoFixtureProvider } from '../src/repoprompt/providers/index.js';
import { buildTrayTemplate, buildTrayTitle } from '../src/main/trayMenu.js';
import type { ControlPlaneSnapshot } from '../src/shared/types.js';

describe('tray menu', () => {
  it('builds grouped fixture-labeled sections with refresh and copy actions', async () => {
    const snapshot = await new DemoFixtureProvider(() => new Date('2026-04-28T00:00:00Z')).collectSnapshot();
    const refreshNow = vi.fn();
    const copySummary = vi.fn();
    const menu = buildTrayTemplate(snapshot, {
      openControlPlane: vi.fn(),
      refreshNow,
      copySummary,
      switchToFixtureMode: vi.fn(),
      switchToLiveMode: vi.fn(),
      quit: vi.fn()
    });
    const labels = menuLabels(menu);

    expect(buildTrayTitle(snapshot)).toMatch(/^RP demo \d+s \d+▶ \d+\?$/);
    expect(labels).toEqual(
      expect.arrayContaining(['Focus next', 'Sessions', 'Workspaces', 'Capabilities', 'Diagnostics', 'Actions', 'Open Control Plane', 'Copy summary'])
    );
    expect(labels).toContain('Use live rp-cli mode');
    expect(labels.some((label) => label.includes('[fixture]'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Waiting'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Running'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Blocked'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Completed'))).toBe(true);
  });

  it('renders explicit unavailable session fallback and diagnostics for empty live snapshots', () => {
    const snapshot: ControlPlaneSnapshot = {
      generatedAt: '2026-04-28T00:00:00Z',
      provider: 'rp-cli',
      windows: [{ id: 88, workspace: 'RepoPrompt-control-plane', repoPath: '/repo', tabs: [], observation: 'observed' }],
      sessions: [],
      capabilities: [
        {
          field: 'agentSessionStates',
          source: 'agent_manage list_sessions',
          requiresBinding: true,
          parseFormat: 'json',
          failureMode: 'binding required',
          privacyClass: 'metadata',
          observation: 'unavailable',
          status: 'unavailable'
        }
      ],
      diagnostics: [
        {
          code: 'session_status_requires_binding',
          message: 'binding required',
          severity: 'warning',
          observedAt: '2026-04-28T00:00:00Z'
        }
      ],
      summarySource: 'observed'
    };

    const labels = menuLabels(
      buildTrayTemplate(snapshot, {
        openControlPlane: vi.fn(),
        refreshNow: vi.fn(),
        copySummary: vi.fn(),
        switchToFixtureMode: vi.fn(),
        switchToLiveMode: vi.fn(),
        quit: vi.fn()
      })
    );

    expect(buildTrayTitle(snapshot)).toBe('RP 0s 0▶ 0?');
    expect(labels).toContain('[unavailable] No live session rows available');
    expect(labels).toContain('[observed] RepoPrompt-control-plane');
    expect(labels).toContain('[observed] warning: session_status_requires_binding');
    expect(labels).toContain('Open Control Plane');
    expect(labels).toContain('Use fixture demo mode');
  });
});

function menuLabels(menu: MenuItemConstructorOptions[]): string[] {
  return menu.flatMap((item) => {
    const label = typeof item.label === 'string' ? [item.label] : [];
    const submenu = Array.isArray(item.submenu) ? menuLabels(item.submenu) : [];
    return [...label, ...submenu];
  });
}
