# Repo Prompt Cockpit redesign — 2026-04-28

## Context / scope

The previous renderer ran a dark "control plane" dashboard with a single-column
workbench (focus queue + session tree + session groups + workspace list +
detail panel + capability matrix + diagnostics). It worked, but it didn't read
like a native macOS surface and didn't match the reference cockpit screenshot
(left rail with brand and Cockpit selected, secondary workspace column with
filter tabs and session cards, main panel with a workflow toolbar and tabs,
right context rail, and a bottom composer/status row).

This redesign rewires the renderer to match that reference language while
preserving the read-only privacy contract, the live ↔ fixture provider
toggle, and the deterministic session/workflow tree derivation. **No fake
unsupported data** — every placeholder is either driven by snapshot fields or
is honestly badged `unavailable` / `fixture` / `inferred`.

## Files changed

- `src/renderer/index.html` — new `cockpit` shell (4-area grid: sidebar,
  workspace, main, rail; composer spans the bottom).
- `src/renderer/styles.css` — full rewrite to a macOS light surface (~1190
  lines), system colors, soft shadows, segmented controls, sticky toolbar with
  backdrop blur, refined pills/badges that map cleanly onto the existing
  observation/state vocabulary.
- `src/renderer/components/sidebar.ts` — Repo Prompt brand, redesigned nav
  (Cockpit / Workspaces / Worktrees / Agents / MCP Servers / Workflows /
  Templates / Integrations / Settings), and a status block (Running / Waiting
  / Blocked / Completed / Idle counts) sourced from `dashboard.statusCounts`.
  The not-yet-wired sections are marked `is-disabled` with a `soon` tag and a
  hover title — labeled honestly, not promised.
- `src/renderer/components/workspaceColumn.ts` *(new)* — secondary column
  with the All / Running / Waiting / Blocked tab strip and session cards
  (title, branch pill, age, summary, agent/model row, blue progress line,
  metric icons). Counts are derived from the snapshot; metrics that aren't in
  the read-only provider (files, tokens) are shown as `—` with a tooltip
  explaining why.
- `src/renderer/components/workflowToolbar.ts` *(new)* — sticky workflow
  header with the selected title, branch pill, state pill, model chip, and
  Live/Fixture segmented control. Tabs Plan/Activity/Artifacts/Logs/Results
  driven from `dashboard.activityPanel.tabs`. Plan and Activity are available;
  Artifacts/Logs/Results are visibly disabled with the `unavailable` badge.
- `src/renderer/components/activityCard.ts` *(new)* — center activity card
  with a per-state verification banner (✓ for completed, ◐ for running, ! for
  waiting input, ⌃ for blocked, × for failed), the snapshot summary, and a
  metadata grid (workspace, model, role, progress, state, workflow progress,
  relationship, observation).
- `src/renderer/components/diffPanel.ts` *(new)* — diff/code panel that
  honestly labels itself "no diff data" because the rp-cli provider doesn't
  report file diffs. **Plan/Activity render a neutral status preview**
  (snapshot counts in a tone-only grid, an explicit `not a diff` badge, and
  an "deterministic preview" footnote — no `+`/`-` diff semantics).
  Artifacts/Logs/Results render the provider-supplied unavailable detail copy.
- `src/renderer/components/contextRail.ts` *(new)* — right rail with five
  sections: Files in context (workspaces), Prompts · focus (top focus items),
  Workflow progress (completion %, sessions, active count), Agents involved
  (flattened session tree), Related workflows (other implementation plan
  items).
- `src/renderer/components/composerBar.ts` *(new)* — bottom status bar with
  the privacy posture (left), live status message + animated indicator
  (center), and Copy summary / Refresh actions (right).
- `src/renderer/index.ts` — rewired entry point: composes the four cockpit
  regions, owns workspace filter and active workflow tab state, preserves
  refresh / mode-toggle / copy-summary behavior.
- `src/domain/dashboard.ts` — `ImplementationPlanItem` gained an optional
  `updatedAt` so the workspace column can render age labels; the existing
  `createImplementationPlanItems` now passes it through. No behavior change
  for downstream consumers.
- `test/cockpit.test.ts` *(new)* — 7 tests covering filter counts/items, age
  label formatting, avatar initials (letter-preferred so `GPT-5.5` → `GP`),
  workflow tab descriptors (Plan/Activity available; Artifacts/Logs/Results
  unavailable with provider-supplied detail), and `updatedAt` propagation.
- `scripts/smoke-dashboard.ts` — extended to assert the cockpit-specific
  contracts (workspace filter counts agree with status counts, blocked filter
  is pure, workflow tabs are in the expected order, three tabs are honestly
  unavailable, `updatedAt` is propagated for age labels).

## Removed from the visible UI (kept in repo)

The previous focus queue, session tree, session groups, workspace list,
top bar, status strip, privacy banner, and detail panel components are no
longer composed into the renderer — their roles are filled by the new
cockpit components. The files remain in the tree (still imported by no
runtime code) so that future iterations can compare or reuse pieces; tests
and lint pass without them.

## Before → after

| Area | Before | After |
|---|---|---|
| Theme | Dark, gradient backgrounds, rgba(15,22,38,…) panels | macOS light: `#f5f5f7` window, `#f0eff3` sidebar, `#ffffff` cards, system blue accent, soft 0–4 px shadows |
| Layout | 2-column shell (sidebar + scrolling workbench) | 4-area grid: sidebar · workspace · main · rail · composer (bottom) |
| Sidebar nav | 7 generic items (Cockpit, Workspaces, Sessions, Capabilities, Diagnostics, MCP, Settings) | Repo Prompt brand + 9-item nav matching the reference (Cockpit / Workspaces / Worktrees / Agents / MCP Servers / Workflows / Templates / Integrations / Settings) with truthful "soon" tags on the unbuilt sections |
| Status counts | 9 cards in a horizontal strip (workspaces, sessions, running, waiting, blocked, failed, completed, idle, unknown) | Compact 5-row Running/Waiting/Blocked/Completed/Idle block inside the sidebar (matches the reference) |
| Workspace list | Single panel listing repo paths with badges | Filterable session column with All/Running/Waiting/Blocked tabs, session cards (title, branch pill, age, summary, agent avatar, metric icons, blue progress line) |
| Workflow header | Generic top bar with provider name, snapshot time, mode toggle, refresh, copy | Sticky cockpit toolbar: title + branch + state pill, model chip, Live/Fixture segmented control, Plan/Activity/Artifacts/Logs/Results tab strip with availability marks |
| Activity area | Detail panel with badges, summary, meta key/value grid, tab help chips | Activity card with per-state verification banner (color + icon), summary, denser meta grid, plus a diff/code panel that's honestly labeled when the provider has no diff data |
| Right side | None | Context rail with Files in context, Prompts · focus, Workflow progress (completion %, totals, active), Agents involved, Related workflows |
| Status / privacy | Privacy banner above the workbench, status text in the top bar | Bottom composer bar — privacy posture (left), live status message with animated dot (center), Copy summary + Refresh actions (right) |

## Honesty contract

The original goal — "no fake unsupported data" — is preserved and
strengthened:

- **Sidebar nav**: Worktrees, Agents, MCP Servers, Workflows, Templates,
  Integrations, Settings are all `is-disabled` with a hover title that says
  *"Preview — not yet wired to a provider"* and a visible `soon` tag.
- **Workflow tabs**: Plan and Activity are driven by snapshot data; Artifacts,
  Logs, and Results show the provider's `unavailable` detail string and a
  visible `unavailable` badge inside the tab. Their content area shows the
  same provider-supplied detail (no fake artifacts list).
- **Diff/code panel**: When showing the plan view it explicitly says
  *"plan preview (no diff data in provider snapshot)"* and renders a
  deterministic stub built from `statusCounts`. Other tabs render the
  provider's unavailable detail copy.
- **Session cards**: Files and tokens metric icons are shown as `—` with a
  tooltip stating the field is unavailable in the read-only snapshot. Age is
  shown only when `updatedAt` is present and parseable.
- **Activity card**: Verification banner copy matches the deterministic state
  the provider reports — no claims about tests or builds beyond what the
  snapshot supports.
- **Privacy posture** *(unchanged)*: Bottom composer always renders the
  banner, default text *"Transcript/log bodies are not loaded or uploaded by
  default."*

## Oracle review fixes (round 2)

After an Oracle code review, four issues surfaced and were fixed in the same
pass:

1. **Visible session tree restored** — the right-rail "Agents involved"
   section was flattening the observed/inferred tree and truncating to six
   nodes. It now renders a nested tree from `dashboard.sessionTree.roots`
   with depth-aware indentation, surfaces the `modeLabel` as a tree-level
   badge (`parent-child links observed` / `relationship inferred` / `flat
   sessions (parent link unavailable)`), and does not slice. New
   smoke-dashboard assertion: fixture parent → children must remain
   reachable in the tree view.
2. **Placeholder rows can no longer be counted as sessions** — the
   synthetic "no live implementation plan available" / "no RepoPrompt
   activity available" rows now carry a `kind: 'placeholder'` discriminator.
   `filterCounts` and `filterItems` exclude placeholders; the workspace
   column header reads `session state unavailable` (instead of `1 session`)
   when only a placeholder is present, and the empty-state text uses the
   placeholder's `detail`. Related workflows in the rail also exclude
   placeholders. Regression test in `test/cockpit.test.ts`.
3. **Plan/Activity preview is no longer styled as a code diff** — the
   diff/code panel was using gutters with `+`/`-` lines and red/green
   tinting for `plan` / `activity`. It's been replaced with a neutral
   `preview-panel` that renders snapshot counts in a status grid (tone-only
   coloring on the values, no add/del semantics), with an explicit
   `not a diff` badge in the header and a footnote saying the provider
   does not report file-level diffs.
4. **"Workflow progress" → "Overall snapshot progress"** — the activity
   card meta row was labeling global counts as "Workflow progress". Renamed
   so per-workflow vs. global is unambiguous; the helper function and
   variable were renamed to `activitySnapshotProgressLabel` /
   `snapshotProgress` to keep the code consistent with the UI label.

## Verification

- `tsc -p tsconfig.json` — clean.
- `vitest run` — 8 files, 47 tests pass (added 8 new in `test/cockpit.test.ts`,
  including the placeholder-vs-session regression).
- `eslint .` — clean.
- `tsx scripts/smoke-dashboard.ts` — passes; new assertions cover the cockpit
  contracts (filter counts, workflow tab order, unavailable tabs, `updatedAt`
  propagation, visible nested tree, placeholder/session distinction).
- `tsx scripts/smoke-menu.ts` — unchanged behavior; still emits
  `RP demo`-tagged tray title and the deterministic summary.

## Why the no-framework renderer survives

Every cockpit component remains a small TS function returning an `HTMLElement`
built with the existing `el(…)` helper. There's no new tooling, no new
runtime dependency, and no template engine. The only structural change to
the renderer entry is that it owns two extra UI bits of state — the workspace
filter (`'all' | 'running' | 'waiting' | 'blocked'`) and the active workflow
tab — which are plain top-level properties on the same `state` object the
renderer already used.
