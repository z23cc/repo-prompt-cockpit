import type { ControlPlaneSnapshot, RepoPromptProvider } from '../../shared/types.js';

export class DemoFixtureProvider implements RepoPromptProvider {
  readonly name = 'demo-fixture' as const;

  constructor(private readonly now: () => Date = () => new Date()) {}

  async collectSnapshot(): Promise<ControlPlaneSnapshot> {
    const generatedAt = this.now().toISOString();
    return {
      generatedAt,
      provider: this.name,
      summarySource: 'fixture',
      windows: [
        {
          id: 101,
          workspace: 'RepoPrompt-control-plane',
          repoPath: '/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane',
          observation: 'fixture',
          tabs: [{ name: 'T1', contextId: 'fixture-context-control-plane', active: true, observation: 'fixture' }]
        }
      ],
      sessions: [
        {
          id: 'fixture-report-contract',
          title: 'Report contract v2',
          workspace: 'RepoPrompt-control-plane',
          state: 'running',
          model: 'Codex 5.3',
          progress: 0.75,
          updatedAt: generatedAt,
          observation: 'fixture',
          summary: 'Implement schema migration, fixtures, and verification receipts.'
        },
        {
          id: 'fixture-war-room',
          title: 'War Room Redesign',
          workspace: 'RepoPrompt-control-plane',
          state: 'running',
          model: 'Claude Sonnet 4.6',
          progress: 0.9,
          updatedAt: generatedAt,
          observation: 'fixture',
          summary: 'Revamp interface hierarchy and review visual deltas.'
        },
        {
          id: 'fixture-security-review',
          title: 'Security Review',
          workspace: 'RepoPrompt-control-plane',
          state: 'blocked',
          model: 'Opus 4.7',
          progress: 0.6,
          updatedAt: generatedAt,
          observation: 'fixture',
          summary: 'Blocked while waiting for dependency audit output.'
        },
        {
          id: 'fixture-release-gate',
          title: 'Release Gate',
          workspace: 'RepoPrompt-control-plane',
          state: 'waiting_for_input',
          model: 'Sonnet 4.6',
          progress: 0.95,
          updatedAt: generatedAt,
          observation: 'fixture',
          summary: 'Needs user approval before publishing the verified build.'
        },
        {
          id: 'fixture-docs-update',
          title: 'Documentation Update',
          workspace: 'RepoPrompt-control-plane',
          state: 'completed',
          model: 'GPT-5.5',
          progress: 1,
          updatedAt: generatedAt,
          observation: 'fixture',
          summary: 'Demo script and setup notes are complete.'
        }
      ],
      diagnostics: [
        {
          code: 'fixture_mode',
          message: 'DemoFixtureProvider is active; all session data is fixture-backed.',
          severity: 'info',
          observedAt: generatedAt
        }
      ],
      capabilities: [
        {
          field: 'windows',
          source: 'fixture',
          requiresBinding: false,
          parseFormat: 'fixture',
          failureMode: 'none',
          privacyClass: 'metadata',
          observation: 'fixture',
          status: 'available'
        },
        {
          field: 'agentSessionStates',
          source: 'fixture',
          requiresBinding: false,
          parseFormat: 'fixture',
          failureMode: 'none',
          privacyClass: 'metadata',
          observation: 'fixture',
          status: 'available'
        },
        {
          field: 'copySummary',
          source: 'local deterministic summary',
          requiresBinding: false,
          parseFormat: 'none',
          failureMode: 'none',
          privacyClass: 'metadata',
          observation: 'fixture',
          status: 'available'
        }
      ]
    };
  }
}
