import Foundation
import SwiftUI

public enum PresentationTone: String, Equatable, Sendable {
    case accent
    case neutral
    case success
    case warning
    case danger
    case unavailable
}

public struct PresentationBadge: Equatable, Sendable {
    public var label: String
    public var systemImageName: String
    public var tone: PresentationTone

    public init(label: String, systemImageName: String, tone: PresentationTone) {
        self.label = label
        self.systemImageName = systemImageName
        self.tone = tone
    }
}

public struct PresentationMetadataRow: Identifiable, Equatable, Sendable {
    public var id: String
    public var key: String
    public var value: String

    public init(key: String, value: String, id: String? = nil) {
        self.id = id ?? key
        self.key = key
        self.value = value
    }
}

public func observationBadge(_ observation: ObservationKind) -> PresentationBadge {
    switch observation {
    case .observed:
        return PresentationBadge(label: "observed", systemImageName: "eye", tone: .success)
    case .inferred:
        return PresentationBadge(label: "inferred", systemImageName: "wand.and.stars", tone: .warning)
    case .fixture:
        return PresentationBadge(label: "fixture", systemImageName: "testtube.2", tone: .accent)
    case .unavailable:
        return PresentationBadge(label: "unavailable", systemImageName: "slash.circle", tone: .unavailable)
    }
}

public func sessionStateBadge(_ state: SessionState) -> PresentationBadge {
    switch state {
    case .running:
        return PresentationBadge(label: "running", systemImageName: "play.circle", tone: .success)
    case .waitingForInput:
        return PresentationBadge(label: "waiting", systemImageName: "person.crop.circle.badge.questionmark", tone: .warning)
    case .blocked:
        return PresentationBadge(label: "blocked", systemImageName: "hand.raised", tone: .danger)
    case .completed:
        return PresentationBadge(label: "completed", systemImageName: "checkmark.circle", tone: .neutral)
    case .failed:
        return PresentationBadge(label: "failed", systemImageName: "xmark.octagon", tone: .danger)
    case .idle:
        return PresentationBadge(label: "idle", systemImageName: "pause.circle", tone: .neutral)
    case .unknown:
        return PresentationBadge(label: "unknown", systemImageName: "questionmark.circle", tone: .unavailable)
    }
}

public func sessionStateColor(_ state: SessionState) -> Color {
    switch state {
    case .running:
        return .green
    case .blocked:
        return .red
    case .waitingForInput:
        return .orange
    case .completed:
        return .gray
    case .failed:
        return .red
    case .idle:
        return .secondary
    case .unknown:
        return .secondary
    }
}

public func statusCountColor(for state: SessionState?) -> Color {
    guard let state else { return .secondary }
    return sessionStateColor(state)
}

public func capabilityStatusBadge(_ status: CapabilityStatus) -> PresentationBadge {
    switch status {
    case .available:
        return PresentationBadge(label: "available", systemImageName: "checkmark.seal", tone: .success)
    case .unavailable:
        return PresentationBadge(label: "unavailable", systemImageName: "slash.circle", tone: .unavailable)
    case .error:
        return PresentationBadge(label: "error", systemImageName: "exclamationmark.triangle", tone: .danger)
    case .unknown:
        return PresentationBadge(label: "unknown", systemImageName: "questionmark.circle", tone: .warning)
    }
}

public func diagnosticSeverityBadge(_ severity: DiagnosticSeverity) -> PresentationBadge {
    switch severity {
    case .info:
        return PresentationBadge(label: "info", systemImageName: "info.circle", tone: .neutral)
    case .warning:
        return PresentationBadge(label: "warning", systemImageName: "exclamationmark.triangle", tone: .warning)
    case .error:
        return PresentationBadge(label: "error", systemImageName: "xmark.octagon", tone: .danger)
    }
}

public func providerBadge(providerMode: ProviderMode, snapshotProvider: ProviderIdentity?) -> PresentationBadge {
    if snapshotProvider == .demoFixture || providerMode == .fixture {
        return PresentationBadge(label: "fixture mode", systemImageName: "testtube.2", tone: .accent)
    }
    return PresentationBadge(label: "live mode", systemImageName: "antenna.radiowaves.left.and.right", tone: .success)
}

public func snapshotSourceLine(snapshot: ControlPlaneSnapshot?, providerMode: ProviderMode) -> String {
    guard let snapshot else {
        return "Provider: \(providerMode.rawValue) · Snapshot unavailable · Summary unavailable"
    }
    return "Provider: \(snapshot.provider.rawValue) · Summary: \(snapshot.summarySource.rawValue) metadata · Updated: \(snapshot.generatedAt)"
}

public func sessionSubtitle(_ session: AgentSession) -> String {
    [
        session.state.rawValue.replacingOccurrences(of: "_", with: " "),
        progressLabel(session.progress),
        session.workspace,
        session.model,
        "\(session.observation.rawValue) metadata"
    ].compactMap { $0 }.joined(separator: " · ")
}

public func progressLabel(_ progress: Double?) -> String? {
    guard let progress else { return nil }
    let bounded = max(0, min(progress, 1))
    return "\(Int((bounded * 100).rounded()))%"
}

public func selectedSession(in sessions: [AgentSession], selectedId: String?) -> AgentSession? {
    if let selectedId, let selected = sessions.first(where: { $0.id == selectedId }) {
        return selected
    }
    return sessions.first
}

public func selectedWindow(in windows: [RepoPromptWindow], selectedId: Int?) -> RepoPromptWindow? {
    if let selectedId, let selected = windows.first(where: { $0.id == selectedId }) {
        return selected
    }
    return windows.first
}

public func selectedTab(in window: RepoPromptWindow?, selectedContextId: String?) -> RepoPromptTab? {
    guard let window else { return nil }
    if let selectedContextId, let selected = window.tabs.first(where: { $0.contextId == selectedContextId }) {
        return selected
    }
    return window.tabs.first(where: { $0.active }) ?? window.tabs.first
}

public func sessionMetadataRows(_ session: AgentSession) -> [PresentationMetadataRow] {
    var rows: [PresentationMetadataRow] = [
        PresentationMetadataRow(key: "ID", value: session.id, id: "core:ID"),
        PresentationMetadataRow(key: "State", value: session.state.rawValue, id: "core:State"),
        PresentationMetadataRow(key: "Observation", value: session.observation.rawValue, id: "core:Observation")
    ]
    if let workspace = session.workspace { rows.append(PresentationMetadataRow(key: "Workspace", value: workspace, id: "core:Workspace")) }
    if let model = session.model { rows.append(PresentationMetadataRow(key: "Model", value: model, id: "core:Model")) }
    if let progress = progressLabel(session.progress) { rows.append(PresentationMetadataRow(key: "Progress", value: progress, id: "core:Progress")) }
    if let updatedAt = session.updatedAt { rows.append(PresentationMetadataRow(key: "Updated", value: updatedAt, id: "core:Updated")) }
    if let workflowId = session.workflowId { rows.append(PresentationMetadataRow(key: "Workflow", value: workflowId, id: "core:Workflow")) }
    if let parentSessionId = session.parentSessionId { rows.append(PresentationMetadataRow(key: "Parent", value: parentSessionId, id: "core:Parent")) }
    for key in (session.metadata ?? [:]).keys.sorted() {
        rows.append(PresentationMetadataRow(key: key, value: metadataValueLabel(session.metadata?[key]), id: "metadata:\(key)"))
    }
    return rows
}

public func capabilityPrivacyLine(_ capability: CapabilityMatrixEntry) -> String {
    switch capability.privacyClass {
    case .metadata:
        return "metadata-only · \(capability.observation.rawValue)"
    case .transcript, .logExcerpt:
        return "\(capability.privacyClass.rawValue) unavailable unless explicitly requested · \(capability.observation.rawValue)"
    case .localOnly:
        return "local-only metadata · \(capability.observation.rawValue)"
    }
}

public func unavailableSummaryText(snapshot: ControlPlaneSnapshot?) -> String? {
    guard let snapshot else { return "No snapshot available. Refresh to collect metadata-only provider state." }
    if snapshot.sessions.isEmpty {
        return "No session rows are available. Placeholder rows are marked unavailable and are not counted as real sessions."
    }
    return nil
}

private func metadataValueLabel(_ value: MetadataValue?) -> String {
    switch value {
    case .string(let string): return string
    case .number(let number): return String(number)
    case .bool(let bool): return bool ? "true" : "false"
    case .null: return "null"
    case nil: return "unavailable"
    }
}
