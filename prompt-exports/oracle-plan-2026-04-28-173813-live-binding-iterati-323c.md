## Final Prompt
<taskname="Live Binding Iteration"/>
<task>Implement the next non-demo iteration of RepoPrompt-control-plane: keep fixture/demo mode available, but make live behavior the default path and improve live session discovery reliability. Specifically, add live binding target selection so `agent_manage list_sessions` is attempted against discovered RepoPrompt workspace/window/context targets (not only unbound global calls), remove reliance on hard-coded window `12`, preserve read-only rp-cli operations, and update tray presentation to grouped sections with explicit observation labels. Add/adjust tests and smoke coverage for binding selection, session parsing, grouped menu rendering, and unavailable fallbacks. Validate with `pnpm test`, `pnpm build`, `pnpm lint`, and relevant smoke scripts.</task>

<architecture>
- Provider stack:
  - `src/repoprompt/providerFactory.ts` chooses provider based on config (`preferDemoProvider`), defaulting to live `RpCliProvider` unless demo env is enabled.
  - `src/repoprompt/providers/rpCliProvider.ts` is the live adapter: probes `--help`, parses `windows`, then attempts `agent_manage list_sessions`; builds capability matrix + diagnostics; enforces read-only command safety.
  - `src/repoprompt/providers/demoFixtureProvider.ts` is fixture-backed demo data with explicit `fixture` observation and currently fixture-specific workspace/window/sample sessions.
- Domain stack:
  - `src/domain/attention.ts` derives priority-ranked attention items from sessions + diagnostics, with fallback behavior when sessions are unavailable.
  - `src/domain/summary.ts` builds deterministic bounded summary text and currently gates LLM summary as unsupported.
- UI stack:
  - `src/main/main.ts` owns Electron tray lifecycle, polling refresh, copy summary, and runtime provider switching to fixture mode.
  - `src/main/trayMenu.ts` maps snapshot into tray title/template; currently contains focus + flat session list + capabilities submenu.
- Contracts/config:
  - `src/shared/types.ts` defines observation/status/session/window/provider contracts.
  - `src/shared/config.ts` defines env-driven config (including demo toggle and summary bounds).
- Diagnostics/CLI execution:
  - `src/repoprompt/commandRunner.ts` wraps `execFile` and normalizes failures.
</architecture>

<selected_context>
src/repoprompt/providers/rpCliProvider.ts: `RpCliProvider.collectSnapshot()`, `parseWindowsOutput()`, `parseAgentSessions()`, `assertReadOnly()`, `describeFailure()`, `classifySessionFailure()`; current list_sessions call is unbound and single-path.
src/repoprompt/providerFactory.ts: live-vs-demo provider selection contract.
src/repoprompt/providers/demoFixtureProvider.ts: fixture mode dataset; currently embeds window/workspace values that include `id: 12` and RepoPrompt-control-plane naming.
src/repoprompt/providers/index.ts: export surface used by app/tests/scripts.
src/repoprompt/commandRunner.ts: command execution boundary used by provider and test doubles.
src/shared/types.ts: canonical model types for snapshots, capabilities, diagnostics, sessions, observations.
src/shared/config.ts: env config parsing (`RP_CONTROL_PLANE_DEMO`, polling, summary cap).
src/domain/attention.ts: fallback and priority logic for waiting/running/blocked/completed/diagnostic presentation.
src/domain/summary.ts: deterministic summary format and truncation behavior.
src/main/trayMenu.ts: tray title + menu template (needs grouped sections + explicit labels for observed/inferred/fixture/unavailable).
src/main/main.ts: polling loop, tray refresh wiring, fixture switch action.

test/rpCliProvider.test.ts: current coverage for windows parsing, session parsing, binding error diagnostics, missing rp-cli behavior, read-only allowlist.
test/domain.test.ts: attention fallback and summary bounds/fixture labeling.
test/trayMenu.test.ts: current minimal tray assertions; needs grouped section assertions for new layout.
test/fixtures/rp-windows.txt: multi-window sample including RepoPrompt-control-plane context.
test/fixtures/rp-session-binding-error.txt: canonical multi-window binding failure text.

scripts/probe-rp-cli.ts: manual probe output shape for provider diagnostics/capabilities.
scripts/smoke-provider.ts: live provider negative smoke modes (`missing-rp-cli`, `socket-denied`).
scripts/smoke-menu.ts: menu + summary smoke against fixture snapshot.
package.json: required verification and smoke script entry points.
vitest.config.ts, tsconfig.json, eslint.config.js, electron-main.cjs: test/build/lint/runtime harness context.
</selected_context>

<relationships>
- `main.ts` -> `createProvider()` -> `RpCliProvider|DemoFixtureProvider` -> `ControlPlaneSnapshot` -> `buildTrayTitle/buildTrayTemplate` + `createDeterministicSummary`.
- `RpCliProvider.collectSnapshot()` -> `runReadOnly()` -> `commandRunner.execFileRunner`; outputs windows/sessions/capabilities/diagnostics consumed by domain and tray.
- `parseWindowsOutput()` supplies workspace/window/context discovery inputs that should inform new binding target selection before `list_sessions` attempts.
- `deriveAttentionItems()` output feeds both tray “focus” and summary focus line.
- `createDeterministicSummary()` depends on attention + diagnostics and is used by tray copy action and smoke scripts.
- Tests and smoke scripts import provider/menu/domain modules directly; changes in grouping, labels, and binding strategy must be reflected there.
</relationships>

<ambiguities>
- Binding command shape for rp-cli context/window targeting is not yet implemented in source; fixtures show binding guidance text, but exact command argument contract must be inferred from available provider diagnostics/tests or introduced via robust fallback attempts.
- `providerFactory` already defaults to live unless demo env is set; “make live mode default” likely means preserving this behavior while ensuring fixture/demo remains explicitly available and clearly labeled.
- Hard-coded `id: 12` appears in fixture/test data (not in live parser logic) and may need to be generalized without losing deterministic fixture coverage.
</ambiguities>

## Selection
- Files: 24 total (24 full)
- Total tokens: 12287 (Auto view)
- Token breakdown: full 12287

### Files
### Selected Files
/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/
├── scripts/
│   ├── probe-rp-cli.ts — 171 tokens (full)
│   ├── smoke-menu.ts — 260 tokens (full)
│   └── smoke-provider.ts — 363 tokens (full)
├── src/
│   ├── domain/
│   │   ├── attention.ts — 729 tokens (full)
│   │   └── summary.ts — 647 tokens (full)
│   ├── main/
│   │   ├── main.ts — 762 tokens (full)
│   │   └── trayMenu.ts — 986 tokens (full)
│   ├── repoprompt/
│   │   ├── providers/
│   │   │   ├── demoFixtureProvider.ts — 1,010 tokens (full)
│   │   │   ├── index.ts — 48 tokens (full)
│   │   │   └── rpCliProvider.ts — 2,836 tokens (full)
│   │   ├── commandRunner.ts — 242 tokens (full)
│   │   └── providerFactory.ts — 90 tokens (full)
│   └── shared/
│       ├── config.ts — 185 tokens (full)
│       └── types.ts — 616 tokens (full)
├── test/
│   ├── fixtures/
│   │   ├── rp-session-binding-error.txt — 95 tokens (full)
│   │   └── rp-windows.txt — 323 tokens (full)
│   ├── domain.test.ts — 605 tokens (full)
│   ├── rpCliProvider.test.ts — 1,452 tokens (full)
│   └── trayMenu.test.ts — 229 tokens (full)
├── electron-main.cjs — 34 tokens (full)
├── eslint.config.js — 144 tokens (full)
├── package.json — 299 tokens (full)
├── tsconfig.json — 116 tokens (full)
└── vitest.config.ts — 45 tokens (full)


---

## Generated Plan

## Chat Send ✅
- **Chat**: `live-binding-iteration-5BE73F` | **Mode**: plan

### Response
## 1. Summary

Implement this as a targeted provider/UI iteration, not a broad refactor. The live `RpCliProvider` already owns RepoPrompt discovery, diagnostics, command safety, and capability reporting; extend it to derive binding targets from parsed windows and retry read-only `agent_manage list_sessions` calls against workspace/root, context, and window selectors. Keep demo mode as an explicit opt-in path, remove test/demo reliance on window `12`, and update tray rendering into grouped, observation-labeled sections. Add tests and smoke coverage around binding selection, parsing, grouped menu structure, and unavailable fallbacks.

---

## 2. Current-state analysis

### Existing provider flow

Current call chain:

```text
main.ts
  → createProvider(config)
    → RpCliProvider.collectSnapshot()
      → runReadOnly("--help")
      → runReadOnly("-e windows")
      → parseWindowsOutput(stdout)
      → runReadOnly("-c agent_manage -j { op:list_sessions }")
      → parseAgentSessions(stdout)
      → buildCapabilities()
```

Relevant responsibilities:

- `providerFactory.ts`
  - Already defaults to live `RpCliProvider`.
  - Uses `DemoFixtureProvider` only when `config.preferDemoProvider` is true.
- `rpCliProvider.ts`
  - Owns live CLI probing, output parsing, diagnostics, capability matrix construction, and read-only safety.
  - Currently performs exactly one unbound `agent_manage list_sessions` call.
  - Parses windows into `RepoPromptWindow[]`, including `repoPath` and active tab `contextId`.
  - Does **not** use parsed windows as session query targets.
- `DemoFixtureProvider`
  - Provides explicit fixture data with `observation: 'fixture'`.
  - Currently embeds a fixture window with `id: 12`, which makes tests/demo data look dependent on a real live window ID.
- `CommandRunner`
  - Is the execution boundary and remains injectable for tests/smoke scripts.
- `types.ts`
  - Already has enough public snapshot shape for this feature: windows, tabs, sessions, capabilities, diagnostics, observations.
  - No persisted schema exists.

### Existing UI/data flow

```text
ControlPlaneSnapshot
  → deriveAttentionItems(snapshot)
  → createDeterministicSummary(snapshot)
  → buildTrayTitle(snapshot)
  → buildTrayTemplate(snapshot, actions)
```

Current tray limitations:

- Flat focus/session/capability presentation.
- Observation is shown by symbols only: `●`, `◇`, `◆`, `○`.
- No grouped workspace/session/diagnostic sections.
- Empty session fallback exists but is not clearly tied to unavailable capability state.

### Blocking issue

The live provider has all inputs needed for target selection:

- `window.id`
- `window.workspace`
- `window.repoPath`
- `tab.contextId`
- `tab.name`

…but currently ignores them when querying sessions. When multiple RepoPrompt windows are open, the unbound session call can fail with the binding-required diagnostic, leaving live session discovery unavailable even though valid targets were discovered.

---

## 3. Design

### A. Live binding target selection in `RpCliProvider`

#### Approach

Add a deterministic session discovery pipeline inside `rpCliProvider.ts`:

1. Probe `--help`.
2. Parse windows with existing `parseWindowsOutput`.
3. Try unbound `list_sessions`.
4. If unbound fails with a retryable session failure and windows exist:
   - Try one workspace-root target using all discovered `repoPath` values.
   - Then try context targets from active tabs.
   - Then try window targets for windows not already covered by context targets.
5. Merge successful session rows.
6. Mark `agentSessionStates`:
   - `available` if any `list_sessions` attempt exits `0`.
   - `unavailable` if all session attempts fail.
7. Emit a warning diagnostic only when all session attempts fail.

This keeps operations read-only because every command remains `agent_manage list_sessions`; no `bind_context`, `op: bind`, response, cancel, steering, file actions, or edit operations are introduced.

#### New internal types

In `src/repoprompt/providers/rpCliProvider.ts`:

```ts
interface BindingTarget {
  id: string;
  kind: 'workspace_roots' | 'context' | 'window';
  workspace?: string;
  windowId?: number;
  repoPaths?: string[];
  contextId?: string;
  tabName?: string;
}

interface ListSessionsAttempt {
  id: string;
  label: string;
  args: string[];
  target?: BindingTarget;
}
```

Export only if tests need direct deterministic coverage:

```ts
export function deriveBindingTargets(windows: RepoPromptWindow[]): BindingTarget[];
export function buildListSessionAttempts(windows: RepoPromptWindow[]): ListSessionsAttempt[];
```

Also re-export from `providers/index.ts` if tests import through the existing provider barrel.

#### Target payloads

Use the same `agent_manage list_sessions` operation with selector metadata:

```ts
// Unbound
{ op: 'list_sessions', limit: 20 }

// Workspace/root selector, preferred because RepoPrompt guidance recommends working_dirs.
{ op: 'list_sessions', limit: 20, working_dirs: ['/abs/root1', '/abs/root2'] }

// Context selector.
{ op: 'list_sessions', limit: 20, context_id: '...' }

// Window selector.
{ op: 'list_sessions', limit: 20, window_id: 12 }
```

Selector order is intentional:

1. Unbound call preserves current behavior when only one RepoPrompt window/session scope exists.
2. `working_dirs` root-set call matches the fixture guidance text and can resolve multiple workspaces in one attempt.
3. `context_id` is most specific per active tab.
4. `window_id` is final fallback when context IDs are missing or unsupported.

#### Attempt limits

Add constants in `rpCliProvider.ts`:

```ts
const LIST_SESSIONS_LIMIT = 20;
const MAX_TARGETED_SESSION_ATTEMPTS = 8;
```

Rules:

- Always include the unbound attempt.
- Include at most one `workspace_roots` attempt.
- Include context/window attempts up to `MAX_TARGETED_SESSION_ATTEMPTS`.
- Deduplicate targets by stable selector:
  - `workspace_roots:${sortedRepoPaths.join('|')}`
  - `context:${contextId}`
  - `window:${windowId}`

This prevents unbounded polling latency when many RepoPrompt windows/tabs exist.

#### Session merge/enrichment

Add a helper:

```ts
function mergeSessions(
  existing: Map<string, AgentSession>,
  parsed: AgentSession[],
  target?: BindingTarget
): void
```

Behavior:

- Key by `session.id`.
- First parsed session wins for `title`, `state`, `model`, `progress`, `updatedAt`, `summary`.
- Fill missing `workspace` from:
  1. Parsed session `workspace`.
  2. Target `workspace`.
- Preserve `observation: 'observed'`.
- Return sessions in insertion order.

This avoids duplicate rows when multiple target attempts return the same session.

#### Retry policy

Add/adjust classification:

```ts
type SessionFailureCode =
  | 'session_status_requires_binding'
  | 'repoprompt_socket_permission_denied'
  | 'agent_sessions_unavailable';
```

Retry targeted attempts when:

- failure is `session_status_requires_binding`, or
- failure is generic `agent_sessions_unavailable`.

Do **not** retry targeted attempts for clear permission-denied failures because repeating the same socket-denied operation across targets only slows polling and adds noise.

#### Capability/diagnostic behavior

- `agentSessionStates.status = 'available'` if at least one session attempt exits `0`, even if it returns an empty list.
- `agentSessionStates.status = 'unavailable'` only if all attempted session calls fail.
- If targeted discovery recovers after unbound binding failure, do not emit a warning diagnostic.
- If all attempts fail, emit one warning diagnostic:
  - `code`: classified from the best/first failure.
  - `message`: `describeFailure(...)` plus concise attempt count context.
  - `command`: generic list-session command, not the full JSON payload if it contains many paths.

---

### B. Read-only command safety

Replace the current token-only mutating-command guard with a positive allowlist.

#### Current issue

`assertReadOnly(args)` only rejects known mutating substrings. It should still reject those, but targeted JSON support is a good time to make allowed commands explicit.

#### New guard contract

Allow only:

1. `['--help']`
2. `['-e', 'windows']`
3. `['-c', 'agent_manage', '-j', json]` where parsed JSON has:
   - `op === 'list_sessions'`
   - optional selectors limited to `limit`, `working_dirs`, `context_id`, `window_id`

Reject:

- `bind_context`
- JSON with `op: 'bind'`
- `respond`
- `cancel`
- `steer`
- `app_settings`
- `file_actions`
- `apply_edits`
- `cleanup_sessions`
- `stop_session`
- malformed JSON for `agent_manage`

Update `READ_ONLY_RP_CLI_COMMANDS` to document the new read-only targeted patterns, while ensuring it still excludes mutation words.

---

### C. Window parsing and no hard-coded window `12`

#### Live parser

Keep `parseWindowsOutput()` mostly intact. It should continue to parse actual IDs from CLI output.

#### Tests/demo

Remove assertions and fixture demo behavior that depend on window `12`:

- In parser tests, find the RepoPrompt-control-plane window by `workspace` or `repoPath`, not `windows.at(-1)` or `id: 12`.
- In `DemoFixtureProvider`, change fixture window ID to a neutral deterministic demo ID, e.g. `101`.
- In tray/menu tests, assert labels/counts/observations rather than exact window ID.

The actual `test/fixtures/rp-windows.txt` can keep the real sample `Window 12`; the important change is that production/tests do not rely on it.

---

### D. Tray menu grouped presentation

Modify `src/main/trayMenu.ts`.

#### Observation labels

Replace symbol-only `markerFor()` usage with explicit labels:

```ts
function observationLabel(observation: ObservationKind): string {
  switch (observation) {
    case 'observed': return '[observed]';
    case 'fixture': return '[fixture]';
    case 'inferred': return '[inferred]';
    case 'unavailable': return '[unavailable]';
  }
}
```

Symbols may be removed entirely or retained after the label, but every user-visible data row must include the explicit text label.

#### New grouping structure

`buildTrayTemplate()` should return sections in this order:

1. Status header
   - `Live status — N workspaces`
   - or `Fixture demo status — N workspaces`
   - updated timestamp
2. `Focus next`
   - Top 5 `deriveAttentionItems()`
3. `Sessions`
   - Group sessions by state in this order:
     - `waiting_for_input`
     - `blocked`
     - `failed`
     - `running`
     - `idle`
     - `completed`
     - `unknown`
   - Each row label: `[observed] Session title`
   - Sublabel: state, progress, workspace/model if available.
   - If empty: `[unavailable] No live session rows available`
4. `Workspaces`
   - Up to 8 windows.
   - Label: `[observed] Workspace name`
   - Sublabel: repo path and active tab/context when present.
5. `Capabilities`
   - Existing capability rows, now explicitly observation-labeled.
6. `Diagnostics`
   - Only shown when diagnostics exist.
   - Include severity/code/message.
7. `Actions`
   - Refresh now
   - Copy summary
   - Use fixture demo mode, visible only outside demo mode
   - Quit

Keep action callback names unchanged.

#### Tray title

Keep `buildTrayTitle()` mostly unchanged:

- Demo title still starts with `RP demo`.
- Error title still shows `RP ! N`.
- Live default title still shows running/waiting counts.

---

### E. Domain fallback behavior

`deriveAttentionItems()` already provides the correct fallback when sessions are unavailable but windows are observed.

Small adjustment only if needed for explicit labels:

- Ensure workspace fallback uses `observation: 'observed'` for live observed windows.
- Ensure no-session/no-window fallback remains `observation: 'unavailable'`.

No new domain abstraction is required.

---

### F. Smoke coverage

Update `scripts/smoke-provider.ts` with a new mode:

```text
binding-target
```

Behavior:

- Mock `--help` success.
- Mock `windows` success using the multi-window fixture.
- Mock unbound `list_sessions` as binding-required failure.
- Mock targeted `working_dirs` or `context_id` list_sessions success.
- Assert:
  - snapshot has at least one session.
  - `agentSessionStates.status === 'available'`.
  - no `session_status_requires_binding` warning remains when targeted recovery succeeds.

Add package script:

```json
"smoke:binding-target": "tsx scripts/smoke-provider.ts binding-target"
```

Update `scripts/smoke-menu.ts`:

- Assert grouped section labels exist.
- Assert at least one menu row includes `[fixture]`.
- Keep summary bound assertions.

---

## 4. File-by-file impact

### `src/repoprompt/providers/rpCliProvider.ts`

Change:

- Add binding target/list-session attempt types.
- Add constants:
  - `LIST_SESSIONS_LIMIT`
  - `MAX_TARGETED_SESSION_ATTEMPTS`
- Add helpers:
  - `deriveBindingTargets(windows)`
  - `buildListSessionAttempts(windows)`
  - `collectSessionsWithBindingTargets(windows, diagnostics, generatedAt)`
  - `mergeSessions(...)`
  - positive read-only command validator
- Modify `collectSnapshot()`:
  - Use new session collection pipeline after windows parsing.
  - Set capability status based on aggregate attempt result.
  - Emit session diagnostic only if all attempts fail.
- Update `READ_ONLY_RP_CLI_COMMANDS` documentation to include targeted read-only examples.
- Improve `parseAgentSessions()` only as needed:
  - optionally accept `agent_sessions`/`data` array wrappers.
  - keep existing supported keys.

Why:

- Centralizes live discovery reliability in the existing live adapter.
- Preserves injected `CommandRunner` testability.
- Avoids mutating RepoPrompt binding state.

Dependencies:

- Tests must be updated alongside this change.

---

### `src/repoprompt/providers/index.ts`

Change:

- Re-export `deriveBindingTargets` and/or `buildListSessionAttempts` only if tests import them through the barrel.

Why:

- Keeps test imports consistent with current pattern.

Dependencies:

- Must match actual exports from `rpCliProvider.ts`.

---

### `src/repoprompt/providers/demoFixtureProvider.ts`

Change:

- Replace fixture window `id: 12` with a neutral deterministic fixture ID, e.g. `101`.
- Keep `provider: demo-fixture`, fixture observation labels, sessions, diagnostics, and capabilities.

Why:

- Removes demo reliance on the live sample window ID while keeping deterministic fixture coverage.

Dependencies:

- Update any tests that expected `12`.

---

### `src/main/trayMenu.ts`

Change:

- Replace `markerFor()` usage with explicit observation label formatting.
- Add section helper for disabled headings.
- Group menu into:
  - Status
  - Focus next
  - Sessions
  - Workspaces
  - Capabilities
  - Diagnostics
  - Actions
- Add session grouping by state.
- Add workspace rows.
- Keep existing `TrayMenuActions` unchanged.
- Keep `buildTrayTitle()` compatible.

Why:

- Meets grouped tray presentation requirement.
- Makes observation provenance readable without relying on symbolic markers.

Dependencies:

- Tests and smoke menu assertions must be updated.

---

### `src/domain/attention.ts`

Change:

- Likely no structural change.
- Validate fallback observation values align with new tray labels.

Why:

- Existing fallback behavior is reusable.

Dependencies:

- Domain tests may add one assertion for unavailable observation fallback.

---

### `src/domain/summary.ts`

Change:

- No required production behavior change.
- Optional: include “observed/unavailable” focus labels already provided by attention line.

Why:

- Summary contract already deterministic and bounded.

---

### `src/shared/types.ts`

Change:

- No required public schema change.
- Only add exported target/session attempt types here if they need to be shared outside `rpCliProvider.ts`; otherwise keep them private in provider file.

Why:

- Avoid unnecessary public contract expansion.

---

### `src/shared/config.ts`

Change:

- No required config change.

Why:

- Attempt cap can be internal. Live mode is already default unless `RP_CONTROL_PLANE_DEMO=1`.

---

### `src/main/main.ts`

Change:

- No required lifecycle change.
- Keep `switchToFixtureMode()` action creating `DemoFixtureProvider`.
- Ensure copied summary still uses latest snapshot/config.

Why:

- Provider switching and polling are already correctly owned here.

---

### `test/rpCliProvider.test.ts`

Add/modify tests:

1. Parser no-hardcoded-ID test:
   - Find RepoPrompt-control-plane window by workspace/repo path.
   - Assert context ID and active tab without relying on `windows.at(-1)` or `id: 12`.

2. Binding target recovery test:
   - Mock:
     - help success
     - windows success
     - unbound list_sessions binding error
     - targeted `working_dirs` or `context_id` success
   - Assert:
     - targeted command was attempted.
     - sessions parsed.
     - capability `agentSessionStates` is `available`.
     - binding-required warning is not emitted after recovery.

3. All-targets-fail fallback test:
   - Mock unbound and targeted calls failing with binding-required output.
   - Assert:
     - windows still parsed.
     - sessions empty.
     - `agentSessionStates.status === 'unavailable'`.
     - diagnostic code is `session_status_requires_binding`.

4. Read-only guard test:
   - Keep existing mutation exclusions.
   - Add assertions that documented allowlist does not contain `bind_context` or `"op":"bind"`.

5. Optional direct helper tests:
   - `deriveBindingTargets()` returns workspace roots, contexts, and window fallback targets from fixture windows.
   - No helper result depends on hard-coded `12`.

---

### `test/trayMenu.test.ts`

Add/modify tests:

- Fixture menu has grouped headings:
  - `Focus next`
  - `Sessions`
  - `Workspaces`
  - `Capabilities`
  - `Actions`
- Fixture rows include `[fixture]`.
- Empty live snapshot with unavailable session capability renders:
  - `[unavailable] No live session rows available`
  - capability/diagnostic section rows.
- Existing copy/refresh action assertions remain.

---

### `test/domain.test.ts`

Change:

- Keep existing attention/summary tests.
- Add assertion that workspace fallback remains observed when live windows exist but sessions are unavailable.

Why:

- Protects unavailable fallback behavior consumed by grouped tray.

---

### `scripts/smoke-provider.ts`

Change:

- Add `binding-target` mode with mocked successful targeted session discovery.
- Print sessions in smoke output in addition to diagnostics/capabilities.

Why:

- Gives deterministic non-demo smoke coverage for the new live binding path.

---

### `scripts/smoke-menu.ts`

Change:

- Assert grouped menu headings.
- Assert explicit `[fixture]` labels.
- Keep summary bound and fixture-backed summary assertions.

---

### `scripts/probe-rp-cli.ts`

Change:

- Include `sessions` in printed probe output.

Why:

- Manual live probing should show whether targeted discovery worked.

---

### `package.json`

Change:

- Add:

```json
"smoke:binding-target": "tsx scripts/smoke-provider.ts binding-target"
```

Why:

- Makes new smoke mode discoverable and runnable with other smoke scripts.

---

## 5. Risks and migration

No persistence migration is required.

Main risk: the exact selector fields accepted by `rp-cli agent_manage list_sessions` may vary. This plan resolves that by:

- Using read-only `list_sessions` only.
- Trying selector payloads in a safe order:
  - `working_dirs`
  - `context_id`
  - `window_id`
- Preserving unavailable diagnostics if selectors are unsupported.
- Adding smoke coverage to validate the intended behavior with deterministic runner doubles.

Rollback is clean: targeted attempts are contained inside `RpCliProvider`; reverting that file and associated tests restores the prior unbound behavior.

---

## 6. Implementation order

1. **Update provider tests first**
   - Add binding recovery and all-targets-fail tests in `test/rpCliProvider.test.ts`.
   - Update parser assertions to stop relying on window `12`.

2. **Implement binding target helpers**
   - Add target/attempt helpers in `rpCliProvider.ts`.
   - Add direct helper exports only if tests require them.

3. **Implement targeted session collection**
   - Modify `collectSnapshot()` to call the new session collection pipeline.
   - Add merge/enrichment logic.
   - Adjust capability and diagnostic behavior.

4. **Harden read-only guard**
   - Replace token-only guard with positive allowlist validation.
   - Update `READ_ONLY_RP_CLI_COMMANDS`.

5. **Update fixture/demo data**
   - Change demo fixture window ID away from `12`.
   - Ensure fixture observation values remain explicit.

6. **Update tray menu grouping**
   - Add observation label formatter.
   - Restructure `buildTrayTemplate()` into grouped sections.
   - Keep action callbacks and tray title behavior stable.

7. **Update tray/domain tests**
   - Add grouped menu assertions.
   - Add unavailable fallback assertions.

8. **Update smoke scripts/package scripts**
   - Add `binding-target` smoke mode.
   - Add package script.
   - Update menu/probe smoke expectations.

9. **Validate**
   - Run:
     - `pnpm test`
     - `pnpm build`
     - `pnpm lint`
     - `pnpm smoke:menu`
     - `pnpm smoke:missing-rp-cli`
     - `pnpm smoke:socket-denied`
     - `pnpm smoke:binding-target`
   - Run `pnpm smoke:tray` only where Electron tray execution is supported.


> 💡 Continue this plan conversation with ask_oracle(chat_id: "live-binding-iteration-5BE73F", new_chat: false)