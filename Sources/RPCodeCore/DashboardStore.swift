import Combine
import Foundation

public enum DashboardRefreshReason: String, Codable, Equatable, Sendable {
    case initial
    case manual
    case polling
    case providerSwitch = "provider_switch"
}

public enum DashboardRefreshOutcome: Equatable, Sendable {
    case applied(provider: ProviderIdentity)
    case diagnosticFallback(provider: ProviderIdentity)
    case staleResultIgnored(provider: ProviderIdentity)
}

public enum DashboardTab: String, Codable, Equatable, Hashable, Sendable, CaseIterable {
    case plan
    case activity
    case artifacts
    case logs
    case results

    public var label: String {
        switch self {
        case .plan: return "Plan"
        case .activity: return "Activity"
        case .artifacts: return "Artifacts"
        case .logs: return "Logs"
        case .results: return "Results"
        }
    }

    public var isBodyAvailableInCockpit: Bool {
        switch self {
        case .plan, .activity: return true
        case .artifacts, .logs, .results: return false
        }
    }
}

public enum DashboardSessionFilter: String, Codable, Equatable, Hashable, Sendable {
    case all
    case running
    case waitingForInput = "waiting_for_input"
    case blocked
    case completed
    case failed
    case idle
    case unknown

    func includes(_ session: AgentSession) -> Bool {
        switch self {
        case .all: return true
        case .running: return session.state == .running
        case .waitingForInput: return session.state == .waitingForInput
        case .blocked: return session.state == .blocked
        case .completed: return session.state == .completed
        case .failed: return session.state == .failed
        case .idle: return session.state == .idle
        case .unknown: return session.state == .unknown
        }
    }
}

public struct DashboardDerivedState: Equatable, Sendable {
    public var dashboard: ControlPlaneDashboard?
    public var statusCounts: StatusCounts
    public var implementationItems: [ImplementationPlanItem]
    public var attentionItems: [AttentionItem]
    public var workspaces: [WorkspaceView]
    public var sessionGroups: [SessionGroupView]
    public var sessionTree: [SessionTreeNode]
    public var sessionTreeView: SessionTreeView
    public var activityPanel: ActivityPanelView
    public var capabilityRows: [CapabilityRowView]
    public var privacyBanner: PrivacyBannerView
    public var visibleSessions: [AgentSession]
    public var clipboardSummary: String

    public static let empty = DashboardDerivedState(
        dashboard: nil,
        statusCounts: StatusCounts(workspaces: 0, sessions: 0, running: 0, waitingForInput: 0, blocked: 0, failed: 0, completed: 0, idle: 0, unknown: 0),
        implementationItems: [.unavailablePlaceholder],
        attentionItems: [],
        workspaces: [],
        sessionGroups: [],
        sessionTree: [],
        sessionTreeView: SessionTreeView(roots: [], mode: .flat, modeLabel: "flat sessions (parent link unavailable)"),
        activityPanel: deriveActivityPanel(focusItems: [], implementationItems: [.unavailablePlaceholder]),
        capabilityRows: [],
        privacyBanner: PrivacyBannerView(label: "Read-only cockpit", detail: "Transcript/log bodies are not loaded or uploaded by default.", severity: .safe),
        visibleSessions: [],
        clipboardSummary: "RP Code\nNo snapshot available."
    )

    public static func derive(from snapshot: ControlPlaneSnapshot, filter: DashboardSessionFilter) -> DashboardDerivedState {
        let dashboard = createControlPlaneDashboard(snapshot: snapshot)
        return DashboardDerivedState(
            dashboard: dashboard,
            statusCounts: dashboard.statusCounts,
            implementationItems: dashboard.implementationPlan.items,
            attentionItems: dashboard.focusItems,
            workspaces: dashboard.workspaces,
            sessionGroups: dashboard.sessionGroups,
            sessionTree: deriveSessionTree(from: snapshot),
            sessionTreeView: dashboard.sessionTree,
            activityPanel: dashboard.activityPanel,
            capabilityRows: dashboard.capabilityRows,
            privacyBanner: dashboard.privacyBanner,
            visibleSessions: snapshot.sessions.filter { filter.includes($0) },
            clipboardSummary: summarizeForClipboard(snapshot: snapshot)
        )
    }
}

@MainActor
public final class DashboardStore: ObservableObject {
    @Published public private(set) var providerMode: ProviderMode
    @Published public private(set) var windowMode: WindowMode
    @Published public private(set) var selectedTab: DashboardTab
    @Published public private(set) var sessionFilter: DashboardSessionFilter
    @Published public private(set) var selectedSessionId: String?
    @Published public private(set) var selectedWindowId: Int?
    @Published public private(set) var selectedContextId: String?
    @Published public private(set) var latestSnapshot: ControlPlaneSnapshot?
    @Published public private(set) var derivedState: DashboardDerivedState
    @Published public private(set) var isRefreshing: Bool
    @Published public private(set) var lastRefreshReason: DashboardRefreshReason?
    @Published public private(set) var lastRefreshOutcome: DashboardRefreshOutcome?

    private let liveProvider: any RepoPromptProvider
    private let fixtureProvider: any RepoPromptProvider
    private let now: @Sendable () -> String
    private var generation = 0
    private var activeRefreshGeneration: Int?
    private var activeRefreshTask: Task<DashboardRefreshOutcome, Never>?
    private var pollingTask: Task<Void, Never>?

    public init(
        initialProviderMode: ProviderMode = .fixture,
        initialWindowMode: WindowMode = .desktop,
        liveProvider: any RepoPromptProvider = RpCliLiveProvider(),
        fixtureProvider: any RepoPromptProvider = DemoFixtureProvider(),
        now: @escaping @Sendable () -> String = { ISO8601DateFormatter().string(from: Date()) }
    ) {
        self.providerMode = initialProviderMode
        self.windowMode = initialWindowMode
        self.selectedTab = .plan
        self.sessionFilter = .all
        self.liveProvider = liveProvider
        self.fixtureProvider = fixtureProvider
        self.now = now
        self.latestSnapshot = nil
        self.derivedState = .empty
        self.isRefreshing = false
    }

    deinit {
        activeRefreshTask?.cancel()
        pollingTask?.cancel()
    }

    public func refresh(reason: DashboardRefreshReason = .manual) async -> DashboardRefreshOutcome {
        if activeRefreshGeneration == generation, let activeRefreshTask {
            return await activeRefreshTask.value
        }
        return await startRefresh(reason: reason).value
    }

    @discardableResult
    public func setProviderMode(_ mode: ProviderMode, refreshImmediately: Bool = true) async -> DashboardRefreshOutcome? {
        guard providerMode != mode else {
            return refreshImmediately ? await refresh(reason: .providerSwitch) : nil
        }

        generation += 1
        providerMode = mode
        lastRefreshReason = .providerSwitch
        lastRefreshOutcome = nil
        latestSnapshot = nil
        derivedState = .empty
        selectedSessionId = nil
        selectedWindowId = nil
        selectedContextId = nil
        isRefreshing = false
        activeRefreshGeneration = nil
        activeRefreshTask = nil

        guard refreshImmediately else { return nil }
        return await refresh(reason: .providerSwitch)
    }

    public func setWindowMode(_ mode: WindowMode) {
        windowMode = mode
    }

    @discardableResult
    public func toggleWindowMode() -> WindowMode {
        let nextMode: WindowMode = windowMode == .minimal ? .desktop : .minimal
        setWindowMode(nextMode)
        return nextMode
    }

    public func copySummaryText() -> String {
        derivedState.clipboardSummary
    }

    public func selectTab(_ tab: DashboardTab) {
        selectedTab = tab
    }

    public func setSessionFilter(_ filter: DashboardSessionFilter) {
        sessionFilter = filter
        if let snapshot = latestSnapshot {
            derivedState = .derive(from: snapshot, filter: filter)
            validateSelection(in: snapshot)
        }
    }

    public func selectSession(id: String?) {
        selectedSessionId = id
    }

    public func selectWindow(id: Int?) {
        selectedWindowId = id
    }

    public func selectContext(id: String?) {
        selectedContextId = id
    }

    public func startPolling(every interval: TimeInterval) {
        stopPolling()
        let boundedInterval = max(0.25, interval)
        pollingTask = Task { [weak self] in
            while !Task.isCancelled {
                let nanoseconds = UInt64(boundedInterval * 1_000_000_000)
                try? await Task.sleep(nanoseconds: nanoseconds)
                if Task.isCancelled { break }
                _ = await self?.refresh(reason: .polling)
            }
        }
    }

    public func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }

    private func startRefresh(reason: DashboardRefreshReason) -> Task<DashboardRefreshOutcome, Never> {
        let refreshGeneration = generation
        let provider = providerForCurrentMode()
        let expectedProvider = provider.name
        lastRefreshReason = reason
        isRefreshing = true

        let providerTask = Task.detached(priority: .userInitiated) { () -> Result<ControlPlaneSnapshot, Error> in
            do {
                return .success(try await provider.collectSnapshot())
            } catch {
                return .failure(error)
            }
        }

        let applyTask = Task { [weak self] in
            let result = await providerTask.value
            return self?.completeRefresh(
                generation: refreshGeneration,
                expectedProvider: expectedProvider,
                result: result
            ) ?? .staleResultIgnored(provider: expectedProvider)
        }

        activeRefreshGeneration = refreshGeneration
        activeRefreshTask = applyTask
        return applyTask
    }

    private func completeRefresh(
        generation refreshGeneration: Int,
        expectedProvider: ProviderIdentity,
        result: Result<ControlPlaneSnapshot, Error>
    ) -> DashboardRefreshOutcome {
        guard refreshGeneration == generation, providerForCurrentMode().name == expectedProvider else {
            return .staleResultIgnored(provider: expectedProvider)
        }

        let snapshot: ControlPlaneSnapshot
        let outcome: DashboardRefreshOutcome
        switch result {
        case .success(let collected):
            guard collected.provider == expectedProvider else {
                return .staleResultIgnored(provider: collected.provider)
            }
            snapshot = collected
            outcome = .applied(provider: collected.provider)
        case .failure(let error):
            snapshot = diagnosticFallbackSnapshot(provider: expectedProvider, error: error)
            outcome = .diagnosticFallback(provider: expectedProvider)
        }

        apply(snapshot: snapshot)
        isRefreshing = false
        activeRefreshGeneration = nil
        activeRefreshTask = nil
        lastRefreshOutcome = outcome
        return outcome
    }

    private func apply(snapshot: ControlPlaneSnapshot) {
        latestSnapshot = snapshot
        derivedState = .derive(from: snapshot, filter: sessionFilter)
        validateSelection(in: snapshot)
    }

    private func validateSelection(in snapshot: ControlPlaneSnapshot) {
        if let selectedSessionId, !derivedState.visibleSessions.contains(where: { $0.id == selectedSessionId }) {
            self.selectedSessionId = derivedState.visibleSessions.first?.id
        } else if selectedSessionId == nil {
            selectedSessionId = derivedState.visibleSessions.first?.id
        }

        if let selectedWindowId, !snapshot.windows.contains(where: { $0.id == selectedWindowId }) {
            self.selectedWindowId = snapshot.windows.first?.id
        } else if selectedWindowId == nil {
            selectedWindowId = snapshot.windows.first?.id
        }

        if let selectedContextId, !snapshot.windows.flatMap(\.tabs).contains(where: { $0.contextId == selectedContextId }) {
            self.selectedContextId = snapshot.windows.first?.activeContextId ?? snapshot.windows.flatMap(\.tabs).first?.contextId
        } else if selectedContextId == nil {
            selectedContextId = snapshot.windows.first?.activeContextId ?? snapshot.windows.flatMap(\.tabs).first?.contextId
        }
    }

    private func providerForCurrentMode() -> any RepoPromptProvider {
        switch providerMode {
        case .live: return liveProvider
        case .fixture: return fixtureProvider
        }
    }

    private func diagnosticFallbackSnapshot(provider: ProviderIdentity, error: Error) -> ControlPlaneSnapshot {
        let generatedAt = now()
        return ControlPlaneSnapshot(
            generatedAt: generatedAt,
            provider: provider,
            windows: [],
            sessions: [],
            capabilities: [],
            diagnostics: [
                ProviderDiagnostic(
                    code: "provider_collection_failed",
                    message: String(describing: error),
                    severity: .error,
                    observedAt: generatedAt
                )
            ],
            summarySource: .unavailable
        )
    }
}
