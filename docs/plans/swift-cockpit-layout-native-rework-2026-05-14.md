# Swift Cockpit — Native Layout Rework (2026-05-14)

## Goal
Collapse the current de-facto 4-column desktop layout into a clean 3-zone macOS
composition built from **native SwiftUI structural components**, fixing the
"割裂感" without touching store / domain / reducers / provider behavior.

## Hard constraints
- UI containers + presentation helpers only. Do NOT change `DashboardStore`,
  `Reducers.swift`, `Models.swift`, provider code, or domain logic.
- Preserve TS/Electron functional parity and the read-only / truthfulness
  contract (unavailable / fixture / observed / inferred labels).
- Every phase must pass:
  - `swift build --package-path Native`
  - `swift run --package-path Native RepoPromptCockpitChecks`
- `MinimalCockpitView` stays as-is unless a change is strictly required.

## Target composition
```
NavigationSplitView {
  Sidebar  -> header (Provider badge + source line)
            + compact CountStrip
            + Sub-agents / Session master list (grouped by status)
            + Privacy / read-only footer
} detail {
  Main     -> Focus Queue (center stage, prioritized attention items)
            + Workflow Details (selected session/tab)
            + provider/refresh/copy controls moved to window .toolbar
}
.inspector(isPresented:) {
  Context Focus + Tabs & Contexts + Snapshot Progress (collapsible groups)
}
```

## Work items

- [x] **Item 1 — Foundation: native shell + status color model** (done: NavigationSplitView + .inspector with <macOS14 legacy fallback; sessionStateColor/statusCountColor in Presentation.swift; CountStrip + session card wired; build + checks pass)
  - Replace `DesktopCockpitView` HStack/fixed-width composition with
    `NavigationSplitView` (sidebar + detail) and the macOS 14+ `.inspector()`
    modifier for the right rail. Drop hand-rolled `cockpitPanel` columns where
    the native chrome now provides it; keep panel styling only inside content.
  - Add a single `SessionState -> Color` (and status-count color) mapping in
    `Native/Sources/RepoPromptCockpitCore/Presentation.swift`. UI must only
    reference this mapping — no per-file color literals.
  - Done when: app builds + checks pass; desktop view renders via
    `NavigationSplitView` + `.inspector`; sidebar collapses and inspector
    toggles via native chrome; color mapping exists and is referenced by at
    least the count strip / session cards.
  - Key files: `ContentView.swift`, `Presentation.swift`.

- [x] **Item 2 — Sidebar + Sub-agents master list** (done: sidebar = header + compact CountStrip + status-grouped "Sub-agents" master list + privacy footer; detail pane no longer carries the session column; build + checks pass)
  - Rework `CockpitSidebarView` into lightweight nav: header + compact
    `CountStrip` + Privacy footer.
  - Move `WorkspaceSessionListView` (sessions/sub-agents) into the sidebar as
    the master list, grouped by status (Running / Blocked / Waiting / others),
    using the Item 1 color model. Keep filter chips + truthful empty states.
  - Selection still drives `store.selectSession` / `store.selectTab`.
  - Done when: sidebar holds nav + master list; main content no longer carries
    the session list as a separate column; build + checks pass.
  - Key files: `ContentView.swift`, `CockpitComponents.swift`.
  - Depends on: Item 1.

- [x] **Item 3 — Main Focus Queue + window toolbar + inspector finalize** (done: Focus Queue promoted to top of detail pane, bounded to 4 rows; Refresh/Copy/Live/Fixture/Mini/Inspector consolidated into window .toolbar, inline duplicates removed in macOS 14+ path; inspector group renamed "Context Focus"; oracle review applied — min-width, metadata row IDs, capped-count clarity; build + checks pass)
  - Main content: promote Focus Queue (attention items, prioritized) to center
    stage above Workflow Details; keep Plan/Activity/Artifacts/Logs/Results.
  - Move Refresh / Copy / provider (Live/Fixture) / window-mode controls into a
    native window `.toolbar` (in `RepoPromptCockpitApp.swift` / `ContentView`),
    removing the scattered duplicates in sidebar footer + workflow toolbar +
    composer.
  - Inspector: rename the context-rail "Focus" group to **Context Focus** to
    disambiguate from the center Focus Queue; finalize groups = Context Focus,
    Tabs & Contexts, Snapshot Progress.
  - Done when: Focus Queue is the visual lead in main content; controls live in
    the window toolbar with no leftover duplicates; inspector group renamed;
    build + checks pass.
  - Key files: `ContentView.swift`, `ActivityContextComponents.swift`,
    `RepoPromptCockpitApp.swift`.
  - Depends on: Item 1 (and coordinates with Item 2 on `ContentView.swift`).

## Deferred (not in scope)
- Proposal #3: vertical top/bottom split inside the main area. Revisit after
  the 3-zone structure is live.
- Developer ID signing / notarization / auto-update.

## Verification (final)
- `swift build --package-path Native` ✅
- `swift run --package-path Native RepoPromptCockpitChecks` ✅
- `pnpm verify` ✅ (TS suite + smokes unaffected)
- Restart app, confirm: sidebar collapse, inspector toggle, no scattered
  controls, Focus Queue prominent, status colors consistent.
