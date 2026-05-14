import Foundation

public let RP_CLI_LIST_SESSIONS_LIMIT = 20
public let MAX_TARGETED_SESSION_ATTEMPTS = 8

public struct RpCliCommandResult: Equatable, Sendable {
    public var stdout: String
    public var stderr: String
    public var exitCode: Int32

    public init(stdout: String, stderr: String, exitCode: Int32) {
        self.stdout = stdout
        self.stderr = stderr
        self.exitCode = exitCode
    }
}

public protocol RpCliSubprocessRunner: Sendable {
    func run(executable: String, args: [String], timeout: TimeInterval) async -> RpCliCommandResult
}

public struct ProcessRpCliSubprocessRunner: RpCliSubprocessRunner {
    public init() {}

    public func run(executable: String, args: [String], timeout: TimeInterval = 8) async -> RpCliCommandResult {
        await Task.detached(priority: .utility) {
            let process = Process()
            let stdout = Pipe()
            let stderr = Pipe()
            process.executableURL = URL(fileURLWithPath: executable)
            process.arguments = args
            process.standardOutput = stdout
            process.standardError = stderr

            do {
                try process.run()
            } catch {
                return RpCliCommandResult(stdout: "", stderr: String(describing: error), exitCode: 1)
            }

            let deadline = Date().addingTimeInterval(timeout)
            while process.isRunning && Date() < deadline {
                usleep(20_000)
            }
            if process.isRunning {
                process.terminate()
                return RpCliCommandResult(stdout: readPipe(stdout), stderr: readPipe(stderr) + "\nCommand timed out.", exitCode: 124)
            }

            return RpCliCommandResult(stdout: readPipe(stdout), stderr: readPipe(stderr), exitCode: process.terminationStatus)
        }.value
    }
}

private func readPipe(_ pipe: Pipe) -> String {
    String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
}

public struct RpCliLiveProvider: RepoPromptProvider {
    public let name: ProviderIdentity = .rpCli
    private let rpCliPath: String
    private let runner: RpCliSubprocessRunner
    private let now: @Sendable () -> String
    private let currentWorkingDirectory: @Sendable () -> String
    private let timeout: TimeInterval

    public init(
        rpCliPath: String = "rp-cli",
        runner: RpCliSubprocessRunner = ProcessRpCliSubprocessRunner(),
        now: @escaping @Sendable () -> String = { ISO8601DateFormatter().string(from: Date()) },
        currentWorkingDirectory: @escaping @Sendable () -> String = { FileManager.default.currentDirectoryPath },
        timeout: TimeInterval = 8
    ) {
        self.rpCliPath = rpCliPath
        self.runner = runner
        self.now = now
        self.currentWorkingDirectory = currentWorkingDirectory
        self.timeout = timeout
    }

    public func collectSnapshot() async throws -> ControlPlaneSnapshot {
        let generatedAt = now()
        var diagnostics: [ProviderDiagnostic] = []
        var statuses: [String: CapabilityStatus] = [:]

        let help = await runReadOnly(["--help"])
        statuses["rpCliHelp"] = help.exitCode == 0 ? .available : .error
        if help.exitCode != 0 {
            diagnostics.append(diagnostic(code: "rp_cli_unavailable", message: describeFailure(help.stderr + "\n" + help.stdout), severity: .error, observedAt: generatedAt, command: "rp-cli --help"))
            return emptySnapshot(generatedAt: generatedAt, statuses: statuses, diagnostics: diagnostics)
        }

        var windowsCommand = "rp-cli -e 'windows' --raw-json"
        var windowsParseFormat: ParseFormat = .json
        var windowsResult = await runReadOnly(["-e", "windows", "--raw-json"])
        if windowsResult.exitCode != 0 {
            windowsCommand = "rp-cli -e 'windows'"
            windowsParseFormat = .text
            windowsResult = await runReadOnly(["-e", "windows"])
        }

        statuses["windows"] = windowsResult.exitCode == 0 ? .available : .error
        let windows = windowsResult.exitCode == 0 ? parseWindowsOutput(windowsResult.stdout) : []
        if windowsResult.exitCode != 0 {
            diagnostics.append(diagnostic(code: "windows_unavailable", message: describeFailure(windowsResult.stderr + "\n" + windowsResult.stdout), severity: .warning, observedAt: generatedAt, command: windowsCommand))
        } else if windowsResult.stdout.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || windows.isEmpty {
            diagnostics.append(diagnostic(code: "windows_parse_drift", message: "rp-cli windows output did not contain recognized window records.", severity: .warning, observedAt: generatedAt, command: windowsCommand))
        }

        let sessionResult = await collectSessionsWithBindingTargets(windows: windows, generatedAt: generatedAt)
        statuses["agentSessionStates"] = sessionResult.status
        if let diagnostic = sessionResult.diagnostic { diagnostics.append(diagnostic) }
        statuses["agentLogs"] = .unavailable
        statuses["copySummary"] = .available

        return ControlPlaneSnapshot(
            generatedAt: generatedAt,
            provider: name,
            windows: windows,
            sessions: sessionResult.sessions,
            capabilities: buildRpCliCapabilities(statuses: statuses, windowsCommand: windowsCommand, windowsParseFormat: windowsParseFormat),
            diagnostics: diagnostics,
            summarySource: .observed
        )
    }

    private func collectSessionsWithBindingTargets(windows: [RepoPromptWindow], generatedAt: String) async -> SessionCollectionResult {
        let attempts = buildListSessionAttempts(windows: windows, currentWorkingDirectory: currentWorkingDirectory())
        var sessionsById: [String: AgentSession] = [:]
        var orderedIds: [String] = []
        var firstFailure: (code: String, output: String)?
        var lastFailure: (code: String, output: String)?
        var parseFailure: (code: String, output: String)?
        var successfulEmptyAttempt = false
        var attemptedCount = 0

        for attempt in attempts {
            attemptedCount += 1
            let result = await runReadOnly(attempt.args)
            if result.exitCode == 0 {
                let parsed = parseAgentSessionsPayload(result.stdout)
                guard parsed.ok else {
                    if parseFailure == nil { parseFailure = ("agent_sessions_parse_drift", parsed.error ?? result.stdout) }
                    continue
                }
                if parsed.sessions.isEmpty { successfulEmptyAttempt = true }
                for var session in parsed.sessions where sessionsById[session.id] == nil {
                    session.workspace = session.workspace ?? attempt.target?.workspace
                    session.observation = .observed
                    sessionsById[session.id] = session
                    orderedIds.append(session.id)
                }
                continue
            }

            let output = result.stderr + "\n" + result.stdout
            let code = classifySessionFailure(output)
            if firstFailure == nil { firstFailure = (code, output) }
            lastFailure = (code, output)
            if code == "repoprompt_socket_permission_denied" { break }
            if !isRetryableSessionFailure(code) { break }
        }

        if !orderedIds.isEmpty || successfulEmptyAttempt {
            return SessionCollectionResult(sessions: orderedIds.compactMap { sessionsById[$0] }, status: .available, diagnostic: nil)
        }

        let failure = firstFailure ?? lastFailure ?? parseFailure
        return SessionCollectionResult(
            sessions: [],
            status: .unavailable,
            diagnostic: diagnostic(
                code: failure?.code ?? "agent_sessions_unavailable",
                message: "\(describeFailure(failure?.output ?? "")) Attempted \(attemptedCount) read-only list_sessions binding strateg\(attemptedCount == 1 ? "y" : "ies").",
                severity: .warning,
                observedAt: generatedAt,
                command: "rp-cli -c agent_manage -j {op:list_sessions}"
            )
        )
    }

    private func runReadOnly(_ args: [String]) async -> RpCliCommandResult {
        do {
            try RpCliCommandValidator.validate(args: args)
        } catch {
            return RpCliCommandResult(stdout: "", stderr: String(describing: error), exitCode: 1)
        }
        return await runner.run(executable: rpCliPath, args: args, timeout: timeout)
    }

    private func emptySnapshot(generatedAt: String, statuses: [String: CapabilityStatus], diagnostics: [ProviderDiagnostic]) -> ControlPlaneSnapshot {
        var merged = statuses
        merged["windows"] = .unavailable
        merged["agentSessionStates"] = .unavailable
        merged["agentLogs"] = .unavailable
        merged["copySummary"] = .available
        return ControlPlaneSnapshot(generatedAt: generatedAt, provider: name, windows: [], sessions: [], capabilities: buildRpCliCapabilities(statuses: merged), diagnostics: diagnostics, summarySource: .unavailable)
    }

    private func diagnostic(code: String, message: String, severity: DiagnosticSeverity, observedAt: String, command: String?) -> ProviderDiagnostic {
        ProviderDiagnostic(code: code, message: message, severity: severity, observedAt: observedAt, command: command)
    }
}

private struct SessionCollectionResult: Sendable {
    var sessions: [AgentSession]
    var status: CapabilityStatus
    var diagnostic: ProviderDiagnostic?
}

private struct ParsedSessionResult: Sendable {
    var ok: Bool
    var sessions: [AgentSession]
    var error: String?
}

public enum BindingTargetKind: String, Equatable, Sendable {
    case workspaceRoots = "workspace_roots"
    case context
    case window
}

public struct BindingTarget: Equatable, Sendable {
    public var id: String
    public var kind: BindingTargetKind
    public var workspace: String?
    public var windowId: Int?
    public var repoPaths: [String]?
    public var contextId: String?
    public var tabName: String?

    public init(id: String, kind: BindingTargetKind, workspace: String? = nil, windowId: Int? = nil, repoPaths: [String]? = nil, contextId: String? = nil, tabName: String? = nil) {
        self.id = id
        self.kind = kind
        self.workspace = workspace
        self.windowId = windowId
        self.repoPaths = repoPaths
        self.contextId = contextId
        self.tabName = tabName
    }
}

public struct ListSessionsAttempt: Equatable, Sendable {
    public var id: String
    public var label: String
    public var args: [String]
    public var target: BindingTarget?

    public init(id: String, label: String, args: [String], target: BindingTarget? = nil) {
        self.id = id
        self.label = label
        self.args = args
        self.target = target
    }
}

public func parseWindowsOutput(_ output: String) -> [RepoPromptWindow] {
    if let rawJson = parseRawJsonWindows(output) { return rawJson }
    var windows: [RepoPromptWindow] = []
    var currentIndex: Int?

    for line in output.components(separatedBy: .newlines) {
        if let match = firstRegexMatch(#"^- Window `(\d+)` • workspace: (.*?) • (\d+) tabs?"#, in: line), match.count >= 3, let id = Int(match[1]) {
            windows.append(RepoPromptWindow(id: id, workspace: nonEmpty(match[2]) ?? "Unknown", tabs: [], observation: .observed))
            currentIndex = windows.indices.last
            continue
        }
        guard let index = currentIndex else { continue }
        if let match = firstRegexMatch(#"^\s*repo: `(.*?)`"#, in: line), match.count >= 2 {
            windows[index].repoPath = match[1]
            continue
        }
        if let match = firstRegexMatch(#"^\s*• active: (.*?) — context_id: `(.*?)`"#, in: line), match.count >= 3 {
            let contextId = nonEmpty(match[2])
            windows[index].activeContextId = contextId
            windows[index].tabs.append(RepoPromptTab(name: nonEmpty(match[1]) ?? "Untitled", contextId: contextId, active: true, observation: .observed))
        }
    }
    return windows
}

private func parseRawJsonWindows(_ output: String) -> [RepoPromptWindow]? {
    let trimmed = output.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty, trimmed.hasPrefix("{") || trimmed.hasPrefix("[") else { return nil }
    guard let data = trimmed.data(using: .utf8), let parsed = try? JSONSerialization.jsonObject(with: data) else { return nil }
    guard let records = extractRecords(parsed, keys: ["windows", "items", "results", "data"]) else { return nil }

    return records.enumerated().map { index, record in
        let id = readInt(record, ["window_id", "windowId", "id"]) ?? index + 1
        let workspaceRecord = record["workspace"] as? [String: Any]
        let workspace = readString(record, ["workspace_name", "workspaceName", "name"])
            ?? readString(workspaceRecord, ["name", "workspace_name", "workspaceName"])
            ?? ((record["workspace"] as? String).flatMap(nonEmpty))
            ?? "Unknown"
        let workspaceId = readString(record, ["workspace_id", "workspaceId"]) ?? readString(workspaceRecord, ["id", "workspace_id", "workspaceId"])
        let activeContextId = readString(record, ["active_context_id", "activeContextId"])
        let tabs = readTabs(record, activeContextId: activeContextId)
        let tabRecords = (record["tabs"] as? [[String: Any]]) ?? []
        let repoPaths = unique(readStringArray(record, ["repo_paths", "repoPaths", "repos"]) + tabRecords.flatMap { readStringArray($0, ["repo_paths", "repoPaths"]) })
        let repoPath = readString(record, ["repo_path", "repoPath", "repo"]) ?? repoPaths.first
        return RepoPromptWindow(id: id, workspace: workspace, workspaceId: workspaceId, repoPath: repoPath, repoPaths: repoPaths.isEmpty ? nil : repoPaths, activeContextId: activeContextId, tabs: tabs, observation: .observed)
    }
}

private func readTabs(_ record: [String: Any], activeContextId: String?) -> [RepoPromptTab] {
    let rawTabs = (record["tabs"] as? [[String: Any]]) ?? []
    return rawTabs.enumerated().map { index, tab in
        let contextId = readString(tab, ["context_id", "contextId", "id"])
        let name = readString(tab, ["name", "title", "tab_name", "tabName"]) ?? "Tab \(index + 1)"
        let active = readBool(tab, ["is_active", "isActive", "active"]) ?? (contextId != nil && contextId == activeContextId)
        return RepoPromptTab(name: name, contextId: contextId, active: active, observation: .observed)
    }
}

public func parseAgentSessions(_ output: String) -> [AgentSession] {
    let parsed = parseAgentSessionsPayload(output)
    return parsed.ok ? parsed.sessions : []
}

private func parseAgentSessionsPayload(_ output: String) -> ParsedSessionResult {
    let trimmed = output.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return ParsedSessionResult(ok: false, sessions: [], error: "agent_manage list_sessions returned no output.") }

    let markdownRows = parseMarkdownSessionRows(trimmed)
    if !markdownRows.isEmpty {
        let sessions = markdownRows.enumerated().map { index, row in
            AgentSession(id: row.id.isEmpty ? "session-\(index + 1)" : row.id, title: row.title.isEmpty ? "Session \(index + 1)" : row.title, state: normalizeSessionState(row.state), model: row.model, observation: .observed)
        }
        return ParsedSessionResult(ok: true, sessions: sessions, error: nil)
    }

    guard let data = trimmed.data(using: .utf8), let parsed = try? JSONSerialization.jsonObject(with: data) else {
        return ParsedSessionResult(ok: false, sessions: [], error: "agent_manage list_sessions returned malformed JSON.")
    }
    guard let records = extractRecords(parsed, keys: ["sessions", "agent_sessions", "items", "results", "snapshots", "data"]) else {
        return ParsedSessionResult(ok: false, sessions: [], error: "agent_manage list_sessions JSON did not contain a recognized sessions array.")
    }

    return ParsedSessionResult(ok: true, sessions: records.enumerated().map { index, record in
        AgentSession(
            id: readString(record, ["session_id", "sessionId", "id"]) ?? "session-\(index + 1)",
            title: readString(record, ["title", "name", "session_name", "sessionName"]) ?? "Session \(index + 1)",
            workspace: readString(record, ["workspace", "workspaceName", "workspace_name", "repo", "repoPath"]),
            state: normalizeSessionState(readString(record, ["state", "status"]) ?? "unknown"),
            model: readString(record, ["model", "model_id", "modelId"]),
            progress: readDouble(record, ["progress"]),
            updatedAt: readString(record, ["updated_at", "updatedAt", "lastActivityAt"]),
            observation: .observed,
            parentSessionId: readString(record, ["parentSessionId", "parent_session_id", "parentId", "parent_id", "parent"]),
            workflowId: readString(record, ["workflowId", "workflow_id", "workflow", "runId", "run_id"]),
            metadata: readSessionMetadata(record)
        )
    }, error: nil)
}

public func deriveBindingTargets(windows: [RepoPromptWindow], currentWorkingDirectory: String = FileManager.default.currentDirectoryPath) -> [BindingTarget] {
    let rankedWindows = windows.sorted { bindingRank($0, currentWorkingDirectory: currentWorkingDirectory) > bindingRank($1, currentWorkingDirectory: currentWorkingDirectory) }
    var targets: [BindingTarget] = []
    var seen = Set<String>()
    let repoPaths = unique(rankedWindows.compactMap { nonEmpty($0.repoPath) })

    if !repoPaths.isEmpty {
        let id = "workspace_roots:\(repoPaths.sorted().joined(separator: "|"))"
        seen.insert(id)
        targets.append(BindingTarget(id: id, kind: .workspaceRoots, workspace: rankedWindows.first?.workspace, repoPaths: repoPaths))
    }

    for window in rankedWindows {
        for tab in window.tabs where tab.active && nonEmpty(tab.contextId) != nil {
            let contextId = tab.contextId!
            let id = "context:\(contextId)"
            guard !seen.contains(id) else { continue }
            seen.insert(id)
            targets.append(BindingTarget(id: id, kind: .context, workspace: window.workspace, windowId: window.id, repoPaths: window.repoPath.map { [$0] }, contextId: contextId, tabName: tab.name))
        }
    }

    for window in rankedWindows {
        let id = "window:\(window.id)"
        guard !seen.contains(id) else { continue }
        seen.insert(id)
        targets.append(BindingTarget(id: id, kind: .window, workspace: window.workspace, windowId: window.id, repoPaths: window.repoPath.map { [$0] }))
    }

    return targets
}

public func buildListSessionAttempts(windows: [RepoPromptWindow], currentWorkingDirectory: String = FileManager.default.currentDirectoryPath) -> [ListSessionsAttempt] {
    var attempts = [ListSessionsAttempt(id: "unbound", label: "unbound list_sessions", args: listSessionsArgs(["op": "list_sessions", "limit": RP_CLI_LIST_SESSIONS_LIMIT]))]
    var seenHiddenWindowIds = Set<Int>()
    let rankedWindows = windows.sorted { bindingRank($0, currentWorkingDirectory: currentWorkingDirectory) > bindingRank($1, currentWorkingDirectory: currentWorkingDirectory) }

    for window in rankedWindows.prefix(MAX_TARGETED_SESSION_ATTEMPTS) where !seenHiddenWindowIds.contains(window.id) {
        seenHiddenWindowIds.insert(window.id)
        attempts.append(ListSessionsAttempt(
            id: "window-hidden:\(window.id)",
            label: "window hidden key list_sessions",
            args: listSessionsArgs(["_windowID": window.id, "op": "list_sessions", "limit": RP_CLI_LIST_SESSIONS_LIMIT]),
            target: BindingTarget(id: "window:\(window.id)", kind: .window, workspace: window.workspace, windowId: window.id, repoPaths: window.repoPath.map { [$0] })
        ))
    }

    for target in deriveBindingTargets(windows: windows, currentWorkingDirectory: currentWorkingDirectory).prefix(MAX_TARGETED_SESSION_ATTEMPTS) {
        attempts.append(ListSessionsAttempt(id: target.id, label: "\(target.kind.rawValue) list_sessions", args: listSessionsArgs(payload(for: target)), target: target))
    }
    return attempts
}

private func payload(for target: BindingTarget) -> [String: Any] {
    switch target.kind {
    case .workspaceRoots:
        return ["op": "list_sessions", "limit": RP_CLI_LIST_SESSIONS_LIMIT, "working_dirs": target.repoPaths ?? []]
    case .context:
        return ["op": "list_sessions", "limit": RP_CLI_LIST_SESSIONS_LIMIT, "context_id": target.contextId ?? ""]
    case .window:
        return ["op": "list_sessions", "limit": RP_CLI_LIST_SESSIONS_LIMIT, "_windowID": target.windowId ?? 0]
    }
}

private func listSessionsArgs(_ payload: [String: Any]) -> [String] {
    let order = ["_windowID", "op", "limit", "working_dirs", "context_id", "window_id"]
    var ordered: [String: Any] = [:]
    for key in order where payload[key] != nil { ordered[key] = payload[key] }
    let data = (try? JSONSerialization.data(withJSONObject: ordered, options: [.sortedKeys])) ?? Data("{}".utf8)
    let json = String(data: data, encoding: .utf8) ?? "{}"
    return ["-c", "agent_manage", "-j", json]
}

public func buildRpCliCapabilities(statuses: [String: CapabilityStatus], windowsCommand: String = "rp-cli -e 'windows' --raw-json", windowsParseFormat: ParseFormat = .json) -> [CapabilityMatrixEntry] {
    let drafts: [(field: String, source: String, command: String?, requiresBinding: Bool, parseFormat: ParseFormat, failureMode: String, privacyClass: PrivacyClass, defaultStatus: CapabilityStatus?)] = [
        ("rpCliHelp", "rp-cli help text", "rp-cli --help", false, .text, "missing executable, timeout, non-zero exit", .metadata, nil),
        ("windows", "RepoPrompt window list", windowsCommand, false, windowsParseFormat, "RepoPrompt unavailable, socket permission denied, parse drift", .metadata, nil),
        ("agentSessionStates", "agent_manage list_sessions", "rp-cli -c agent_manage -j {op:list_sessions,selectors?:working_dirs|context_id|window_id}", true, .json, "multi-window binding required, socket permission denied, unsupported session scope", .metadata, nil),
        ("agentLogs", "agent_manage get_log", "not called during MVP probe", true, .none, "explicit user request required; may contain transcripts/log bodies", .transcript, .unavailable),
        ("copySummary", "local deterministic summary", nil, false, .none, "local derivation unavailable only if snapshot construction fails", .metadata, nil)
    ]

    return drafts.map { draft in
        let status = statuses[draft.field] ?? draft.defaultStatus ?? .unknown
        let observation: ObservationKind = status == .available ? .observed : (status == .unknown ? .inferred : .unavailable)
        return CapabilityMatrixEntry(field: draft.field, source: draft.source, command: draft.command, requiresBinding: draft.requiresBinding, parseFormat: draft.parseFormat, failureMode: draft.failureMode, privacyClass: draft.privacyClass, observation: observation, status: status)
    }
}

private struct MarkdownSessionRow {
    var title: String
    var id: String
    var state: String
    var model: String?
}

private func parseMarkdownSessionRows(_ output: String) -> [MarkdownSessionRow] {
    let pattern = #"^\s*-\s*(.*?)\s*·\s*`([^`]+)`\s*·\s*([^·]+?)(?:\s*·\s*(.+))?\s*$"#
    return output.components(separatedBy: .newlines).compactMap { line in
        guard let match = firstRegexMatch(pattern, in: line), match.count >= 4 else { return nil }
        return MarkdownSessionRow(title: match[1].trimmingCharacters(in: .whitespacesAndNewlines), id: match[2].trimmingCharacters(in: .whitespacesAndNewlines), state: match[3].trimmingCharacters(in: .whitespacesAndNewlines), model: match.count > 4 ? nonEmpty(match[4]) : nil)
    }
}

private func extractRecords(_ value: Any, keys: [String]) -> [[String: Any]]? {
    if let records = value as? [[String: Any]] { return records }
    guard let record = value as? [String: Any] else { return nil }
    for key in keys {
        if let records = record[key] as? [[String: Any]] { return records }
    }
    return nil
}

private func readString(_ record: [String: Any]?, _ keys: [String]) -> String? {
    guard let record else { return nil }
    for key in keys {
        if let value = record[key] as? String, let trimmed = nonEmpty(value) { return trimmed }
    }
    return nil
}

private func readInt(_ record: [String: Any], _ keys: [String]) -> Int? {
    for key in keys {
        if let value = record[key] as? Int { return value }
        if let value = record[key] as? NSNumber, CFNumberIsFloatType(value) == false { return value.intValue }
    }
    return nil
}

private func readDouble(_ record: [String: Any], _ keys: [String]) -> Double? {
    for key in keys {
        if let value = record[key] as? Double { return value }
        if let value = record[key] as? NSNumber { return value.doubleValue }
    }
    return nil
}

private func readBool(_ record: [String: Any], _ keys: [String]) -> Bool? {
    for key in keys {
        if let value = record[key] as? Bool { return value }
    }
    return nil
}

private func readStringArray(_ record: [String: Any], _ keys: [String]) -> [String] {
    for key in keys {
        if let values = record[key] as? [String] { return values.compactMap(nonEmpty) }
        if let values = record[key] as? [Any] { return values.compactMap { ($0 as? String).flatMap(nonEmpty) } }
    }
    return []
}

private func readSessionMetadata(_ record: [String: Any]) -> [String: MetadataValue]? {
    let metadata = record["metadata"] as? [String: Any]
    let role = readString(record, ["role", "agentRole", "agent_role"]) ?? readString(metadata, ["role", "agentRole", "agent_role"])
    var scalarMetadata = copyScalarMetadata(metadata)
    if let role { scalarMetadata["role"] = .string(role) }
    return scalarMetadata.isEmpty ? nil : scalarMetadata
}

private func copyScalarMetadata(_ metadata: [String: Any]?) -> [String: MetadataValue] {
    guard let metadata else { return [:] }
    var result: [String: MetadataValue] = [:]
    for (key, value) in metadata {
        if value is NSNull { result[key] = .null }
        else if let value = value as? String { result[key] = .string(value) }
        else if let value = value as? Bool { result[key] = .bool(value) }
        else if let value = value as? NSNumber { result[key] = .number(value.doubleValue) }
    }
    return result
}

private func normalizeSessionState(_ value: String) -> SessionState {
    let normalized = value.lowercased().replacingOccurrences(of: "-", with: "_")
    switch normalized {
    case "waiting", "waiting_for_input", "needs_input": return .waitingForInput
    case "blocked": return .blocked
    case "complete", "completed", "success": return .completed
    case "failed", "error": return .failed
    case "running", "in_progress": return .running
    case "idle": return .idle
    default: return .unknown
    }
}

private func bindingRank(_ window: RepoPromptWindow, currentWorkingDirectory: String) -> Int {
    let cwd = normalizePath(currentWorkingDirectory)
    let repoPath = normalizePath(window.repoPath ?? "")
    let cwdName = cwd.split(separator: "/").last?.lowercased() ?? ""
    let workspace = window.workspace.lowercased()
    var rank = 0
    if !repoPath.isEmpty && repoPath == cwd { rank += 100 }
    if !repoPath.isEmpty && (repoPath.hasPrefix("\(cwd)/") || cwd.hasPrefix("\(repoPath)/")) { rank += 40 }
    if !cwdName.isEmpty && workspace == cwdName { rank += 30 }
    if !cwdName.isEmpty && workspace.contains(cwdName) { rank += 20 }
    if window.tabs.contains(where: { $0.active && $0.contextId != nil }) { rank += 5 }
    return rank
}

private func normalizePath(_ value: String) -> String {
    var normalized = value.replacingOccurrences(of: "\\", with: "/")
    while normalized.hasSuffix("/") { normalized.removeLast() }
    return normalized
}

private func classifySessionFailure(_ output: String) -> String {
    let lower = output.lowercased()
    if lower.contains("permission denied") { return "repoprompt_socket_permission_denied" }
    if output.contains("Multiple RepoPrompt windows detected") { return "session_status_requires_binding" }
    return "agent_sessions_unavailable"
}

private func isRetryableSessionFailure(_ code: String) -> Bool {
    code == "session_status_requires_binding" || code == "agent_sessions_unavailable"
}

private func describeFailure(_ output: String) -> String {
    let trimmed = output.trimmingCharacters(in: .whitespacesAndNewlines)
    let lower = trimmed.lowercased()
    if trimmed.isEmpty { return "Command failed without output." }
    if lower.contains("permission denied") { return "RepoPrompt socket access failed: permission denied." }
    if trimmed.contains("Multiple RepoPrompt windows detected") { return "RepoPrompt requires explicit context/window binding before this call." }
    if trimmed.contains("ENOENT") { return "rp-cli executable was not found." }
    let lines = trimmed.components(separatedBy: .newlines).filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.trimmingCharacters(in: .whitespacesAndNewlines) != "Error:" }
    return lines.prefix(4).joined(separator: "\n")
}

private func firstRegexMatch(_ pattern: String, in text: String) -> [String]? {
    guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
    let range = NSRange(text.startIndex..<text.endIndex, in: text)
    guard let match = regex.firstMatch(in: text, range: range) else { return nil }
    return (0..<match.numberOfRanges).map { index in
        guard let range = Range(match.range(at: index), in: text) else { return "" }
        return String(text[range])
    }
}

private func unique(_ values: [String]) -> [String] {
    var seen = Set<String>()
    var result: [String] = []
    for value in values where !seen.contains(value) {
        seen.insert(value)
        result.append(value)
    }
    return result
}

private func nonEmpty(_ value: String?) -> String? {
    guard let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else { return nil }
    return trimmed
}
