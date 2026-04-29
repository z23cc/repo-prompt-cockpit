import { describe, expect, it } from 'vitest';
import { deriveAttentionItems } from '../src/domain/attention.js';
import { createDeterministicSummary } from '../src/domain/summary.js';
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

describe('deriveAttentionItems', () => {
  it('prioritizes waiting sessions over running sessions', () => {
    const items = deriveAttentionItems({
      ...baseSnapshot,
      sessions: [
        { id: 'run', title: 'Running work', state: 'running', observation: 'observed' },
        { id: 'wait', title: 'Needs input', state: 'waiting_for_input', observation: 'observed' }
      ]
    });

    expect(items[0]).toMatchObject({ id: 'wait', observation: 'observed' });
  });

  it('does not fabricate session priority when session data is unavailable', () => {
    const items = deriveAttentionItems({
      ...baseSnapshot,
      windows: [{ id: 12, workspace: 'RepoPrompt-control-plane', observation: 'observed', tabs: [] }]
    });

    expect(items[0]).toMatchObject({ label: 'No actionable session data available', state: 'workspace', observation: 'observed' });
  });
});

describe('createDeterministicSummary', () => {
  it('labels fixture data and stays bounded', async () => {
    const snapshot = await new DemoFixtureProvider(() => new Date('2026-04-28T00:00:00Z')).collectSnapshot();
    const summary = createDeterministicSummary(snapshot, { summaryMaxChars: 1200 });

    expect(summary).toContain('fixture-backed');
    expect(summary.length).toBeLessThanOrEqual(1200);
    expect(summary).not.toContain('<transcript>');
  });

  it('enforces a hard maximum summary size', () => {
    const summary = createDeterministicSummary(
      {
        ...baseSnapshot,
        diagnostics: [
          {
            code: 'long',
            message: 'x'.repeat(5000),
            severity: 'warning',
            observedAt: '2026-04-28T00:00:00Z'
          }
        ]
      },
      { summaryMaxChars: 1200 }
    );

    expect(summary.length).toBeLessThanOrEqual(1200);
  });
});
