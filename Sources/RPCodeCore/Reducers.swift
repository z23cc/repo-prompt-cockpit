import Foundation

public struct StatusCounts: Equatable, Sendable {
    public var workspaces: Int
    public var sessions: Int
    public var running: Int
    public var waitingForInput: Int
    public var blocked: Int
    public var failed: Int
    public var completed: Int
    public var idle: Int
    public var unknown: Int
}

public struct WorkspaceContextTabView: Identifiable, Equatable, Sendable {
    public var id: String
    public var workspace: String
    public var windowId: Int
    public var tabName: String
    public var contextId: String?
    public var active: Bool
    public var repoPath: String?
    public var observation: ObservationKind
}

public struct WorkspaceView: Identifiable, Equatable, Sendable {
    public var id: String
    public var workspace: String
    public var repoPath: String?
    public var windowIds: [Int]
    public var tabCount: Int
    public var activeTabCount: Int
    public var contextTabs: [WorkspaceContextTabView]
    public var observation: ObservationKind
}

public struct SessionGroupView: Identifiable, Equatable, Sendable {
    public var id: String { workspace }
    public var workspace: String
    public var sessions: [AgentSession]
}

public enum SessionTreeRelationship: String, Equatable, Sendable {
    case observed
    case inferred
    case flat
}

public enum SessionTreeMode: String, Equatable, Sendable {
    case observed
    case inferred
    case flat
}

public struct SessionTreeNodeView: Identifiable, Equatable, Sendable {
    public var id: String
    public var title: String
    public var state: SessionState
    public var model: String?
    public var role: String?
    public var observation: ObservationKind
    public var relationship: SessionTreeRelationship
    public var relationshipLabel: String
    public var children: [SessionTreeNodeView]
}

public struct SessionTreeView: Equatable, Sendable {
    public var roots: [SessionTreeNodeView]
    public var mode: SessionTreeMode
    public var modeLabel: String
}

public enum ImplementationPlanItemKind: Equatable, Sendable {
    case session(AgentSession)
    case placeholder
}

public struct ImplementationPlanItem: Identifiable, Equatable, Sendable {
    public var id: String
    public var title: String
    public var detail: String
    public var state: SessionState?
    public var observation: ObservationKind
    public var progress: Double?
    public var workspace: String?
    public var model: String?
    public var updatedAt: String?
    public var kind: ImplementationPlanItemKind

    public init(
        id: String,
        title: String,
        detail: String,
        state: SessionState? = nil,
        observation: ObservationKind,
        progress: Double? = nil,
        workspace: String? = nil,
        model: String? = nil,
        updatedAt: String? = nil,
        kind: ImplementationPlanItemKind
    ) {
        self.id = id
        self.title = title
        self.detail = detail
        self.state = state
        self.observation = observation
        self.progress = progress
        self.workspace = workspace
        self.model = model
        self.updatedAt = updatedAt
        self.kind = kind
    }

    public static let unavailablePlaceholder = ImplementationPlanItem(
        id: "no-repoprompt-activity",
        title: "No RepoPrompt activity available",
        detail: "Start RepoPrompt and ensure rp-cli is available to observe windows and session metadata.",
        observation: .unavailable,
        kind: .placeholder
    )
}

public struct ImplementationPlanView: Equatable, Sendable {
    public var items: [ImplementationPlanItem]
}

public enum ActivityPanelTabKey: String, Equatable, Sendable {
    case plan
    case activity
    case artifacts
    case logs
    case results
}

public struct ActivityPanelTab: Identifiable, Equatable, Sendable {
    public var id: ActivityPanelTabKey { key }
    public var key: ActivityPanelTabKey
    public var label: String
    public var available: Bool
    public var detail: String
}

public struct ActivityPanelView: Equatable, Sendable {
    public var selectedItemId: String?
    public var tabs: [ActivityPanelTab]
}

public struct CapabilityRowView: Identifiable, Equatable, Sendable {
    public var id: String { field }
    public var field: String
    public var status: CapabilityStatus
    public var observation: ObservationKind
    public var source: String
}

public enum PrivacyBannerSeverity: String, Equatable, Sendable {
    case safe
    case warning
}

public struct PrivacyBannerView: Equatable, Sendable {
    public var label: String
    public var detail: String
    public var severity: PrivacyBannerSeverity
}

public struct ControlPlaneDashboard: Equatable, Sendable {
    public var generatedAt: String
    public var providerLabel: String
    public var isFixture: Bool
    public var isLive: Bool
    public var statusCounts: StatusCounts
    public var focusItems: [AttentionItem]
    public var workspaces: [WorkspaceView]
    public var sessionGroups: [SessionGroupView]
    public var sessionTree: SessionTreeView
    public var implementationPlan: ImplementationPlanView
    public var activityPanel: ActivityPanelView
    public var capabilityRows: [CapabilityRowView]
    public var diagnostics: [ProviderDiagnostic]
    public var privacyBanner: PrivacyBannerView
}

public struct SessionTreeNode: Equatable, Sendable {
    public var session: AgentSession
    public var children: [SessionTreeNode]
}

public func createControlPlaneDashboard(snapshot: ControlPlaneSnapshot) -> ControlPlaneDashboard {
    let isFixture = snapshot.provider == .demoFixture || snapshot.summarySource == .fixture
    let focusItems = deriveAttentionItems(from: snapshot)
    let implementationItems = deriveImplementationItems(from: snapshot)

    return ControlPlaneDashboard(
        generatedAt: snapshot.generatedAt,
        providerLabel: snapshot.provider == .demoFixture ? "demo-fixture (fixture)" : "rp-cli (live)",
        isFixture: isFixture,
        isLive: !isFixture,
        statusCounts: deriveStatusCounts(from: snapshot),
        focusItems: focusItems,
        workspaces: deriveWorkspaceViews(from: snapshot),
        sessionGroups: deriveSessionGroups(from: snapshot),
        sessionTree: deriveSessionTreeView(from: snapshot),
        implementationPlan: ImplementationPlanView(items: implementationItems),
        activityPanel: deriveActivityPanel(focusItems: focusItems, implementationItems: implementationItems),
        capabilityRows: deriveCapabilityRows(from: snapshot),
        diagnostics: snapshot.diagnostics,
        privacyBanner: PrivacyBannerView(
            label: "Read-only cockpit",
            detail: "Need transcript, log, artifact, or result bodies? Use the matching Repo Prompt tab/context listed in the right rail and inspect those views in Repo Prompt itself. This cockpit keeps body content out by default.",
            severity: .safe
        )
    )
}

public func deriveStatusCounts(from snapshot: ControlPlaneSnapshot) -> StatusCounts {
    var counts = StatusCounts(
        workspaces: Set(snapshot.windows.map(\.workspace)).count,
        sessions: snapshot.sessions.count,
        running: 0,
        waitingForInput: 0,
        blocked: 0,
        failed: 0,
        completed: 0,
        idle: 0,
        unknown: 0
    )

    for session in snapshot.sessions {
        switch session.state {
        case .running: counts.running += 1
        case .waitingForInput: counts.waitingForInput += 1
        case .blocked: counts.blocked += 1
        case .failed: counts.failed += 1
        case .completed: counts.completed += 1
        case .idle: counts.idle += 1
        case .unknown: counts.unknown += 1
        }
    }

    return counts
}

public func deriveWorkspaceViews(from snapshot: ControlPlaneSnapshot) -> [WorkspaceView] {
    var byWorkspace: [String: WorkspaceView] = [:]

    for window in snapshot.windows {
        let tabs = createContextTabs(for: window)
        if var current = byWorkspace[window.workspace] {
            current.windowIds.append(window.id)
            current.tabCount += window.tabs.count
            current.activeTabCount += window.tabs.filter(\.active).count
            current.contextTabs.append(contentsOf: tabs)
            if current.repoPath == nil { current.repoPath = window.repoPath }
            byWorkspace[window.workspace] = current
        } else {
            byWorkspace[window.workspace] = WorkspaceView(
                id: window.workspace,
                workspace: window.workspace,
                repoPath: window.repoPath,
                windowIds: [window.id],
                tabCount: window.tabs.count,
                activeTabCount: window.tabs.filter(\.active).count,
                contextTabs: tabs,
                observation: window.observation
            )
        }
    }

    return byWorkspace.values
        .map { workspace in
            var copy = workspace
            copy.contextTabs = workspace.contextTabs.sorted(by: compareContextTabs)
            return copy
        }
        .sorted { $0.workspace.localizedCaseInsensitiveCompare($1.workspace) == .orderedAscending }
}

public func deriveSessionGroups(from snapshot: ControlPlaneSnapshot) -> [SessionGroupView] {
    let groups = Dictionary(grouping: snapshot.sessions) { $0.workspace ?? "Unscoped" }
    return groups.map { workspace, sessions in
        SessionGroupView(
            workspace: workspace,
            sessions: sessions.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        )
    }
    .sorted { $0.workspace.localizedCaseInsensitiveCompare($1.workspace) == .orderedAscending }
}

public func deriveCapabilityRows(from snapshot: ControlPlaneSnapshot) -> [CapabilityRowView] {
    snapshot.capabilities.map { capability in
        CapabilityRowView(
            field: capability.field,
            status: capability.status,
            observation: capability.observation,
            source: capability.source
        )
    }
}

public func deriveActivityPanel(focusItems: [AttentionItem], implementationItems: [ImplementationPlanItem]) -> ActivityPanelView {
    let sessionIds = Set(implementationItems.compactMap { item -> String? in
        if case .session = item.kind { return item.id }
        return nil
    })

    let selected = focusItems.first { sessionIds.contains($0.id) }?.id
        ?? implementationItems.first { item in
            if case .session = item.kind { return true }
            return false
        }?.id
        ?? focusItems.first?.id

    return ActivityPanelView(
        selectedItemId: selected,
        tabs: [
            ActivityPanelTab(key: .plan, label: "Plan", available: true, detail: "Selected workflow/session metadata when provider reports a real session; otherwise an honest empty state."),
            ActivityPanelTab(key: .activity, label: "Activity", available: true, detail: "Session metadata and deterministic status only."),
            ActivityPanelTab(key: .artifacts, label: "Artifacts", available: false, detail: "Artifacts are not reported by the read-only provider snapshot."),
            ActivityPanelTab(key: .logs, label: "Logs", available: false, detail: "Log/transcript capability is not called by default; bodies are unavailable."),
            ActivityPanelTab(key: .results, label: "Results", available: false, detail: "Results are not reported by the read-only provider snapshot.")
        ]
    )
}

public func deriveImplementationItems(from snapshot: ControlPlaneSnapshot) -> [ImplementationPlanItem] {
    if !snapshot.sessions.isEmpty {
        return snapshot.sessions.map { session in
            ImplementationPlanItem(
                id: session.id,
                title: session.title,
                detail: session.summary ?? session.workspace ?? session.model ?? "No session summary available from read-only snapshot.",
                state: session.state,
                observation: session.observation,
                progress: session.progress,
                workspace: session.workspace,
                model: session.model,
                updatedAt: session.updatedAt,
                kind: .session(session)
            )
        }
    }

    if !snapshot.windows.isEmpty {
        return [
            ImplementationPlanItem(
                id: "unavailable-session-state",
                title: "No live implementation plan available",
                detail: "RepoPrompt workspaces are visible, but agent session state is unavailable.",
                observation: .unavailable,
                kind: .placeholder
            )
        ]
    }

    return [
        ImplementationPlanItem(
            id: "no-repoprompt-activity",
            title: "No RepoPrompt activity available",
            detail: createNoActivityDetail(snapshot),
            observation: .unavailable,
            kind: .placeholder
        )
    ]
}

public func countRealSessions(in items: [ImplementationPlanItem]) -> Int {
    items.reduce(0) { count, item in
        if case .session = item.kind { return count + 1 }
        return count
    }
}

public func deriveAttentionItems(from snapshot: ControlPlaneSnapshot) -> [AttentionItem] {
    let sessionItems = snapshot.sessions.map(sessionToAttentionItem)
    let diagnosticItems = snapshot.diagnostics
        .filter { $0.severity != .info }
        .map(diagnosticToAttentionItem)

    if sessionItems.isEmpty {
        if !snapshot.windows.isEmpty {
            let windows = snapshot.windows.count
            let workspaceFallback = AttentionItem(
                id: "workspace-context-only",
                label: "No actionable session data available",
                detail: "\(windows) RepoPrompt workspace\(windows == 1 ? "" : "s") observed; agent session state is unavailable.",
                priority: 40,
                state: .workspace,
                observation: snapshot.summarySource == .fixture ? .fixture : .observed
            )
            return sortAttention([workspaceFallback] + diagnosticItems)
        }

        let unavailableFallback = AttentionItem(
            id: "no-actionable-data",
            label: "No actionable session data available",
            detail: "Provider did not return session or workspace state.",
            priority: 45,
            state: .diagnostic,
            observation: .unavailable
        )
        return sortAttention([unavailableFallback] + diagnosticItems)
    }

    return sortAttention(sessionItems + diagnosticItems)
}

public func deriveSessionTree(from snapshot: ControlPlaneSnapshot) -> [SessionTreeNode] {
    let view = deriveSessionTreeView(from: snapshot)
    let sessionsById = Dictionary(uniqueKeysWithValues: snapshot.sessions.map { ($0.id, $0) })

    func build(_ node: SessionTreeNodeView) -> SessionTreeNode? {
        guard let session = sessionsById[node.id] else { return nil }
        return SessionTreeNode(session: session, children: node.children.compactMap(build))
    }

    return view.roots.compactMap(build)
}

public func deriveSessionTreeView(from snapshot: ControlPlaneSnapshot) -> SessionTreeView {
    guard !snapshot.sessions.isEmpty else {
        return SessionTreeView(roots: [], mode: .flat, modeLabel: "flat sessions (parent link unavailable)")
    }

    var nodes: [String: SessionTreeNodeView] = [:]
    var childrenByParent: [String: [String]] = [:]
    var inferredByWorkflow: [String: [String]] = [:]
    var childIds = Set<String>()
    var hasObserved = false

    for session in snapshot.sessions {
        nodes[session.id] = SessionTreeNodeView(
            id: session.id,
            title: session.title,
            state: session.state,
            model: session.model,
            role: extractRole(session),
            observation: session.observation,
            relationship: .flat,
            relationshipLabel: "flat sessions (parent link unavailable)",
            children: []
        )
    }

    for session in snapshot.sessions {
        if let explicitParentId = extractExplicitParentId(session), nodes[explicitParentId] != nil {
            nodes[session.id]?.relationship = .observed
            nodes[session.id]?.relationshipLabel = "relationship observed"
            hasObserved = true
            childIds.insert(session.id)
            childrenByParent[explicitParentId, default: []].append(session.id)
            continue
        }

        if let workflowKey = extractWorkflowKey(session) {
            inferredByWorkflow[workflowKey, default: []].append(session.id)
        }
    }

    for groupIds in inferredByWorkflow.values where groupIds.count >= 2 {
        let sortedIds = groupIds.sorted { lhs, rhs in
            (nodes[lhs]?.title ?? lhs).localizedCaseInsensitiveCompare(nodes[rhs]?.title ?? rhs) == .orderedAscending
        }
        guard let parentId = sortedIds.first else { continue }
        if nodes[parentId]?.relationship != .observed {
            nodes[parentId]?.relationship = .inferred
            nodes[parentId]?.relationshipLabel = "relationship inferred"
        }
        for childId in sortedIds.dropFirst() where !childIds.contains(childId) {
            nodes[childId]?.relationship = .inferred
            nodes[childId]?.relationshipLabel = "relationship inferred"
            childIds.insert(childId)
            childrenByParent[parentId, default: []].append(childId)
        }
    }

    func build(id: String) -> SessionTreeNodeView? {
        guard var node = nodes[id] else { return nil }
        let childNodes = (childrenByParent[id] ?? [])
            .sorted { lhs, rhs in
                (nodes[lhs]?.title ?? lhs).localizedCaseInsensitiveCompare(nodes[rhs]?.title ?? rhs) == .orderedAscending
            }
            .compactMap(build)
        node.children = childNodes
        return node
    }

    let roots = snapshot.sessions
        .map(\.id)
        .filter { !childIds.contains($0) }
        .sorted { lhs, rhs in
            (nodes[lhs]?.title ?? lhs).localizedCaseInsensitiveCompare(nodes[rhs]?.title ?? rhs) == .orderedAscending
        }
        .compactMap(build)

    let hasInferred = nodes.values.contains { $0.relationship == .inferred }
    let mode: SessionTreeMode = hasObserved ? .observed : hasInferred ? .inferred : .flat
    let modeLabel: String
    switch mode {
    case .observed: modeLabel = "parent-child links observed"
    case .inferred: modeLabel = "relationship inferred"
    case .flat: modeLabel = "flat sessions (parent link unavailable)"
    }

    return SessionTreeView(roots: roots, mode: mode, modeLabel: modeLabel)
}

public func createDeterministicSummary(snapshot: ControlPlaneSnapshot, maxChars: Int = 2_000) -> String {
    let boundedMax = max(160, min(maxChars, 2_000))
    let counts = deriveStatusCounts(from: snapshot)
    let attention = deriveAttentionItems(from: snapshot).first
    var lines = [
        "RP Code (\(snapshot.provider.rawValue)\(snapshot.summarySource == .fixture ? ", fixture-backed" : ""))",
        "Workspaces: \(snapshot.windows.count); Sessions: \(counts.sessions); Running: \(counts.running); Waiting: \(counts.waitingForInput); Blocked: \(counts.blocked); Failed: \(counts.failed); Completed: \(counts.completed)"
    ]
    if let attention {
        lines.append("Focus next [\(attention.observation.rawValue)]: \(attention.label) — \(attention.detail)")
    } else {
        lines.append("Focus next: No actionable session data available")
    }
    let actionableDiagnostics = snapshot.diagnostics.filter { $0.severity != .info }
    if !actionableDiagnostics.isEmpty {
        lines.append("Diagnostics: " + actionableDiagnostics.map { "\($0.code): \($0.message)" }.joined(separator: "; "))
    }
    lines.append("Updated: \(snapshot.generatedAt)")
    return truncate(lines.joined(separator: "\n"), maxChars: boundedMax)
}

public func summarizeForClipboard(snapshot: ControlPlaneSnapshot, maxChars: Int = 2_000) -> String {
    createDeterministicSummary(snapshot: snapshot, maxChars: maxChars)
}

private func createContextTabs(for window: RepoPromptWindow) -> [WorkspaceContextTabView] {
    window.tabs.enumerated().map { index, tab in
        WorkspaceContextTabView(
            id: "\(window.id):\(tab.contextId ?? tab.name):\(index)",
            workspace: window.workspace,
            windowId: window.id,
            tabName: tab.name,
            contextId: tab.contextId,
            active: tab.active,
            repoPath: window.repoPath,
            observation: tab.observation
        )
    }
}

private func compareContextTabs(_ lhs: WorkspaceContextTabView, _ rhs: WorkspaceContextTabView) -> Bool {
    if lhs.active != rhs.active { return lhs.active && !rhs.active }
    if lhs.windowId != rhs.windowId { return lhs.windowId < rhs.windowId }
    return lhs.tabName.localizedCaseInsensitiveCompare(rhs.tabName) == .orderedAscending
}

private func sessionToAttentionItem(_ session: AgentSession) -> AttentionItem {
    let priority: Int
    switch session.state {
    case .waitingForInput: priority = 100
    case .failed: priority = 90
    case .blocked: priority = 80
    case .running: priority = 60
    case .completed: priority = 30
    case .idle: priority = 10
    case .unknown: priority = 5
    }

    let percent = session.progress.map { " (\(Int(($0 * 100).rounded()))%)" } ?? ""
    let workspace = session.workspace.map { " in \($0)" } ?? ""
    return AttentionItem(
        id: session.id,
        label: session.title,
        detail: "\(formatState(session.state))\(percent)\(workspace)",
        priority: priority,
        state: AttentionState(rawValue: session.state.rawValue) ?? .unknown,
        observation: session.observation
    )
}

private func diagnosticToAttentionItem(_ diagnostic: ProviderDiagnostic) -> AttentionItem {
    AttentionItem(
        id: "diagnostic-\(diagnostic.code)",
        label: diagnostic.severity == .error ? "Provider error" : "Provider warning",
        detail: diagnostic.message,
        priority: diagnostic.severity == .error ? 95 : 55,
        state: .diagnostic,
        observation: .observed
    )
}

private func sortAttention(_ items: [AttentionItem]) -> [AttentionItem] {
    items.sorted { lhs, rhs in
        if lhs.priority != rhs.priority { return lhs.priority > rhs.priority }
        return lhs.label.localizedCaseInsensitiveCompare(rhs.label) == .orderedAscending
    }
}

private func createNoActivityDetail(_ snapshot: ControlPlaneSnapshot) -> String {
    if let error = snapshot.diagnostics.first(where: { $0.severity == .error })?.message { return error }
    if let warning = snapshot.diagnostics.first(where: { $0.severity == .warning })?.message { return warning }
    return "Start RepoPrompt and ensure rp-cli is available to observe windows and session metadata."
}

private func extractExplicitParentId(_ session: AgentSession) -> String? {
    firstNonEmpty(
        session.parentSessionId,
        metadataString(session, keys: ["parentSessionId", "parentId", "parent_session_id", "parent_session", "parent"])
    )
}

private func extractWorkflowKey(_ session: AgentSession) -> String? {
    firstNonEmpty(session.workflowId, metadataString(session, keys: ["workflowId", "workflow"]))
}

private func extractRole(_ session: AgentSession) -> String? {
    metadataString(session, keys: ["agentRole", "role"])
}

private func metadataString(_ session: AgentSession, keys: [String]) -> String? {
    guard let metadata = session.metadata else { return nil }
    for key in keys {
        guard let value = metadata[key] else { continue }
        switch value {
        case .string(let string):
            if !string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return string.trimmingCharacters(in: .whitespacesAndNewlines) }
        case .number(let number):
            return String(number)
        case .bool(let bool):
            return bool ? "true" : "false"
        case .null:
            continue
        }
    }
    return nil
}

private func firstNonEmpty(_ values: String?...) -> String? {
    for value in values {
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines)
        if let trimmed, !trimmed.isEmpty { return trimmed }
    }
    return nil
}

private func formatState(_ state: SessionState) -> String {
    state.rawValue.replacingOccurrences(of: "_", with: " ")
}

private func truncate(_ value: String, maxChars: Int) -> String {
    guard value.count > maxChars else { return value }
    return String(value.prefix(max(0, maxChars - 1))) + "…"
}
