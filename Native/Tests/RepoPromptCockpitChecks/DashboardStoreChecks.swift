import Foundation
import RepoPromptCockpitCore

@MainActor
func dashboardStoreCoalescesRefreshes() async throws {
    let provider = ScriptedProvider(
        name: .demoFixture,
        snapshots: [dashboardStoreSnapshot(provider: .demoFixture, generatedAt: "2026-05-14T00:00:00Z")],
        delayNanoseconds: 120_000_000
    )
    let store = DashboardStore(fixtureProvider: provider, now: { "2026-05-14T00:00:01Z" })

    async let first = store.refresh(reason: .manual)
    try await Task.sleep(nanoseconds: 20_000_000)
    async let second = store.refresh(reason: .manual)
    let outcomes = await [first, second]

    let providerCalls = await provider.callCount()
    try check(outcomes == [.applied(provider: .demoFixture), .applied(provider: .demoFixture)], "coalesced refresh callers should observe the same applied outcome")
    try check(providerCalls == 1, "concurrent refresh calls should coalesce into one provider collection")
    try check(store.latestSnapshot?.provider == .demoFixture, "coalesced refresh should apply fixture snapshot")
    try check(store.isRefreshing == false, "store should leave refreshing state after coalesced refresh")
}

@MainActor
func dashboardStoreIgnoresStaleProviderSwitchResults() async throws {
    let liveProvider = ScriptedProvider(
        name: .rpCli,
        snapshots: [dashboardStoreSnapshot(provider: .rpCli, generatedAt: "2026-05-14T00:00:00Z", sessionId: "live-session")],
        delayNanoseconds: 160_000_000
    )
    let fixtureProvider = ScriptedProvider(
        name: .demoFixture,
        snapshots: [dashboardStoreSnapshot(provider: .demoFixture, generatedAt: "2026-05-14T00:00:01Z", sessionId: "fixture-session")]
    )
    let store = DashboardStore(initialProviderMode: .live, liveProvider: liveProvider, fixtureProvider: fixtureProvider, now: { "2026-05-14T00:00:02Z" })

    async let liveOutcome = store.refresh(reason: .manual)
    try await Task.sleep(nanoseconds: 30_000_000)
    let switchOutcome = await store.setProviderMode(.fixture, refreshImmediately: true)
    let staleOutcome = await liveOutcome

    try check(switchOutcome == .applied(provider: .demoFixture), "provider switch should apply new fixture provider snapshot")
    try check(staleOutcome == .staleResultIgnored(provider: .rpCli), "slow old-provider result should be ignored as stale")
    try check(store.providerMode == .fixture, "store should remain in fixture mode")
    try check(store.latestSnapshot?.provider == .demoFixture, "stale live snapshot must not replace fixture snapshot")
    try check(store.latestSnapshot?.sessions.first?.id == "fixture-session", "latest snapshot should come from switched provider")
}

@MainActor
func dashboardStoreBuildsDiagnosticFallbackForProviderErrors() async throws {
    let provider = ScriptedProvider(name: .demoFixture, error: ScriptedProviderError(message: "boom"))
    let store = DashboardStore(fixtureProvider: provider, now: { "2026-05-14T00:00:03Z" })

    let outcome = await store.refresh(reason: .manual)

    try check(outcome == .diagnosticFallback(provider: .demoFixture), "thrown provider errors should become diagnostic fallback snapshots")
    try check(store.latestSnapshot?.provider == .demoFixture, "fallback snapshot should preserve provider identity")
    try check(store.latestSnapshot?.summarySource == .unavailable, "fallback snapshot should mark summary unavailable")
    try check(store.latestSnapshot?.diagnostics.first?.code == "provider_collection_failed", "fallback snapshot should expose provider_collection_failed diagnostic")
    try check(store.derivedState.attentionItems.first?.id == "diagnostic-provider_collection_failed", "fallback diagnostic should feed attention reducer")
}

@MainActor
func dashboardStoreTracksModeSelectionFilterAndTabs() async throws {
    let snapshot = dashboardStoreSnapshot(provider: .demoFixture, generatedAt: "2026-05-14T00:00:04Z", includeWaitingSession: true)
    let provider = ScriptedProvider(name: .demoFixture, snapshots: [snapshot])
    let store = DashboardStore(fixtureProvider: provider, now: { "2026-05-14T00:00:05Z" })

    _ = await store.refresh(reason: .initial)
    try check(store.selectedSessionId == "session-running", "initial refresh should select the first visible session")
    try check(store.selectedWindowId == 42, "initial refresh should select the first window")
    try check(store.selectedContextId == "ctx-1", "initial refresh should select the active context")

    store.setSessionFilter(.waitingForInput)
    try check(store.derivedState.visibleSessions.map(\.id) == ["session-waiting"], "session filter should drive visible sessions")
    try check(store.selectedSessionId == "session-waiting", "selection should move to a visible session after filtering")

    store.setWindowMode(.minimal)
    store.selectTab(.logs)
    store.selectWindow(id: 42)
    store.selectContext(id: "ctx-2")
    store.selectSession(id: "session-waiting")

    try check(store.windowMode == .minimal, "window mode should be mutable store state")
    try check(store.selectedTab == .logs, "selected dashboard tab should be mutable store state")
    try check(store.selectedWindowId == 42, "selected window should be mutable store state")
    try check(store.selectedContextId == "ctx-2", "selected tab context should be mutable store state")
    try check(store.selectedSessionId == "session-waiting", "selected session should be mutable store state")
}

private actor ScriptedProvider: RepoPromptProvider {
    nonisolated let name: ProviderIdentity
    private let snapshots: [ControlPlaneSnapshot]
    private let delayNanoseconds: UInt64
    private let error: Error?
    private var count = 0

    init(name: ProviderIdentity, snapshots: [ControlPlaneSnapshot] = [], delayNanoseconds: UInt64 = 0, error: Error? = nil) {
        self.name = name
        self.snapshots = snapshots
        self.delayNanoseconds = delayNanoseconds
        self.error = error
    }

    func collectSnapshot() async throws -> ControlPlaneSnapshot {
        count += 1
        let index = max(0, min(count - 1, snapshots.count - 1))
        if delayNanoseconds > 0 {
            try await Task.sleep(nanoseconds: delayNanoseconds)
        }
        if let error { throw error }
        return snapshots[index]
    }

    func callCount() -> Int { count }
}

private struct ScriptedProviderError: Error, CustomStringConvertible, Sendable {
    var message: String
    var description: String { message }
}

private func dashboardStoreSnapshot(
    provider: ProviderIdentity,
    generatedAt: String,
    sessionId: String = "session-running",
    includeWaitingSession: Bool = false
) -> ControlPlaneSnapshot {
    var sessions = [
        AgentSession(
            id: sessionId,
            title: "Running Session",
            workspace: "Workspace",
            state: .running,
            updatedAt: generatedAt,
            observation: provider == .demoFixture ? .fixture : .observed,
            summary: "Running metadata-only summary."
        )
    ]
    if includeWaitingSession {
        sessions.append(
            AgentSession(
                id: "session-waiting",
                title: "Waiting Session",
                workspace: "Workspace",
                state: .waitingForInput,
                updatedAt: generatedAt,
                observation: .fixture,
                summary: "Needs input."
            )
        )
    }

    return ControlPlaneSnapshot(
        generatedAt: generatedAt,
        provider: provider,
        windows: [
            RepoPromptWindow(
                id: 42,
                workspace: "Workspace",
                activeContextId: "ctx-1",
                tabs: [
                    RepoPromptTab(name: "Main", contextId: "ctx-1", active: true, observation: .fixture),
                    RepoPromptTab(name: "Review", contextId: "ctx-2", active: false, observation: .fixture)
                ],
                observation: provider == .demoFixture ? .fixture : .observed
            )
        ],
        sessions: sessions,
        capabilities: [
            CapabilityMatrixEntry(field: "copySummary", source: "local deterministic summary", requiresBinding: false, parseFormat: .none, failureMode: "none", privacyClass: .metadata, observation: provider == .demoFixture ? .fixture : .observed, status: .available)
        ],
        diagnostics: [],
        summarySource: provider == .demoFixture ? .fixture : .observed
    )
}
