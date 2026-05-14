import Foundation
import RepoPromptCockpitCore

func dashboardDomainMatchesTypeScriptParity() throws {
    let generatedAt = "2026-05-14T00:00:00Z"
    let snapshot = ControlPlaneSnapshot(
        generatedAt: generatedAt,
        provider: .rpCli,
        windows: [
            RepoPromptWindow(
                id: 1,
                workspace: "Repo",
                repoPath: "/repo",
                activeContextId: "ctx-a",
                tabs: [
                    RepoPromptTab(name: "Main", contextId: "ctx-a", active: true, observation: .observed),
                    RepoPromptTab(name: "Review", contextId: "ctx-b", active: false, observation: .observed)
                ],
                observation: .observed
            ),
            RepoPromptWindow(
                id: 2,
                workspace: "Repo",
                repoPath: "/repo",
                activeContextId: "ctx-c",
                tabs: [RepoPromptTab(name: "T2", contextId: "ctx-c", active: true, observation: .observed)],
                observation: .observed
            )
        ],
        sessions: [
            AgentSession(id: "parent", title: "Parent", workspace: "Repo", state: .running, model: "GPT 5", progress: 0.4, updatedAt: generatedAt, observation: .observed, summary: "Parent summary", workflowId: "wf", metadata: ["role": .string("orchestrator")]),
            AgentSession(id: "child", title: "Child", workspace: "Repo", state: .waitingForInput, model: "Codex", progress: 0.5, updatedAt: generatedAt, observation: .observed, parentSessionId: "parent", workflowId: "wf", metadata: ["role": .string("executor")]),
            AgentSession(id: "inferred-a", title: "Inferred A", workspace: "Repo", state: .completed, observation: .inferred, workflowId: "wf-inferred"),
            AgentSession(id: "inferred-b", title: "Inferred B", workspace: "Repo", state: .idle, observation: .inferred, workflowId: "wf-inferred"),
            AgentSession(id: "orphan", title: "Orphan", workspace: "Other", state: .unknown, observation: .observed, parentSessionId: "missing")
        ],
        capabilities: [CapabilityMatrixEntry(field: "windows", source: "rp-cli", requiresBinding: false, parseFormat: .json, failureMode: "none", privacyClass: .metadata, observation: .observed, status: .available)],
        diagnostics: [ProviderDiagnostic(code: "warn", message: "warning", severity: .warning, observedAt: generatedAt)],
        summarySource: .observed
    )

    let counts = deriveStatusCounts(from: snapshot)
    try check(counts.workspaces == 1, "workspace counts should de-duplicate windows by workspace")
    try check(counts.completed == 1 && counts.idle == 1 && counts.unknown == 1, "status counts should include completed/idle/unknown parity")

    let attention = deriveAttentionItems(from: snapshot)
    try check(attention.map(\.id).contains("inferred-a"), "completed sessions remain visible as lower-priority attention")
    try check(attention.map(\.id).contains("inferred-b"), "idle sessions remain visible as lower-priority attention")
    try check(attention.map(\.id).contains("orphan"), "unknown sessions remain visible as lower-priority attention")
    try check(attention.first?.id == "child", "waiting-for-input should still be highest session priority")
    try check(attention.first?.detail.contains("50%") == true, "attention detail should include progress percentage")

    let implementation = deriveImplementationItems(from: snapshot)
    let childItem = try require(implementation.first { $0.id == "child" }, "child implementation item should exist")
    try check(childItem.state == .waitingForInput, "implementation item should expose state")
    try check(childItem.progress == 0.5, "implementation item should expose progress")
    try check(childItem.workspace == "Repo", "implementation item should expose workspace")
    try check(childItem.model == "Codex", "implementation item should expose model")

    let workspaces = deriveWorkspaceViews(from: snapshot)
    try check(workspaces.count == 1, "workspace views should group multiple windows by workspace")
    try check(workspaces.first?.windowIds.sorted() == [1, 2], "workspace view should keep all window ids")
    try check(workspaces.first?.contextTabs.first?.contextId == "ctx-a", "active context tabs should sort first")

    let groups = deriveSessionGroups(from: snapshot)
    try check(groups.map(\.workspace) == ["Other", "Repo"], "session groups should sort by workspace and include unscoped workspaces")

    let tree = deriveSessionTreeView(from: snapshot)
    try check(tree.mode == .observed, "explicit parent links should mark observed tree mode")
    let parent = try require(tree.roots.first { $0.id == "parent" }, "parent should be root")
    try check(parent.children.map(\.id).contains("child"), "explicit child should attach under observed parent")
    let inferred = try require(tree.roots.first { $0.id == "inferred-a" }, "first workflow member should become inferred parent")
    try check(inferred.children.map(\.id).contains("inferred-b"), "workflow metadata should infer child relationship")
    try check(tree.roots.contains { $0.id == "orphan" }, "orphaned parent ids should not make sessions disappear")

    let dashboard = createControlPlaneDashboard(snapshot: snapshot)
    try check(dashboard.activityPanel.tabs.map(\.key) == [.plan, .activity, .artifacts, .logs, .results], "activity panel should expose all TS workflow tabs")
    try check(dashboard.privacyBanner.label == "Read-only cockpit", "privacy banner should be present")
    try check(dashboard.capabilityRows.first?.field == "windows", "capability rows should be projected")
}

func dashboardPlaceholdersMatchTypeScriptParity() throws {
    let generatedAt = "2026-05-14T00:00:00Z"
    let windowsOnly = ControlPlaneSnapshot(
        generatedAt: generatedAt,
        provider: .rpCli,
        windows: [RepoPromptWindow(id: 1, workspace: "Repo", tabs: [], observation: .observed)],
        sessions: [],
        capabilities: [],
        diagnostics: [],
        summarySource: .observed
    )
    let windowsPlaceholder = try require(deriveImplementationItems(from: windowsOnly).first, "windows placeholder should exist")
    try check(windowsPlaceholder.id == "unavailable-session-state", "windows-only snapshot should use session-state unavailable placeholder")
    try check(deriveAttentionItems(from: windowsOnly).first?.id == "workspace-context-only", "windows-only attention should use workspace fallback")

    let noActivity = ControlPlaneSnapshot(
        generatedAt: generatedAt,
        provider: .rpCli,
        windows: [],
        sessions: [],
        capabilities: [],
        diagnostics: [ProviderDiagnostic(code: "boom", message: "rp-cli missing", severity: .error, observedAt: generatedAt)],
        summarySource: .unavailable
    )
    let noActivityPlaceholder = try require(deriveImplementationItems(from: noActivity).first, "no-activity placeholder should exist")
    try check(noActivityPlaceholder.id == "no-repoprompt-activity", "empty snapshot should use no-activity placeholder")
    try check(noActivityPlaceholder.detail == "rp-cli missing", "empty placeholder should prefer diagnostic error detail")
    try check(deriveAttentionItems(from: noActivity).contains { $0.id == "no-actionable-data" }, "empty attention should include no-actionable fallback")
}
