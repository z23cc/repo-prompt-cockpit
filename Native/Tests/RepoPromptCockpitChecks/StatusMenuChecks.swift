import Foundation
import RepoPromptCockpitCore

func statusMenuModelGroupsFixtureSnapshot() async throws {
    let snapshot = try await DemoFixtureProvider(now: { "2026-04-28T00:00:00Z" }).collectSnapshot()
    let model = buildStatusMenuModel(snapshot: snapshot, windowMode: .desktop, providerMode: .fixture)
    let titles = model.items.map(\.title)

    try check(model.statusTitle == "RPC demo 5s 2▶ 1?", "fixture status title should include session/running/waiting counts")
    for section in ["Focus next", "Sessions", "Workspaces", "Capabilities", "Diagnostics", "Actions"] {
        try check(titles.contains(section), "menu should include \(section) section")
    }
    try check(titles.contains("[fixture] Release Gate"), "focus next should include fixture observation label")
    try check(titles.firstIndex(of: "Waiting (1)")! < titles.firstIndex(of: "Blocked (1)")!, "session groups should prioritize waiting before blocked")
    try check(titles.contains("[fixture] RepoPrompt-control-plane"), "workspace rows should include observation label and workspace")
    try check(titles.contains("[unavailable] unavailable: agentLogs"), "capabilities should label unavailable transcript/log capability")
    try check(titles.contains("[fixture] info: fixture_mode"), "diagnostics should label fixture diagnostics")
    try check(titles.contains("Use live rp-cli mode"), "fixture snapshots should offer live switch")
    try check(!titles.contains("Use fixture demo mode"), "fixture snapshots should not offer redundant fixture switch")
    try check(model.items.contains { $0.action == .copySummary && $0.isEnabled }, "copy summary action should be enabled")
}

func statusMenuModelHandlesUnavailableAndLiveDiagnostics() throws {
    let unavailable = buildStatusMenuModel(snapshot: nil, windowMode: .minimal, providerMode: .fixture)
    try check(unavailable.statusTitle == "RPC …", "nil snapshot title should communicate unknown status")
    try check(unavailable.items.contains { $0.title == "No snapshot available" }, "nil snapshot should expose unavailable row")
    try check(unavailable.items.contains { $0.title == "Restore full cockpit" && $0.action == .toggleWindowMode }, "minimal mode should expose restore action")

    let liveErrorSnapshot = ControlPlaneSnapshot(
        generatedAt: "2026-05-14T00:00:00Z",
        provider: .rpCli,
        windows: [],
        sessions: [],
        capabilities: [],
        diagnostics: [ProviderDiagnostic(code: "rp_cli_unavailable", message: "rp-cli missing", severity: .error, observedAt: "2026-05-14T00:00:00Z")],
        summarySource: .unavailable
    )
    let live = buildStatusMenuModel(snapshot: liveErrorSnapshot, windowMode: .desktop, providerMode: .live)
    let titles = live.items.map(\.title)
    try check(live.statusTitle == "RPC ! 1", "live error title should highlight diagnostic error count")
    try check(titles.contains("[observed] error: rp_cli_unavailable"), "live diagnostics should use observed label")
    try check(titles.contains("[unavailable] No live session rows available"), "empty live sessions should render unavailable session row")
    try check(titles.contains("Use fixture demo mode"), "live snapshots should offer fixture switch")
}

@MainActor
func dashboardStoreShellActionsDriveSummaryAndMode() async throws {
    let store = DashboardStore(fixtureProvider: DemoFixtureProvider(now: { "2026-04-28T00:00:00Z" }))
    _ = await store.refresh(reason: .initial)

    let summary = store.copySummaryText()
    try check(summary.contains("Repo Prompt Cockpit (demo-fixture, fixture-backed)"), "store copy summary should come from deterministic reducer output")
    try check(summary.contains("Focus next [fixture]: Release Gate"), "store copy summary should include focus reducer output")

    try check(store.windowMode == .desktop, "store should start in desktop mode")
    try check(store.toggleWindowMode() == .minimal, "first shell toggle should enter minimal mode")
    try check(store.windowMode == .minimal, "minimal mode should be stored on DashboardStore")
    try check(store.toggleWindowMode() == .desktop, "second shell toggle should restore desktop mode")
}
