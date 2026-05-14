import Foundation

public struct DemoFixtureProvider: RepoPromptProvider {
    public let name: ProviderIdentity = .demoFixture
    private let now: @Sendable () -> String

    public init(now: @escaping @Sendable () -> String = { ISO8601DateFormatter().string(from: Date()) }) {
        self.now = now
    }

    public func collectSnapshot() async throws -> ControlPlaneSnapshot {
        let generatedAt = now()
        return ControlPlaneSnapshot(
            generatedAt: generatedAt,
            provider: name,
            windows: [
                RepoPromptWindow(
                    id: 101,
                    workspace: "RepoPrompt-control-plane",
                    workspaceId: "fixture-workspace-control-plane",
                    repoPath: "/workspace/RepoPrompt-control-plane",
                    repoPaths: ["/workspace/RepoPrompt-control-plane"],
                    activeContextId: "fixture-context-control-plane",
                    tabs: [
                        RepoPromptTab(name: "T1", contextId: "fixture-context-control-plane", active: true, observation: .fixture),
                        RepoPromptTab(name: "Publish plan context", contextId: "fixture-context-publish-plan", active: false, observation: .fixture)
                    ],
                    observation: .fixture
                )
            ],
            sessions: [
                AgentSession(
                    id: "fixture-orchestrator-parent",
                    title: "Orchestration Run: Cockpit S-tier",
                    workspace: "RepoPrompt-control-plane",
                    state: .running,
                    model: "Codex 5.3",
                    progress: 0.75,
                    updatedAt: generatedAt,
                    observation: .fixture,
                    summary: "Parent orchestration run coordinating parallel sub-agents.",
                    workflowId: "wf-control-plane-001",
                    metadata: ["role": .string("orchestrator")]
                ),
                AgentSession(
                    id: "fixture-child-dashboard-tree",
                    title: "Sub-agent: dashboard tree derivation",
                    workspace: "RepoPrompt-control-plane",
                    state: .running,
                    model: "Claude Sonnet 4.6",
                    progress: 0.9,
                    updatedAt: generatedAt,
                    observation: .fixture,
                    summary: "Revamp session hierarchy derivation and review visual deltas.",
                    parentSessionId: "fixture-orchestrator-parent",
                    workflowId: "wf-control-plane-001",
                    metadata: ["role": .string("executor")]
                ),
                AgentSession(
                    id: "fixture-child-security-review",
                    title: "Sub-agent: security review",
                    workspace: "RepoPrompt-control-plane",
                    state: .blocked,
                    model: "Opus 4.7",
                    progress: 0.6,
                    updatedAt: generatedAt,
                    observation: .fixture,
                    summary: "Blocked while waiting for dependency audit output.",
                    parentSessionId: "fixture-orchestrator-parent",
                    workflowId: "wf-control-plane-001",
                    metadata: ["role": .string("security-reviewer")]
                ),
                AgentSession(
                    id: "fixture-release-gate",
                    title: "Release Gate",
                    workspace: "RepoPrompt-control-plane",
                    state: .waitingForInput,
                    model: "Sonnet 4.6",
                    progress: 0.95,
                    updatedAt: generatedAt,
                    observation: .fixture,
                    summary: "Needs user approval before publishing the verified build."
                ),
                AgentSession(
                    id: "fixture-docs-update",
                    title: "Documentation Update",
                    workspace: "RepoPrompt-control-plane",
                    state: .completed,
                    model: "GPT-5.5",
                    progress: 1,
                    updatedAt: generatedAt,
                    observation: .fixture,
                    summary: "Demo script and setup notes are complete."
                )
            ],
            capabilities: [
                CapabilityMatrixEntry(field: "windows", source: "fixture", requiresBinding: false, parseFormat: .fixture, failureMode: "none", privacyClass: .metadata, observation: .fixture, status: .available),
                CapabilityMatrixEntry(field: "agentSessionStates", source: "fixture", requiresBinding: false, parseFormat: .fixture, failureMode: "none", privacyClass: .metadata, observation: .fixture, status: .available),
                CapabilityMatrixEntry(field: "agentLogs", source: "agent_manage get_log", command: "not called during MVP probe", requiresBinding: true, parseFormat: .none, failureMode: "explicit user request required; may contain transcripts/log bodies", privacyClass: .transcript, observation: .unavailable, status: .unavailable),
                CapabilityMatrixEntry(field: "copySummary", source: "local deterministic summary", requiresBinding: false, parseFormat: .none, failureMode: "none", privacyClass: .metadata, observation: .fixture, status: .available)
            ],
            diagnostics: [
                ProviderDiagnostic(code: "fixture_mode", message: "DemoFixtureProvider is active; all session data is fixture-backed.", severity: .info, observedAt: generatedAt)
            ],
            summarySource: .fixture
        )
    }
}
