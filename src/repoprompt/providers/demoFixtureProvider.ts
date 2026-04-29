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
          workspaceId: 'fixture-workspace-control-plane',
          repoPath: '/workspace/RepoPrompt-control-plane',
          repoPaths: ['/workspace/RepoPrompt-control-plane'],
          activeContextId: 'fixture-context-control-plane',
          observation: 'fixture',
          tabs: [
            { name: 'T1', contextId: 'fixture-context-control-plane', active: true, observation: 'fixture' },
            { name: 'Publish plan context', contextId: 'fixture-context-publish-plan', active: false, observation: 'fixture' }
          ]
        }
      ],
      sessions: [
        {
          id: 'fixture-orchestrator-parent',
          title: 'Orchestration Run: Control Plane S-tier',
          workspace: 'RepoPrompt-control-plane',
          state: 'running',
          model: 'Codex 5.3',
          progress: 0.75,
          updatedAt: generatedAt,
          observation: 'fixture',
          summary: 'Parent orchestration run coordinating parallel sub-agents.',
          workflowId: 'wf-control-plane-001',
          metadata: { role: 'orchestrator' }
        },
        {
          id: 'fixture-child-dashboard-tree',
          title: 'Sub-agent: dashboard tree derivation',
          workspace: 'RepoPrompt-control-plane',
          state: 'running',
          model: 'Claude Sonnet 4.6',
          progress: 0.9,
          updatedAt: generatedAt,
          observation: 'fixture',
          summary: 'Revamp session hierarchy derivation and review visual deltas.',
          parentSessionId: 'fixture-orchestrator-parent',
          workflowId: 'wf-control-plane-001',
          metadata: { role: 'executor' }
        },
        {
          id: 'fixture-child-security-review',
          title: 'Sub-agent: security review',
          workspace: 'RepoPrompt-control-plane',
          state: 'blocked',
          model: 'Opus 4.7',
          progress: 0.6,
          updatedAt: generatedAt,
          observation: 'fixture',
          summary: 'Blocked while waiting for dependency audit output.',
          parentSessionId: 'fixture-orchestrator-parent',
          workflowId: 'wf-control-plane-001',
          metadata: { role: 'security-reviewer' }
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
          field: 'agentLogs',
          source: 'agent_manage get_log',
          command: 'not called during MVP probe',
          requiresBinding: true,
          parseFormat: 'none',
          failureMode: 'explicit user request required; may contain transcripts/log bodies',
          privacyClass: 'transcript',
          observation: 'unavailable',
          status: 'unavailable'
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
