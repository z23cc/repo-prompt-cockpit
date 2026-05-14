import Foundation
import RPCodeCore

try await demoFixtureIsDeterministicAndPrivacyMarked()
try snapshotEnumsRoundTripWithTypeScriptRawValues()
placeholderRowsDoNotCountAsRealSessions()
try await reducersPrioritizeAttentionAndBuildTree()
try dashboardDomainMatchesTypeScriptParity()
try dashboardPlaceholdersMatchTypeScriptParity()
try await summaryIsMetadataOnlyAndBounded()
try rpCliCommandValidatorAllowsOnlyReadOnlyCommands()
try rpCliCommandValidatorRejectsUnsafeCommands()
try liveWindowsParserHandlesJsonAndTextFixture()
try liveSessionParserHandlesJsonMetadataAndMarkdownRows()
try liveBindingPlannerCoversTargetedReadOnlyAttempts()
try await liveProviderFallsBackBindsAndBuildsCapabilities()
try await liveProviderBuildsDiagnosticSnapshotsForFailures()
try await dashboardStoreCoalescesRefreshes()
try await dashboardStoreIgnoresStaleProviderSwitchResults()
try await dashboardStoreBuildsDiagnosticFallbackForProviderErrors()
try await dashboardStoreTracksModeSelectionFilterAndTabs()
try await statusMenuModelGroupsFixtureSnapshot()
try statusMenuModelHandlesUnavailableAndLiveDiagnostics()
try await dashboardStoreShellActionsDriveSummaryAndMode()
try await presentationHelpersPreserveTruthfulLabels()
try await presentationHelpersClampProgressAndFallbackSelection()
try presentationHelpersDoNotCountPlaceholderAsRealActivity()
print("RPCodeChecks passed")

func check(_ condition: @autoclosure () -> Bool, _ message: String) throws {
    if !condition() { throw CheckFailure(message) }
}

struct CheckFailure: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

func require<T>(_ value: T?, _ message: String) throws -> T {
    guard let value else { throw CheckFailure(message) }
    return value
}

func demoFixtureIsDeterministicAndPrivacyMarked() async throws {
    let provider = DemoFixtureProvider(now: { "2026-04-28T00:00:00Z" })
    let snapshot = try await provider.collectSnapshot()

    try check(snapshot.generatedAt == "2026-04-28T00:00:00Z", "generatedAt should be deterministic")
    try check(snapshot.provider == .demoFixture, "provider should be demo fixture")
    try check(snapshot.summarySource == .fixture, "summary source should be fixture")
    try check(snapshot.windows.first?.workspace == "RepoPrompt-control-plane", "workspace should match fixture")
    try check(snapshot.sessions.count == 5, "fixture should contain five sessions")
    try check(snapshot.diagnostics.first?.code == "fixture_mode", "fixture diagnostic should be present")

    let logs = try require(snapshot.capabilities.first { $0.field == "agentLogs" }, "agentLogs capability should exist")
    try check(logs.status == .unavailable, "agentLogs should be unavailable")
    try check(logs.observation == .unavailable, "agentLogs observation should be unavailable")
    try check(logs.privacyClass == .transcript, "agentLogs privacy class should be transcript")
}

func snapshotEnumsRoundTripWithTypeScriptRawValues() throws {
    let json = #"{"generatedAt":"2026-04-28T00:00:00Z","provider":"demo-fixture","windows":[],"sessions":[],"capabilities":[],"diagnostics":[],"summarySource":"fixture"}"#.data(using: .utf8)!
    let snapshot = try JSONDecoder().decode(ControlPlaneSnapshot.self, from: json)
    try check(snapshot.provider == .demoFixture, "provider raw value should decode")
    try check(snapshot.summarySource == .fixture, "observation raw value should decode")

    let encoded = try JSONEncoder().encode(snapshot)
    let encodedString = String(data: encoded, encoding: .utf8) ?? ""
    try check(encodedString.contains("demo-fixture"), "provider raw value should encode")
}

func placeholderRowsDoNotCountAsRealSessions() {
    let snapshot = ControlPlaneSnapshot(
        generatedAt: "2026-04-28T00:00:00Z",
        provider: .demoFixture,
        windows: [],
        sessions: [],
        capabilities: [],
        diagnostics: [],
        summarySource: .unavailable
    )

    let items = deriveImplementationItems(from: snapshot)
    precondition(items.count == 1, "empty snapshots should expose one placeholder")
    precondition(items.first?.observation == .unavailable, "placeholder should be unavailable")
    precondition(countRealSessions(in: items) == 0, "placeholder must not count as real session")
    precondition(deriveStatusCounts(from: snapshot).sessions == 0, "status counts should not count placeholders")
}

func reducersPrioritizeAttentionAndBuildTree() async throws {
    let snapshot = try await DemoFixtureProvider(now: { "2026-04-28T00:00:00Z" }).collectSnapshot()

    let attention = deriveAttentionItems(from: snapshot)
    try check(attention.first?.id == "fixture-release-gate", "waiting-for-input session should be first attention item")
    try check(attention.first?.state == .waitingForInput, "attention state should preserve waiting_for_input")

    let tree = deriveSessionTree(from: snapshot)
    let orchestrator = try require(tree.first { $0.session.id == "fixture-orchestrator-parent" }, "orchestrator parent should be a root")
    try check(orchestrator.children.map(\.session.id).sorted() == ["fixture-child-dashboard-tree", "fixture-child-security-review"], "observed children should attach under parent")
}

func summaryIsMetadataOnlyAndBounded() async throws {
    let snapshot = try await DemoFixtureProvider(now: { "2026-04-28T00:00:00Z" }).collectSnapshot()
    let summary = summarizeForClipboard(snapshot: snapshot, maxChars: 220)

    try check(summary.contains("RP Code (demo-fixture, fixture-backed)"), "summary should identify fixture provider")
    try check(summary.contains("Sessions: 5"), "summary should include session count")
    try check(summary.contains("Focus next [fixture]: Release Gate"), "summary should include metadata-only focus")
    try check(summary.count <= 220, "summary should be bounded")
    try check(!summary.contains("transcript"), "summary should avoid transcript/log body wording")
}

func rpCliCommandValidatorAllowsOnlyReadOnlyCommands() throws {
    try RpCliCommandValidator.validate(args: ["--help"])
    try RpCliCommandValidator.validate(args: ["-e", "windows"])
    try RpCliCommandValidator.validate(args: ["-e", "windows", "--raw-json"])
    try RpCliCommandValidator.validate(args: ["-c", "agent_manage", "-j", #"{"op":"list_sessions","limit":20}"#])
    try RpCliCommandValidator.validate(args: ["-c", "agent_manage", "-j", #"{"op":"list_sessions","limit":20,"working_dirs":["/abs/repo"]}"#])
    try RpCliCommandValidator.validate(args: ["-c", "agent_manage", "-j", #"{"op":"list_sessions","limit":20,"context_id":"ctx"}"#])
    try RpCliCommandValidator.validate(args: ["-c", "agent_manage", "-j", #"{"op":"list_sessions","limit":20,"window_id":123}"#])
    try RpCliCommandValidator.validate(args: ["-c", "agent_manage", "-j", #"{"_windowID":123,"op":"list_sessions","limit":20}"#])
}

func rpCliCommandValidatorRejectsUnsafeCommands() throws {
    try expectValidatorRejection(["-e", "sessions"])
    try expectValidatorRejection(["-c", "agent_manage", "-j", #"{"op":"delete_session","limit":20}"#])
    try expectValidatorRejection(["-c", "agent_manage", "-j", #"{"op":"list_sessions"}"#])
    try expectValidatorRejection(["-c", "agent_manage", "-j", #"{"op":"list_sessions","limit":0}"#])
    try expectValidatorRejection(["-c", "agent_manage", "-j", #"{"op":"list_sessions","limit":101}"#])
    try expectValidatorRejection(["-c", "agent_manage", "-j", #"{"op":"list_sessions","limit":1.5}"#])
    try expectValidatorRejection(["-c", "agent_manage", "-j", #"{"op":"list_sessions","limit":20,"include_logs":true}"#])
    try expectValidatorRejection(["-c", "agent_manage", "-j", #"{"op":"list_sessions","limit":20,"working_dirs":[""]}"#])
    try expectValidatorRejection(["-c", "agent_manage", "-j", #"{"op":"list_sessions","limit":20,"context_id":" "}"#])
    try expectValidatorRejection(["-c", "agent_manage", "-j", #"{"op":"list_sessions","limit":20,"window_id":0}"#])
    try expectValidatorRejection(["-c", "agent_manage", "-j", #"{"op":"list_sessions","limit":20,"_windowID":false}"#])
    try expectValidatorRejection(["-c", "agent_manage", "-j", "not json"])
}

func expectValidatorRejection(_ args: [String]) throws {
    do {
        try RpCliCommandValidator.validate(args: args)
        throw CheckFailure("validator should reject: \(args.joined(separator: " "))")
    } catch is RpCliCommandValidationError {
        return
    }
}
