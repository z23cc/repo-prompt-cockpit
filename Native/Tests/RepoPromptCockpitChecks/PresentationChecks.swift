import Foundation
import RepoPromptCockpitCore

func presentationHelpersPreserveTruthfulLabels() async throws {
    let snapshot = try await DemoFixtureProvider(now: { "2026-05-14T00:00:00Z" }).collectSnapshot()

    try check(observationBadge(.fixture).label == "fixture", "fixture observation should be labeled explicitly")
    try check(observationBadge(.unavailable).label == "unavailable", "unavailable observation should be labeled explicitly")
    try check(snapshotSourceLine(snapshot: snapshot, providerMode: .fixture).contains("Summary: fixture metadata"), "source line should disclose fixture summary metadata")

    let logs = try require(snapshot.capabilities.first { $0.field == "agentLogs" }, "agentLogs fixture capability should exist")
    let privacyLine = capabilityPrivacyLine(logs)
    try check(privacyLine.contains("transcript unavailable unless explicitly requested"), "transcript/log capability should not imply body collection")
    try check(capabilityStatusBadge(logs.status).label == "unavailable", "unavailable capability should render as unavailable")
}

func presentationHelpersClampProgressAndFallbackSelection() async throws {
    let snapshot = try await DemoFixtureProvider(now: { "2026-05-14T00:00:00Z" }).collectSnapshot()

    try check(progressLabel(-0.5) == "0%", "negative progress should clamp to 0%")
    try check(progressLabel(1.7) == "100%", "progress over 1 should clamp to 100%")
    try check(progressLabel(nil) == nil, "nil progress should stay unavailable instead of becoming fake 0%")

    let firstSession = try require(snapshot.sessions.first, "fixture should have sessions")
    try check(selectedSession(in: snapshot.sessions, selectedId: "missing")?.id == firstSession.id, "missing session selection should fall back to first visible session")
    try check(selectedWindow(in: snapshot.windows, selectedId: 999)?.id == snapshot.windows.first?.id, "missing window selection should fall back to first observed window")
    try check(selectedTab(in: snapshot.windows.first, selectedContextId: "missing")?.contextId == snapshot.windows.first?.activeContextId, "missing context should fall back to active tab")
}

func presentationHelpersDoNotCountPlaceholderAsRealActivity() throws {
    let snapshot = ControlPlaneSnapshot(
        generatedAt: "2026-05-14T00:00:00Z",
        provider: .rpCli,
        windows: [],
        sessions: [],
        capabilities: [],
        diagnostics: [],
        summarySource: .unavailable
    )
    let derived = DashboardDerivedState.derive(from: snapshot, filter: .all)

    try check(derived.statusCounts.sessions == 0, "placeholder should not alter session count")
    try check(unavailableSummaryText(snapshot: snapshot)?.contains("not counted as real sessions") == true, "empty snapshot message should disclose placeholder truthfulness")
}
