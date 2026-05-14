# Swift Native Cockpit UI Redesign: Plan

## Goal

Redesign the Swift native Repo Prompt Cockpit into a more polished macOS surface: primary workflow content first, contextual inspector second, with no loss of the current TS/Electron functional contract.

## Background

- Current Swift desktop UI is a fixed four-region `HStack`: sidebar, workspace list, workflow column, context rail (`Native/Sources/RepoPromptCockpitApp/ContentView.swift:21-51`). The screenshot issue comes from these regions competing with equal visual weight.
- Functional parity comes from the current TS renderer: sidebar + workspace + main + context rail + composer, with minimal mode reduced to main + composer (`src/renderer/styles.css:122-139`).
- Visual direction comes from the 2026-04-28 redesign: macOS light surfaces, soft cards, sticky workflow context, truthful fixture/unavailable/inferred labels, and no fake unsupported data (`docs/designs/cockpit-redesign-2026-04-28.md:3-18`, `docs/designs/cockpit-redesign-2026-04-28.md:21-78`).
- User decisions: preserve current TS functionality; use the design doc plus macOS SwiftUI best practices for visual structure; keep all right-rail/status information, but present it as inspector summaries/collapsible groups.

## Approach

Use a macOS split-view composition, not another four-column clone. The recommended desktop shape is:

1. **Utility sidebar** — lightweight brand, provider/status summary, privacy posture, and primary actions. It does not pretend to be a `NavigationSplitView` source list until the app has real high-level navigation.
2. **Primary content** — workflow-first surface. Internally, this can use an `HSplitView` or equivalent nested split: a narrow session/workspace selector on the left and workflow toolbar/activity/details/composer as the dominant area.
3. **Inspector** — a right-side detail pane that replaces the always-dense context rail with grouped summaries and collapsible detail.

This is UI-composition work. `DashboardStore` remains the source for provider mode, selected session/filter/tab/context, snapshot, `derivedState`, refresh, and copy-summary actions. Reducers and presentation helpers continue to own truth labels, placeholders, counts, focus items, session tree, capabilities, diagnostics, and metadata-only summary.

Avoid SwiftUI `.inspector` for this milestone because the package baseline is macOS 13. Use split-view composition following Apple split-view guidance instead.

## Work Items

1. **Build the inspector in the existing rail mount**
   - Add `CockpitInspectorView` and `InspectorGroup` in `Native/Sources/RepoPromptCockpitApp/ActivityContextComponents.swift`.
   - Reuse current rail sections: workspace contexts, focus, progress, agents, body-access help, related workflows, capabilities, diagnostics.
   - Default expanded: Tabs & Contexts, Focus, Snapshot Progress. Default collapsed: Agents, Related workflows, Capabilities, Where to inspect bodies. Diagnostics expands only when warnings/errors exist.
   - Own expansion state as local SwiftUI UI state in the desktop/inspector view; it should survive refreshes but does not need `DashboardStore` or `UserDefaults` persistence.

2. **Replace `ContextRailView` content with the inspector**
   - Keep the old `ContextRailView` type only as a thin compatibility wrapper during migration.
   - Verify every section currently represented by `src/renderer/components/contextRail.ts` still appears in the inspector before changing the shell layout.

3. **Refactor desktop shell atomically**
   - In `Native/Sources/RepoPromptCockpitApp/ContentView.swift`, replace the fixed `DesktopCockpitView` `HStack` with a split composition: utility sidebar, `CockpitPrimaryContentView`, inspector.
   - Introduce `CockpitPrimaryContentView` in the same change; do not first render the session list both inside and outside the primary area.
   - Keep `MinimalCockpitView` separate and unchanged except for follow-up polish.

4. **Define the primary content layout**
   - Compose `WorkflowToolbarView`, `WorkspaceSessionListView`, `WorkflowActivityView`, and `ComposerStatusControlsView` without duplicating store logic.
   - Treat `WorkspaceSessionListView` as a subordinate selector inside primary content, not a peer root column.
   - Preserve all existing actions: refresh, copy summary, provider switch, window mode toggle, session selection, tab selection, and context selection.

5. **Tune layout and protect truthfulness**
   - Set explicit widths/minimums for the utility sidebar, session selector, workflow area, and inspector; validate `RepoPromptCockpitApp.swift` desktop minimum size after the refactor.
   - Preserve unavailable Artifacts/Logs/Results, fixture/observed/inferred/unavailable badges, disabled placeholders, and metadata-only copy summary.
   - Do not add brittle SwiftUI snapshot tests; rely on existing domain/store/status checks plus manual UI smoke for composition.

6. **Validation gate**
   - `swift build --package-path Native`
   - `swift run --package-path Native RepoPromptCockpitChecks`
   - Manual smoke: fixture desktop, live desktop, minimal mode, inspector expand/collapse, copy summary, refresh, status item open/toggle.

## Open Questions

None blocking. The plan assumes macOS 13+, split-view composition rather than SwiftUI `.inspector`, local non-persistent inspector expansion state, and a utility sidebar that stays visible but lighter.

## References

- Swift UI seams: `Native/Sources/RepoPromptCockpitApp/ContentView.swift`, `Native/Sources/RepoPromptCockpitApp/ActivityContextComponents.swift`, `Native/Sources/RepoPromptCockpitApp/CockpitComponents.swift`
- Swift state/domain seams: `Native/Sources/RepoPromptCockpitCore/DashboardStore.swift`, `Native/Sources/RepoPromptCockpitCore/Reducers.swift`
- TS parity seams: `src/renderer/index.ts`, `src/renderer/styles.css`, `src/renderer/components/workspaceColumn.ts`, `src/renderer/components/workflowToolbar.ts`, `src/renderer/components/contextRail.ts`, `src/renderer/components/composerBar.ts`
- Prior design/rewrite context: `docs/designs/cockpit-redesign-2026-04-28.md`, `docs/plans/swift-native-rewrite-2026-05-14.md`, `docs/native-migration-2026-05-14.md`
- Apple Human Interface Guidelines — Split views: https://developer.apple.com/design/Human-Interface-Guidelines/split-views
