import Foundation
import RPCodeCore

private let controlPlaneContextId = "0D1D0428-949A-485F-A3B0-6924EE9EC5CF"
private let secondaryWorkspaceContextId = "28680F75-90F5-4E72-ADA9-6710165CB25C"
private let controlPlaneRepoPath = "/workspace/RepoPrompt-control-plane"

func liveWindowsParserHandlesJsonAndTextFixture() throws {
    let windows = parseWindowsOutput(try fixtureText("rp-windows.txt"))
    let controlPlane = try require(windows.first { $0.workspace == "RepoPrompt-control-plane" }, "text fixture should include control plane workspace")

    try check(windows.count == 5, "text windows parser should find five windows")
    try check(controlPlane.id == 12, "text windows parser should preserve observed window id")
    try check(controlPlane.repoPath == controlPlaneRepoPath, "text windows parser should parse repo path")
    try check(controlPlane.tabs.first?.contextId == controlPlaneContextId, "text windows parser should parse active context id")

    let rawJson = #"{"windows":[{"window_id":12,"workspace":{"id":"workspace-control-plane","name":"RepoPrompt-control-plane"},"active_context_id":"ctx-active","tabs":[{"name":"T1","context_id":"ctx-active","repo_paths":["/workspace/RepoPrompt-control-plane"]}]}]}"#
    let parsedJson = parseWindowsOutput(rawJson)
    try check(parsedJson.count == 1, "raw JSON windows parser should find one window")
    try check(parsedJson[0].workspaceId == "workspace-control-plane", "raw JSON windows parser should read nested workspace id")
    try check(parsedJson[0].repoPaths == [controlPlaneRepoPath], "raw JSON windows parser should read tab repo paths")
    try check(parsedJson[0].tabs[0].active, "raw JSON windows parser should mark active tab")
}

func liveSessionParserHandlesJsonMetadataAndMarkdownRows() throws {
    let sessions = parseAgentSessions(#"{"sessions":[{"session_id":"child-session","title":"Child executor","status":"waiting","model_id":"Codex","progress":0.5,"parent_session_id":"parent-session","workflow_id":"workflow-1","agent_role":"executor","metadata":{"attempt":2,"nested":{"ignored":true}}}]}"#)
    let session = try require(sessions.first, "JSON session parser should return session")
    try check(session.id == "child-session", "JSON session parser should read session_id")
    try check(session.state == .waitingForInput, "JSON session parser should normalize waiting state")
    try check(session.model == "Codex", "JSON session parser should read model_id")
    try check(session.progress == 0.5, "JSON session parser should read progress")
    try check(session.parentSessionId == "parent-session", "JSON session parser should preserve hierarchy")
    try check(session.workflowId == "workflow-1", "JSON session parser should preserve workflow id")
    try check(session.metadata?["role"] == .string("executor"), "JSON session parser should copy role metadata")
    try check(session.metadata?["attempt"] == .number(2), "JSON session parser should copy scalar metadata")
    try check(session.metadata?["nested"] == nil, "JSON session parser should drop nested metadata")

    let markdown = parseAgentSessions("- Live mode session · `550E8400-E29B-41D4-A716-446655440000` · running · codexExec")
    try check(markdown.first?.id == "550E8400-E29B-41D4-A716-446655440000", "markdown session parser should read id")
    try check(markdown.first?.title == "Live mode session", "markdown session parser should read title")
    try check(markdown.first?.state == .running, "markdown session parser should read state")
    try check(markdown.first?.model == "codexExec", "markdown session parser should read model")
}

func liveBindingPlannerCoversTargetedReadOnlyAttempts() throws {
    let windows = parseWindowsOutput(try fixtureText("rp-windows.txt"))
    let targets = deriveBindingTargets(windows: windows, currentWorkingDirectory: controlPlaneRepoPath)
    let attempts = buildListSessionAttempts(windows: windows, currentWorkingDirectory: controlPlaneRepoPath)

    try check(targets.first?.kind == .workspaceRoots, "binding planner should prioritize workspace roots")
    try check(targets.first?.repoPaths?.first == controlPlaneRepoPath, "workspace target should prefer current repo path")
    try check(targets.contains { $0.kind == .context && $0.contextId == controlPlaneContextId }, "binding planner should include active context selector")
    try check(targets.contains { $0.kind == .window && $0.windowId == 12 }, "binding planner should include window selector")
    try check(attempts.first?.id == "unbound", "session attempts should start unbound")
    try check(attempts.dropFirst().first?.id.hasPrefix("window-hidden:") == true, "session attempts should try hidden _windowID before public selectors")
    try check(attempts.filter { $0.id.hasPrefix("window-hidden:") }.count <= MAX_TARGETED_SESSION_ATTEMPTS, "hidden window attempts should be bounded")
    try check(attempts.count <= 1 + MAX_TARGETED_SESSION_ATTEMPTS + MAX_TARGETED_SESSION_ATTEMPTS, "targeted attempts should be bounded")

    for attempt in attempts {
        try RpCliCommandValidator.validate(args: attempt.args)
    }

    let payloads = attempts.compactMap { decodePayload($0.args) }
    try check(payloads.contains { ($0["_windowID"] as? NSNumber)?.intValue == 12 || ($0["_windowID"] as? Int) == 12 }, "attempts should include hidden window id selector")
    try check(payloads.contains { $0["context_id"] as? String == controlPlaneContextId }, "attempts should include context selector")
    try check(payloads.contains { (($0["working_dirs"] as? [String]) ?? []).contains(controlPlaneRepoPath) }, "attempts should include workspace roots selector")
}

func liveProviderFallsBackBindsAndBuildsCapabilities() async throws {
    let windowsOutput = try fixtureText("rp-windows.txt")
    let runner = RecordingRunner { args in
        if args.contains("--help") { return RpCliCommandResult(stdout: "RepoPrompt MCP CLI", stderr: "", exitCode: 0) }
        if args.contains("--raw-json") { return RpCliCommandResult(stdout: "", stderr: "raw json unsupported", exitCode: 1) }
        if args.contains("windows") { return RpCliCommandResult(stdout: windowsOutput, stderr: "", exitCode: 0) }
        let payload = decodePayload(args) ?? [:]
        if payload["context_id"] as? String == controlPlaneContextId {
            return RpCliCommandResult(stdout: #"{"sessions":[{"id":"s1","title":"Live session","status":"running"}]}"#, stderr: "", exitCode: 0)
        }
        return RpCliCommandResult(stdout: "", stderr: "Multiple RepoPrompt windows detected. Bind your connection to route tool calls.", exitCode: 1)
    }

    let provider = RpCliLiveProvider(rpCliPath: "rp-cli", runner: runner, now: { "2026-04-28T00:00:00Z" }, currentWorkingDirectory: { controlPlaneRepoPath })
    let snapshot = try await provider.collectSnapshot()

    try check(snapshot.windows.count == 5, "provider should parse text windows fallback")
    try check(snapshot.sessions == [AgentSession(id: "s1", title: "Live session", workspace: "RepoPrompt-control-plane", state: .running, observation: .observed)], "provider should recover with targeted binding and attach workspace")
    let windowsCapability = try require(snapshot.capabilities.first { $0.field == "windows" }, "windows capability should exist")
    try check(windowsCapability.command == "rp-cli -e 'windows'", "windows capability should report fallback command")
    try check(windowsCapability.parseFormat == .text, "windows capability should report text parse fallback")
    let sessionsCapability = try require(snapshot.capabilities.first { $0.field == "agentSessionStates" }, "session capability should exist")
    try check(sessionsCapability.status == .available && sessionsCapability.observation == .observed, "session capability should be observed when binding succeeds")
    let logsCapability = try require(snapshot.capabilities.first { $0.field == "agentLogs" }, "agentLogs capability should exist")
    try check(logsCapability.status == .unavailable && logsCapability.privacyClass == .transcript, "agentLogs should stay unavailable and transcript-classed")
    try check(!runner.calls.contains { $0.joined(separator: " ").contains("get_log") }, "provider must not call log/transcript commands")
}

func liveProviderBuildsDiagnosticSnapshotsForFailures() async throws {
    let missingRunner = RecordingRunner { _ in RpCliCommandResult(stdout: "", stderr: "spawn rp-cli ENOENT", exitCode: 1) }
    let missingSnapshot = try await RpCliLiveProvider(runner: missingRunner, now: { "2026-04-28T00:00:00Z" }).collectSnapshot()
    try check(missingSnapshot.windows.isEmpty, "missing rp-cli should produce empty snapshot")
    try check(missingSnapshot.summarySource == .unavailable, "missing rp-cli should mark summary unavailable")
    try check(missingSnapshot.diagnostics.contains { $0.code == "rp_cli_unavailable" && $0.severity == .error }, "missing rp-cli should emit diagnostic")

    let driftRunner = RecordingRunner { args in
        if args.contains("--help") { return RpCliCommandResult(stdout: "RepoPrompt MCP CLI", stderr: "", exitCode: 0) }
        if args.contains("windows") { return RpCliCommandResult(stdout: "", stderr: "", exitCode: 0) }
        return RpCliCommandResult(stdout: "not json", stderr: "", exitCode: 0)
    }
    let driftSnapshot = try await RpCliLiveProvider(runner: driftRunner, now: { "2026-04-28T00:00:00Z" }).collectSnapshot()
    try check(driftSnapshot.capabilities.first { $0.field == "agentSessionStates" }?.status == .unavailable, "parse drift should mark sessions unavailable")
    try check(driftSnapshot.diagnostics.contains { $0.code == "agent_sessions_parse_drift" }, "parse drift should emit diagnostic")
}

private final class RecordingRunner: RpCliSubprocessRunner, @unchecked Sendable {
    private let handler: @Sendable ([String]) -> RpCliCommandResult
    private(set) var calls: [[String]] = []

    init(handler: @escaping @Sendable ([String]) -> RpCliCommandResult) {
        self.handler = handler
    }

    func run(executable: String, args: [String], timeout: TimeInterval) async -> RpCliCommandResult {
        calls.append(args)
        return handler(args)
    }
}

private func fixtureText(_ name: String) throws -> String {
    var url = URL(fileURLWithPath: #filePath)
    for _ in 0..<3 { url.deleteLastPathComponent() }
    url.appendPathComponent("test/fixtures/\(name)")
    return try String(contentsOf: url, encoding: .utf8)
}

private func decodePayload(_ args: [String]) -> [String: Any]? {
    guard let index = args.firstIndex(of: "-j"), args.indices.contains(index + 1) else { return nil }
    guard let data = args[index + 1].data(using: .utf8) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
}
