# Ralplan: RepoPrompt Control Plane Demo

## Intake evidence
- Fresh repo baseline: `git status --short --branch` returned `## No commits yet on main`.
- Initial repository file search found no project scaffold files; only `.git/` was visible before ralplan intake created `.omx/` planning artifacts.
- Current repo state now includes `.omx/context/repoprompt-control-plane-demo-20260428T214304Z.md`, this draft, and the Architect review output; it still has no application scaffold.
- `rp-cli` is installed at `/usr/local/bin/rp-cli`.
- `rp-cli --help` confirms commands for `windows`, `workspace list`, `select`, `context`, `search`, `chat`, `context_builder`, `ask_oracle`, `agent_manage`, `agent_run`, and related MCP tools.
- `rp-cli -e 'windows'` initially listed 4 open RepoPrompt windows with workspace names, window IDs, active tab names, active context IDs, and repo roots in this non-sandboxed harness; after the user loaded a plain control-plane workspace, it listed 5 windows including window `12` / workspace `RepoPrompt-control-plane` / tab `T1` / context_id `0D1D0428-949A-485F-A3B0-6924EE9EC5CF` rooted at this repo.
- `rp-cli -d agent_manage` documents `list_agents`, `list_sessions`, `get_log`, `extract_handoff`, `create_session`, `resume_session`, `stop_session`, and `list_workflows`.
- `rp-cli -d agent_run` documents role labels: `explore`, `engineer`, `pair`, `design`; `start`, `poll`, `wait`, `cancel`, `steer`, `respond`.
- Electron official docs confirm `Tray` is a main-process API for system notification/menu bar entries, `Menu.buildFromTemplate` creates menus, `tray.setTitle` is macOS-only, and macOS tray icons should be Template Images.
- Architect review observed that `rp-cli` calls can fail inside sandboxed contexts with `permission denied (errno 1)` when RepoPrompt socket access is blocked; this is a first-class negative scenario.
- The user-provided prototype screenshot shows a comprehensive control-plane app: Cockpit navigation, workspace/task cards with status/progress/agent metadata, strategy and model selectors, workflow progress, activity/diff/log/result tabs, context rail, prompts, files, agents involved, and related workflows. This informs information hierarchy; it is not MVP scope.

## Requirements summary
Build an MVP control plane for Oh My Pi / RepoPrompt agent monitoring, not a RepoPrompt replacement. The first demo should be a menu-bar/tray app that reads RepoPrompt/rp-cli/MCP state, summarizes active agent/session status, and tells the user what needs attention next. The loaded RepoPrompt-control-plane workspace (currently observed as window `12`) should be treated as the later implementation/Ralph-loop handoff target, with IDs re-probed before use.

### MVP scope
1. Scaffold a PNPM TypeScript desktop tray app.
2. Implement a narrow RepoPrompt data adapter around `rp-cli` first, with a typed boundary that can later swap to direct MCP APIs.
3. Add a `DemoFixtureProvider` before UI polish so the menu can be demonstrated when live RepoPrompt socket access or session APIs are unavailable; clearly label fixture/demo data.
4. Produce a capability matrix for every displayed field before claiming live support: source command/API, binding requirement, parse format, failure mode, privacy class, and observed-vs-inferred status.
5. Show a menu bar/tray status: running agents/sessions when observed, waiting-for-input items when observed, recent failures/completions when observed, and a single “focus next” recommendation only when the source data supports it.
6. Support manual refresh and copy-summary actions.
7. Add optional, explicitly gated cheap-LLM summarization behind config; default to deterministic local summaries.
8. Verify adapter parsing and UI state derivation with fixture-backed tests.
9. Preserve a path toward the prototype’s broader cockpit hierarchy by naming domain concepts (workspace, workflow, agent, prompt/context, activity/log/artifact), but expose only the menu-bar subset in MVP.

### Non-goals
- Do not rebuild RepoPrompt selection, chat, editor, or full workspace UI.
- Do not control or mutate sessions beyond safe read-only status in MVP, except optional “open/copy details” commands.
- Do not depend on undocumented text parsing long-term without isolating it behind fixtures and a typed adapter.
- Do not send transcripts or logs to an LLM by default.
- Do not execute mutating RepoPrompt/rp-cli commands in MVP. The initial allowlist is read-only: discovery, status, logs only when explicitly requested, and local copy/open actions. Exclude `agent_run.respond`, `agent_run.cancel`, `agent_run.steer`, `app_settings set`, file mutations, and session cleanup.
- Do not implement the screenshot’s full Cockpit/workspace/diff/context-rail UI in the first demo; use it only as product direction for later phases.

## RALPLAN-DR summary

### Principles
1. **Control plane, not clone**: expose attention and status, not RepoPrompt’s full functionality.
2. **Adapter isolation**: all `rp-cli`/MCP coupling lives behind one typed interface with fixtures and capability flags.
3. **Demo-first but not deceptive**: ship a menu-bar slice quickly, but label fixture data, unavailable capabilities, and inferred recommendations.
4. **Privacy by default**: deterministic summaries first; LLM summaries are opt-in and redact/limit payloads.
5. **Truthful status**: distinguish observed running/waiting/completed states from inferred recommendations and from unavailable data.

### Decision drivers
1. **Speed to credible demo**: menu-bar status must be buildable from the empty repo with low scaffolding risk.
2. **API uncertainty containment**: `rp-cli` and MCP availability differs by window/session binding; the app must tolerate missing/partial data.
3. **Operational usefulness**: output must tell the user what to do next, not just list sessions.
4. **Prototype alignment without scope creep**: borrow the screenshot’s status/attention vocabulary while keeping the first deliverable tray-sized.

### Viable options

#### Option A — Electron Tray + `rp-cli` adapter (recommended)
- Approach: PNPM TypeScript Electron app; main process owns tray, polls `rp-cli`, normalizes snapshots, renderer/popover can follow later.
- Pros: fastest path to native menu bar; pure JS/TS stack; Electron Tray/Menu docs directly support the desired UI; easy child-process integration with `rp-cli`; good testability around adapter fixtures.
- Cons: heavier runtime; macOS tray polish needs icon assets and main-process care; `rp-cli` output/binding quirks need hardening.

#### Option B — Local web dashboard + polling daemon
- Approach: Node daemon polls `rp-cli`/MCP; browser UI shows dashboard; menu-bar is deferred.
- Pros: fastest UI iteration; richer layout for prototype screenshot matching; no Electron packaging initially.
- Cons: misses the requested menu-bar-first demo; another window/tab is weaker as an attention surface; later tray integration still needed.

#### Option C — Native Swift/AppKit menu bar app
- Approach: macOS status item app shells out to `rp-cli` and renders AppKit menus/popovers.
- Pros: best native menu-bar behavior and low memory; macOS-first polish.
- Cons: conflicts with PNPM/TS repo default; slower for this team unless Swift patterns already exist; more friction for tests and later web-like prototype UI.

#### Option D — Tauri tray app
- Approach: Rust/Tauri shell with TS frontend and tray integration.
- Pros: lighter than Electron; TS UI possible.
- Cons: Rust/tooling cost in a fresh repo; tray APIs require version-aware verification; slower than Electron for a quick demo.

#### Option E — Direct MCP client first
- Approach: skip `rp-cli` and integrate directly against RepoPrompt MCP APIs for window/session/status data from the start.
- Pros: closer to the intended API layer; avoids Markdown CLI parsing; may expose richer structured state if externally accessible.
- Cons: external binding semantics and session coverage are not yet proven; MCP socket permissions already showed failure modes; slower than `rp-cli` for a demo unless a stable app-facing MCP contract is confirmed.

## Recommended architecture

### Chosen path
Use **Option A: Electron Tray + `rp-cli` adapter** for the MVP, with a `DemoFixtureProvider` and capability-gated adapter contract so a later direct MCP implementation can replace the shell-based provider without changing domain/UI code.

### Architecture layers
1. **Probe layer**
   - At startup, detect `rp-cli` path/version/help availability.
   - Run a small compatibility probe: `rp-cli --help`, `rp-cli -e 'windows'`, and best-effort read-only agent/session calls.
   - Produce a capability matrix for every displayed field: source command/API, required binding, parse format, failure mode, privacy class, observed/inferred/unavailable classification, and fixture fallback.
   - Record capability flags: windowsAvailable, agentSessionsAvailable, logsAvailable, canTargetWindow, canUseJsonToolCalls, repoPromptSocketAccessible.

2. **RepoPrompt adapter**
   - `RepoPromptProvider` interface returns normalized snapshots:
     - windows/workspaces/tabs/context IDs
     - agent sessions by state when available
     - recent log excerpts only when explicitly requested or summarized locally
     - capability matrix entries and provider diagnostics/errors
   - Initial live implementation: `RpCliProvider` using `child_process.execFile` with timeouts, no shell interpolation, bounded output, stderr capture, and a read-only command allowlist.
   - Initial demo implementation: `DemoFixtureProvider` using captured outputs and synthetic session fixtures, always labeled as fixture-backed in UI summaries.
   - Future implementation: `McpProvider` for direct MCP once stable external binding is proven.

3. **Domain model and state derivation**
   - Convert raw provider output into `ControlPlaneSnapshot`.
   - Derive `AttentionItem[]` only from available fields: waiting_for_input > failed > running too long/stale > recently completed.
   - If session state is unavailable, “Focus next” must say `No actionable session data available` or restrict itself to observed window/workspace context; it must not fabricate session priority.
   - Mark every recommendation as observed, inferred, fixture-backed, or unavailable.

4. **Tray/menu UI**
   - Main process creates Electron `Tray` and `Menu`.
   - macOS tray title shows compact count, e.g. `RP 3▶ 1?`.
   - Context menu sections:
     - Overall status and last refresh time
     - “Focus next” item
     - Waiting for input
     - Running sessions
     - Recent failures/completions
     - Refresh now, Copy summary, Open RepoPrompt, Preferences, Quit
   - If a richer popover is needed, add a small BrowserWindow after the menu-only demo works.
   - Menu labels should echo the prototype vocabulary where it helps orientation: Running, Waiting, Blocked, Completed, Agent, Workflow, Context, Logs.

5. **Summarization**
   - MVP deterministic summary: templates over normalized state.
   - Optional cheap LLM summarizer behind env/config; never enabled by default.
   - Send only bounded metadata unless user explicitly enables transcript summarization.
   - Cache summaries by snapshot hash to avoid repeated calls.

6. **Configuration**
   - Local config for polling interval, rp-cli path override, LLM enablement/provider/model, redaction level, stale thresholds.
   - Defaults work with no config if `rp-cli` is on PATH.

## Implementation plan

### Phase 0 — Compatibility probe, capability matrix, and fixtures
- Capture current `rp-cli --help`, `rp-cli -e 'windows'`, `rp-cli -d agent_manage`, and `rp-cli -d agent_run` outputs as test fixtures.
- Try targeted/JSON read-only session calls and document which calls require window binding or fail under socket permission restrictions.
- Create a capability matrix for each planned UI field: source command/API, required binding, parse format, failure mode, privacy class, and observed/inferred/unavailable status.
- Define the normalized TypeScript types before UI work.
- Add `DemoFixtureProvider` so the UI/domain demo does not depend on live RepoPrompt socket availability.
- Verify the loaded RepoPrompt workspace is discoverable through `rp-cli -e 'windows'`; record the window/context IDs as handoff hints, not hard dependencies.

### Phase 1 — Project scaffold
- Initialize PNPM TypeScript project.
- Add Electron, a test runner, lint/typecheck scripts, and a simple main-process entrypoint.
- Keep source layout explicit:
  - `src/main/` Electron main/tray code
  - `src/repoprompt/` provider interface and `rp-cli` adapter
  - `src/domain/` snapshot derivation and attention ranking
  - `src/shared/` shared types/config
  - `test/fixtures/` captured CLI outputs
  - `src/repoprompt/providers/` live `RpCliProvider` and `DemoFixtureProvider`

### Phase 2 — Provider and domain model
- Implement `RpCliProvider` with `execFile`, timeout, stderr capture, bounded output, structured provider diagnostics, and a read-only command allowlist.
- Implement `DemoFixtureProvider` with clearly labeled fixture-backed snapshots.
- Parse windows output from fixture-backed tests.
- Add session/log parsing only after probing confirms stable outputs; otherwise represent unavailable capabilities explicitly.
- Implement attention ranking with tests for waiting, failed, running, stale, unknown, unavailable, and fixture-backed states.

### Phase 3 — Menu-bar demo
- Create Electron Tray with macOS template icon assets.
- Build the menu from `ControlPlaneSnapshot`.
- Add manual refresh, refresh error display, and copy-summary action.
- Use deterministic summary text in the tray menu.

### Phase 4 — Optional LLM status summaries
- Add summarizer interface: deterministic default + optional cheap-LLM provider.
- Add redaction/bounding tests.
- Add config UI/file flag; do not enable by default.

### Phase 5 — Verification and demo polish
- Run unit tests for parser/domain/summarizer.
- Run typecheck/lint.
- Run Electron app locally and verify tray appears, refresh works, missing rp-cli errors are clear, and copy summary matches snapshot.
- Document demo script and known MCP/rp-cli capability gaps.
- Document how to target the loaded RepoPrompt-control-plane workspace/window for the later Ralph loop, while warning that window/context IDs are ephemeral and must be re-probed.

## Acceptance criteria
- `pnpm install` and project scripts are present.
- App starts as a tray/menu-bar app on macOS.
- With current RepoPrompt windows open and socket access available, menu shows at least window/workspace/tab context from `rp-cli -e 'windows'`.
- If live RepoPrompt socket access fails, the app shows a clear provider diagnostic and can run a visibly labeled fixture demo mode.
- If agent session APIs are accessible, menu includes running/waiting/completed/failed session sections; if not, menu explicitly shows “agent session status unavailable” with provider diagnostic.
- “Focus next” is deterministic, labels inferred recommendations as inferred, labels fixture-backed recommendations as fixture-backed, and says `No actionable session data available` when session/source data is unavailable.
- “Refresh now” updates menu state without restarting.
- “Copy summary” copies a bounded status summary of <=1,200 characters and excludes transcript/log bodies by default.
- Unit tests cover CLI parsing, unavailable capability behavior, attention ranking, and summary redaction.
- No LLM call is made unless explicitly configured; any LLM summary request uses the same <=1,200-character deterministic-summary boundary unless a later explicit setting permits transcript/log summarization.
- MVP adapter never invokes mutating `rp-cli`/MCP operations; tests or code review can identify the allowlisted commands.
- Socket permission failure is handled without crashing and appears as a provider diagnostic.

## Risks and mitigations
- **Risk: `rp-cli` output is Markdown/text, not stable JSON.** Mitigation: isolate parsers, capture fixtures, prefer `-c <tool> -j` where supported, and expose provider diagnostics.
- **Risk: multiple RepoPrompt windows require binding and break session calls.** Mitigation: probe windows first, target explicit window IDs where supported, degrade gracefully when a global query fails.
- **Risk: RepoPrompt socket access can fail under sandboxed contexts with `permission denied`.** Mitigation: capability probe records `repoPromptSocketAccessible`, UI shows the diagnostic, and fixture demo remains available.
- **Risk: tray-only UI becomes too cramped.** Mitigation: menu-only first, then add optional popover BrowserWindow after the status model is stable.
- **Risk: LLM summarization leaks sensitive transcript data.** Mitigation: opt-in only, metadata-only default, redaction tests, bounded payloads, local deterministic fallback.
- **Risk: demo becomes a RepoPrompt clone.** Mitigation: acceptance criteria only cover status, attention, refresh, and summary.
- **Risk: screenshot-driven scope creep.** Mitigation: MVP acceptance stays limited to tray status, attention, refresh, summary, diagnostics, and fixture/live labeling; the full Cockpit layout is a later phase.

## Verification steps
- `pnpm test` for parser/domain/summarizer behavior.
- `pnpm typecheck` for typed adapter boundaries.
- `pnpm lint` if lint is added.
- Manual smoke: run the Electron app, confirm tray icon/title/menu, refresh, copy summary, fixture/live labeling, and unavailable-capability diagnostics.
- Manual negative smoke: temporarily set `RP_CLI_PATH` to a missing executable and confirm the tray reports setup error without crashing.
- Manual negative smoke: simulate or run in a context where RepoPrompt socket access fails and confirm the tray reports permission diagnostics without crashing.

## ADR

### Decision
Start with an Electron Tray PNPM TypeScript app using an isolated `rp-cli` provider. Defer direct MCP integration and rich dashboard UI until the menu-bar MVP proves the control-plane model.

### Drivers
- Quick credible menu-bar demo.
- Fresh repo with no existing scaffolding.
- `rp-cli` is installed and exposes relevant RepoPrompt/MCP operations.
- Need to monitor agents across sessions without rebuilding RepoPrompt.

### Alternatives considered
- Local web dashboard first.
- Native Swift/AppKit status item.
- Tauri tray app.
- Direct MCP client first.

### Why chosen
Electron Tray is the shortest path from empty PNPM/TS repo to a functioning native menu-bar demo while keeping all RepoPrompt coupling behind an adapter.

### Consequences
- Accept heavier runtime for speed.
- Must harden CLI parsing and window-binding behavior.
- Must keep privacy boundaries explicit before adding LLM summaries.

### Follow-ups
- Verify stable JSON/session outputs from `rp-cli` before building session-heavy UI.
- Reassess Tauri/native Swift only after MVP proves the workflow.
- Add direct MCP provider once external API semantics are stable enough.
- Use the loaded RepoPrompt-control-plane workspace as the preferred handoff workspace for Ralph/team execution, but re-probe window/context IDs because they are ephemeral.

## Available agent types roster
- RepoPrompt Agent Mode role labels observed from `rp-cli -d agent_run`: `explore`, `engineer`, `pair`, `design`. These are RepoPrompt execution roles and must be verified again at execution time with `agent_manage list_agents` or `rp-cli` before staffing.
- Harness/task agent types available in this session and relevant to planning/review: `task`, `quick_task`, `code-explorer`, `code-architect`, `code-reviewer`, `reviewer`, `librarian`, `designer`, `plan`. These are session-tooling roles, not necessarily RepoPrompt Agent Mode roles.

## Follow-up staffing guidance

### `$ralph` sequential path
Use Ralph when the desired next step is a single-owner MVP cut:
- Lane 1: scaffold + provider types (`engineer`, high reasoning)
- Lane 2: tray UI + smoke demo (`engineer`, medium reasoning)
- Lane 3: verification + review fixes (`reviewer`/`code-reviewer`, medium reasoning)
Ralph should keep the adapter boundary tight and run verification after each phase.
- Before execution, Ralph should re-run the agent/role probe because the roster is environment-sensitive.

### `$team` parallel path
Use Team when splitting after the type contracts are established:
- Lead/architect: owns `RepoPromptProvider`, `ControlPlaneSnapshot`, acceptance criteria (`code-architect`, high reasoning).
- Adapter worker: implements `RpCliProvider` + fixtures (`engineer`, high reasoning).
- UI worker: implements Electron tray menu (`engineer` or `designer`, medium reasoning).
- Domain/test worker: attention ranking, deterministic summaries, redaction tests (`engineer`, medium-high reasoning).
- Reviewer/verifier: reviews integration and runs tests/smokes (`code-reviewer`/`reviewer`, high reasoning).
- Before assigning workers, team lead verifies the current available roles instead of assuming this planning-session roster is exhaustive.

## Launch hints
- Ralph: `$ralph "Implement .omx/plans/repoprompt-control-plane-demo.md sequentially in the loaded RepoPrompt-control-plane workspace; start with Phase 0 compatibility probe and keep LLM summaries disabled by default. Re-probe the workspace/window ID before launch. Include missing-rp-cli and RepoPrompt socket-permission negative smokes."`
- Team: `$team "Implement .omx/plans/repoprompt-control-plane-demo.md in the loaded RepoPrompt-control-plane workspace with lanes: architect/contracts, rp-cli adapter, Electron tray UI, domain/tests, verification. Use PNPM. Do not enable LLM calls by default. Re-probe workspace/window ID before launch. Include missing-rp-cli and RepoPrompt socket-permission negative smokes."`
- OMX team equivalent: `omx team "Implement .omx/plans/repoprompt-control-plane-demo.md in the loaded RepoPrompt-control-plane workspace; include socket-permission negative smoke" --workers 5`

## Team verification path
- Each worker stops only after its lane has tests or a manual evidence note.
- Team lead verifies contracts compile together before UI polish.
- Reviewer runs `pnpm test`, `pnpm typecheck`, and any added lint script.
- Ralph/final verifier runs manual tray smoke, missing-rp-cli negative smoke, and RepoPrompt socket-permission negative smoke before declaring completion.
- Final handoff confirms the app can discover the RepoPrompt-control-plane workspace when it is loaded, but does not rely on a fixed window/context ID.


## Consensus review notes and applied improvements
- Architect iteration 1 returned `ITERATE`; applied capability matrix, `DemoFixtureProvider`, read-only command allowlist, truthful `Focus next`, socket-permission negative smoke, and agent-roster separation.
- Architect iterations 2 and 3 returned `APPROVE`; incorporated the user-provided loaded workspace/screenshot context without expanding MVP beyond menu-bar-first.
- Critic returned `APPROVE`; applied non-blocking improvements: Direct MCP client-first option, <=1,200-character copy-summary bound, and launch hints that explicitly include socket-permission negative smoke.