import Foundation

public enum StatusMenuItemRole: String, Equatable, Sendable {
    case header
    case row
    case separator
    case action
}

public enum StatusMenuAction: String, Equatable, Sendable {
    case openCockpit
    case toggleWindowMode
    case refresh
    case copySummary
    case switchToFixture
    case switchToLive
    case quit
}

public struct StatusMenuItem: Equatable, Sendable {
    public var title: String
    public var subtitle: String?
    public var role: StatusMenuItemRole
    public var isEnabled: Bool
    public var isVisible: Bool
    public var action: StatusMenuAction?

    public init(
        title: String,
        subtitle: String? = nil,
        role: StatusMenuItemRole,
        isEnabled: Bool = false,
        isVisible: Bool = true,
        action: StatusMenuAction? = nil
    ) {
        self.title = title
        self.subtitle = subtitle
        self.role = role
        self.isEnabled = isEnabled
        self.isVisible = isVisible
        self.action = action
    }
}

public struct StatusMenuModel: Equatable, Sendable {
    public var statusTitle: String
    public var items: [StatusMenuItem]

    public init(statusTitle: String, items: [StatusMenuItem]) {
        self.statusTitle = statusTitle
        self.items = items
    }
}

private let statusSessionGroups: [(state: SessionState, label: String)] = [
    (.waitingForInput, "Waiting"),
    (.blocked, "Blocked"),
    (.failed, "Failed"),
    (.running, "Running"),
    (.idle, "Idle"),
    (.completed, "Completed"),
    (.unknown, "Unknown")
]

private let maxStatusSessionRows = 6
private let maxStatusWorkspaceRows = 4

public func buildStatusMenuModel(
    snapshot: ControlPlaneSnapshot?,
    windowMode: WindowMode,
    providerMode: ProviderMode
) -> StatusMenuModel {
    guard let snapshot else {
        return StatusMenuModel(
            statusTitle: "RPC …",
            items: compactMenuItems([
                header("RP Code"),
                row("No snapshot available", subtitle: "Refresh to collect metadata-only provider state."),
                separator(),
                header("Actions"),
                action("Open Cockpit", .openCockpit),
                action(windowMode == .minimal ? "Restore full cockpit" : "Pin mini cockpit", .toggleWindowMode),
                action("Refresh now", .refresh),
                action("Copy summary", .copySummary),
                action(providerMode == .fixture ? "Use live rp-cli mode" : "Use fixture demo mode", providerMode == .fixture ? .switchToLive : .switchToFixture),
                separator(),
                action("Quit", .quit)
            ])
        )
    }

    let summary = createDeterministicSummary(snapshot: snapshot)
    let attention = deriveAttentionItems(from: snapshot)
    var items: [StatusMenuItem] = [
        header("\(snapshot.provider == .demoFixture ? "Fixture demo" : "Live") status — \(snapshot.windows.count) workspace\(snapshot.windows.count == 1 ? "" : "s")"),
        row("Updated \(formatStatusTimestamp(snapshot.generatedAt))"),
        separator(),
        header("Focus next")
    ]

    if attention.isEmpty {
        items.append(row("No actionable session data available"))
    } else {
        items.append(contentsOf: attention.prefix(5).map { item in
            row("\(observationLabel(item.observation)) \(item.label)", subtitle: item.detail)
        })
    }

    items += [separator(), header("Sessions")]
    items.append(contentsOf: sessionRows(snapshot.sessions))
    items += [separator(), header("Workspaces")]
    items.append(contentsOf: workspaceRows(snapshot))
    items += [separator(), header("Capabilities")]
    items.append(contentsOf: snapshot.capabilities.map { entry in
        row("\(observationLabel(entry.observation)) \(entry.status.rawValue): \(entry.field)", subtitle: entry.failureMode)
    })

    if !snapshot.diagnostics.isEmpty {
        items += [separator(), header("Diagnostics")]
        items.append(contentsOf: snapshot.diagnostics.map { diagnostic in
            row("\(diagnosticObservationLabel(snapshot)) \(diagnostic.severity.rawValue): \(diagnostic.code)", subtitle: diagnostic.message)
        })
    }

    items += [
        separator(),
        header("Actions"),
        row(truncateStatusLabel(summary)),
        action("Open Cockpit", .openCockpit),
        action(windowMode == .minimal ? "Restore full cockpit" : "Pin mini cockpit", .toggleWindowMode),
        action("Refresh now", .refresh),
        action("Copy summary", .copySummary),
        action("Use fixture demo mode", .switchToFixture, visible: snapshot.provider != .demoFixture),
        action("Use live rp-cli mode", .switchToLive, visible: snapshot.provider == .demoFixture),
        separator(),
        action("Quit", .quit)
    ]

    return StatusMenuModel(statusTitle: buildStatusTitle(snapshot: snapshot), items: items.filter(\.isVisible))
}

public func buildStatusTitle(snapshot: ControlPlaneSnapshot) -> String {
    let totalSessions = snapshot.sessions.count
    let running = snapshot.sessions.filter { $0.state == .running }.count
    let waiting = snapshot.sessions.filter { $0.state == .waitingForInput }.count
    let diagnosticErrors = snapshot.diagnostics.filter { $0.severity == .error }.count

    if snapshot.provider == .demoFixture {
        return "RPC demo \(totalSessions)s \(running)▶ \(waiting)?"
    }
    if diagnosticErrors > 0 {
        return "RPC ! \(diagnosticErrors)"
    }
    return "RPC \(totalSessions)s \(running)▶ \(waiting)?"
}

private func sessionRows(_ sessions: [AgentSession]) -> [StatusMenuItem] {
    guard !sessions.isEmpty else {
        return [row("[unavailable] No live session rows available")]
    }

    var rows: [StatusMenuItem] = []
    var visibleSessions = 0

    for group in statusSessionGroups {
        let groupSessions = sessions.filter { $0.state == group.state }
        guard !groupSessions.isEmpty else { continue }
        let remainingCapacity = maxStatusSessionRows - visibleSessions
        guard remainingCapacity > 0 else { break }

        rows.append(row("\(group.label) (\(groupSessions.count))"))
        for session in groupSessions.prefix(remainingCapacity) {
            rows.append(row("\(observationLabel(session.observation)) \(session.title)", subtitle: sessionSublabel(session)))
        }
        visibleSessions += min(groupSessions.count, remainingCapacity)
    }

    if sessions.count > visibleSessions {
        rows.append(row("… \(sessions.count - visibleSessions) more sessions hidden"))
    }

    return rows
}

private func workspaceRows(_ snapshot: ControlPlaneSnapshot) -> [StatusMenuItem] {
    guard !snapshot.windows.isEmpty else {
        return [row("[unavailable] No RepoPrompt workspaces observed")]
    }

    var rows = snapshot.windows.prefix(maxStatusWorkspaceRows).map { window in
        let activeTab = window.tabs.first { $0.active }
        let subtitle = [
            window.repoPath,
            activeTab.map { tab in
                "active: \(tab.name)\(tab.contextId.map { " · \($0)" } ?? "")"
            }
        ].compactMap { $0 }.joined(separator: " — ")
        return row("\(observationLabel(window.observation)) \(window.workspace)", subtitle: subtitle.isEmpty ? nil : subtitle)
    }

    if snapshot.windows.count > maxStatusWorkspaceRows {
        rows.append(row("… \(snapshot.windows.count - maxStatusWorkspaceRows) more workspaces hidden"))
    }

    return rows
}

private func sessionSublabel(_ session: AgentSession) -> String {
    [
        session.state.rawValue.replacingOccurrences(of: "_", with: " "),
        session.progress.map { "\(Int(($0 * 100).rounded()))%" },
        session.workspace,
        session.model
    ].compactMap { $0 }.joined(separator: " · ")
}

private func diagnosticObservationLabel(_ snapshot: ControlPlaneSnapshot) -> String {
    observationLabel(snapshot.provider == .demoFixture ? .fixture : .observed)
}

private func observationLabel(_ observation: ObservationKind) -> String {
    switch observation {
    case .observed: return "[observed]"
    case .fixture: return "[fixture]"
    case .inferred: return "[inferred]"
    case .unavailable: return "[unavailable]"
    }
}

private func formatStatusTimestamp(_ value: String) -> String {
    guard let date = ISO8601DateFormatter().date(from: value) else { return value }
    return DateFormatter.localizedString(from: date, dateStyle: .none, timeStyle: .medium)
}

private func truncateStatusLabel(_ summary: String) -> String {
    let firstLine = summary.split(separator: "\n", omittingEmptySubsequences: false).first.map(String.init) ?? "Summary unavailable"
    guard firstLine.count > 72 else { return firstLine }
    return String(firstLine.prefix(71)) + "…"
}

private func header(_ title: String) -> StatusMenuItem {
    StatusMenuItem(title: title, role: .header)
}

private func row(_ title: String, subtitle: String? = nil) -> StatusMenuItem {
    StatusMenuItem(title: title, subtitle: subtitle, role: .row)
}

private func separator() -> StatusMenuItem {
    StatusMenuItem(title: "-", role: .separator)
}

private func action(_ title: String, _ action: StatusMenuAction, visible: Bool = true) -> StatusMenuItem {
    StatusMenuItem(title: title, role: .action, isEnabled: true, isVisible: visible, action: action)
}

private func compactMenuItems(_ items: [StatusMenuItem?]) -> [StatusMenuItem] {
    items.compactMap { $0 }.filter(\.isVisible)
}

