# Critique: Swift Native Cockpit UI Redesign Plan

**Scope**: Review of `docs/plans/swift-native-cockpit-ui-redesign-2026-05-14.md`. Spot-checked `Native/Package.swift`, `Native/Sources/RepoPromptCockpitApp/ContentView.swift`, and the `ActivityContextComponents.swift` codemap. No scope expansion.

## 1. Top 3 under-specified seams

1. **Internal layout of `CockpitPrimaryContentView` (Work Item 2).** The plan says to move workspace/session selection "into the primary content area" but never says *how*: top strip, left sub-pane, or master-detail within the column. The current `WorkspaceSessionListView` (`ContentView.swift:~183-264`) is a full 292pt scrolling column with filter chips and up to 10 cards. Whether it becomes a sub-pane or a header band defines the entire "feel" of the redesign and is left blank.

2. **What the `NavigationSplitView` sidebar actually navigates.** `NavigationSplitView` supports 2–3 columns; the Approach maps to 3 (sidebar/content/detail). But `CockpitSidebarView` (`ContentView.swift:~119-181`) is a branding + counts + privacy + buttons utility panel with *no list or selection rows* — session selection lives in `WorkspaceSessionListView`, tab selection in `WorkflowToolbarView`. The plan calls it a "navigation/sidebar column" while specifying nothing for it to navigate.

3. **Ownership/persistence of inspector group expansion state.** WI1 defines per-group default expansion and "Diagnostics expands only when warnings/errors exist" — stateful view state. The plan insists "`DashboardStore` remains the only SwiftUI data source," leaving unspecified whether each `InspectorGroup` holds local `@State`, and whether collapse survives refresh / provider switch / snapshot change.

## 2. Contradictions / missing dependencies

- **WI2-before-WI3 has no viable intermediate state.** WI2 extracts `CockpitPrimaryContentView` *including* the session list while WI3's HStack still renders `WorkspaceSessionListView` as a separate column (`ContentView.swift:31`). You either render it twice or half-break the HStack before WI3. WI2 and WI3 are effectively one atomic change, not sequential items.

- **"Keep `ContextRailView` until inspector parity is verified" (WI1) cannot survive WI3.** Converting `DesktopCockpitView` to `NavigationSplitView` (WI3) removes the only mount point of `ContextRailView` (`ContentView.swift:~47`). The safety net requires a feature flag or an explicit "parity verified before WI3 starts" gate — neither is in the plan.

- **References cite the `inspector()` modifier, but baseline is macOS 13.** `Package.swift` pins `.macOS(.v13)`; `inspector(isPresented:content:)` is macOS 14+. The Approach correctly uses a `NavigationSplitView` detail column instead, so the third reference link is misleading and should be dropped.

## 3. Over-planning — cut or simplify

- **WI4 bullets 2–3 are already done.** Thin dividers (`Divider().opacity(0.45)`), macOS semantic colors (`.underPageBackgroundColor`, `.windowBackgroundColor`), and reduced scroll chrome (`showsIndicators: false`) all exist today. WI4's only real work is column-width constraints — fold that one sentence into WI3 and delete WI4.

- **WI5's test bullet is likely vacuous.** This redesign is pure composition reusing existing components; it adds no new view-independent helpers, so "add presentation-level checks" produces nothing. Existing checks already cover helpers. Keep only the parity-verification bullet (real and important).

## 4. Questions that would change implementation order

- **Does the session list become a sub-pane of the content column, or stay its own column?** `NavigationSplitView` caps at 3 columns; a 4th region forces nested `HSplitView` or absorption. This single answer gates the structure of WI2 and WI3.
- **Do the rail and inspector need to coexist behind a flag?** If yes: WI1 → WI3 → remove rail, and WI1 ships independently. If no: WI1 + WI3 must land together and WI1's "keep `ContextRailView`" is dropped.
- **Does the sidebar gain selection responsibility?** If session selection moves to the sidebar, WI2 collapses into WI3 and WI1 can proceed first in isolation. If not, weigh whether a plain `HSplitView` is simpler than a cosmetically-3-column `NavigationSplitView`.
