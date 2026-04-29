## Final Prompt
<taskname="S-tier control plane"/>
<task>Turn the current RepoPrompt-control-plane scaffold into a polished control plane experience inspired by the user’s screenshot, while preserving and extending the committed baseline (`02398d9`). The existing app is tray-only Electron + TypeScript. Evolve it beyond tray-only into a desktop control plane with clear view/component architecture, strong data model, implementation plan/items, and verification strategy. Keep live `rp-cli` behavior as the default path, keep fixture/demo mode available, keep LLM calls disabled by default, and do not upload transcript/log bodies by default. Preserve the read-only safety posture around RepoPrompt interactions.</task>

<architecture>
- Runtime shell:
  - `src/main/main.ts` is current Electron main-process entry (tray lifecycle, polling, provider wiring).
  - `src/main/trayMenu.ts` is current status surface and domain-to-UI mapping.
- Data/provider boundary:
  - `src/shared/types.ts` defines canonical contracts (`ControlPlaneSnapshot`, `AgentSession`, `RepoPromptWindow`, diagnostics/capabilities/observation tags).
  - `src/repoprompt/providers/rpCliProvider.ts` is the live adapter (help/windows/list_sessions probing, binding-target retries, capability matrix, diagnostics, read-only command enforcement).
  - `src/repoprompt/providers/demoFixtureProvider.ts` provides deterministic fixture-backed snapshots.
  - `src/repoprompt/providerFactory.ts` keeps live default and demo override.
- Domain derivation:
  - `src/domain/attention.ts` ranks actionable items and handles unavailable fallbacks.
  - `src/domain/summary.ts` creates bounded deterministic summaries and intentionally throws for LLM summaries.
- Verification harness:
  - `test/rpCliProvider.test.ts`, `test/trayMenu.test.ts`, `test/domain.test.ts` cover provider parsing/binding safety, tray rendering semantics, and domain summary/attention behavior.
  - `scripts/smoke-provider.ts`, `scripts/smoke-menu.ts`, `scripts/probe-rp-cli.ts` provide smoke/probe flows.
  - `package.json` includes PNPM scripts (`build`, `test`, `lint`, smoke scripts, Electron smoke).
- Product/context artifacts:
  - `.omx/context/repoprompt-control-plane-demo-20260428T214304Z.md` captures the original control-plane goal and screenshot-driven hierarchy expectations.
  - `.omx/plans/repoprompt-control-plane-demo.md` is a prior MVP/tray-focused plan with constraints and acceptance patterns that should be reused where still valid (live-vs-fixture truthfulness, diagnostics, privacy/read-only posture), but the current task now explicitly expands scope beyond tray-only UI.</architecture>

<selected_context>
src/main/main.ts: Electron bootstrap + polling loop + provider switching; current app is tray-only.
src/main/trayMenu.ts: Existing grouped tray sections and observation labels; useful as status vocabulary and fallback UX.
src/shared/types.ts: Canonical control-plane entities and capability/diagnostic contracts.
src/shared/config.ts: Env-config contract (polling, demo toggle, summary bounds, LLM flag default-off).
src/repoprompt/providers/rpCliProvider.ts: Live data acquisition core, read-only command guardrails, binding-target session discovery, parse/diagnostic logic.
src/repoprompt/providers/demoFixtureProvider.ts: Fixture-mode reference dataset for deterministic UX/testing when live state unavailable.
src/repoprompt/providerFactory.ts: Live-default provider selection and demo override path.
src/repoprompt/commandRunner.ts: Safe process boundary for `rp-cli` calls.
src/domain/attention.ts: Priority/ranking logic for "focus next" and unavailable-state fallback behavior.
src/domain/summary.ts: Deterministic bounded summary and explicit no-LLM-default enforcement.

src/repoprompt/providers/index.ts: Provider export surface consumed across app/tests/scripts.

test/rpCliProvider.test.ts: Ground truth for read-only behavior, binding-target retries, parse normalization, and diagnostics under failures.
test/trayMenu.test.ts: Current expectations for grouped sections, observation labels, and unavailable fallbacks.
test/domain.test.ts: Summary bounds + fixture labeling + attention fallback behavior.
test/fixtures/rp-windows.txt: Realistic multi-window fixture with contexts/repo roots.
test/fixtures/rp-session-binding-error.txt: Canonical binding-required failure text.

scripts/probe-rp-cli.ts: Live probe output contract for manual inspection.
scripts/smoke-provider.ts: Smoke scenarios (missing CLI, socket-denied, binding-target).
scripts/smoke-menu.ts: Menu/summary smoke invariants.

package.json: Build/test/lint/smoke script contract and dependency surface.
vitest.config.ts, tsconfig.json, eslint.config.js, electron-main.cjs: Build/test/runtime harness constraints.

.omx/context/repoprompt-control-plane-demo-20260428T214304Z.md: Original product framing + screenshot feature inventory.
.omx/plans/repoprompt-control-plane-demo.md: Prior MVP architecture + risk/verification checklist; reuse constraints, supersede tray-only scope.</selected_context>

<relationships>
- `main.ts` -> `createProvider()` -> `RpCliProvider|DemoFixtureProvider` -> `ControlPlaneSnapshot` -> `trayMenu` + `summary`.
- `rpCliProvider.collectSnapshot()` is the source of live windows/sessions/capabilities/diagnostics and must remain read-only.
- `attention.ts` and `summary.ts` consume `ControlPlaneSnapshot`; any new control-plane UI should reuse these derivations or extend them without breaking current semantics.
- `trayMenu.ts` is the current presentation layer and can serve as a compact status mode alongside new full control-plane views.
- Tests/smokes directly import provider/domain/main modules, so architectural changes should preserve or intentionally migrate these contracts with updated verification.
- `.omx/context` defines full-control-plane aspirational hierarchy; `.omx/plans` defines baseline safety/quality constraints and verification discipline.</relationships>

<ambiguities>
- The screenshot itself is not stored as a file in this repo context; only textual feature description is available.
- Prior `.omx/plans/repoprompt-control-plane-demo.md` explicitly scoped MVP to tray/menu first; current task supersedes that by asking for a fuller control plane, so implementers should treat MVP non-goals as historical context, not hard limits.
- No renderer/frontend stack is currently present (only Electron main/tray), so the next model must choose and justify the UI surface (e.g., BrowserWindow + renderer architecture) while preserving existing tray behavior and provider invariants.
</ambiguities>

## Selection
- Files: 26 total (26 full)
- Total tokens: 26882 (Auto view)
- Token breakdown: full 26882

### Files
### Selected Files
/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/
├── .omx/
│   ├── context/
│   │   └── repoprompt-control-plane-demo-20260428T214304Z.md — 1,006 tokens (full)
│   └── plans/
│       └── repoprompt-control-plane-demo.md — 6,084 tokens (full)
├── scripts/
│   ├── probe-rp-cli.ts — 209 tokens (full)
│   ├── smoke-menu.ts — 440 tokens (full)
│   └── smoke-provider.ts — 1,048 tokens (full)
├── src/
│   ├── domain/
│   │   ├── attention.ts — 729 tokens (full)
│   │   └── summary.ts — 647 tokens (full)
│   ├── main/
│   │   ├── main.ts — 762 tokens (full)
│   │   └── trayMenu.ts — 1,655 tokens (full)
│   ├── repoprompt/
│   │   ├── providers/
│   │   │   ├── demoFixtureProvider.ts — 1,010 tokens (full)
│   │   │   ├── index.ts — 70 tokens (full)
│   │   │   └── rpCliProvider.ts — 5,805 tokens (full)
│   │   ├── commandRunner.ts — 242 tokens (full)
│   │   └── providerFactory.ts — 90 tokens (full)
│   └── shared/
│       ├── config.ts — 185 tokens (full)
│       └── types.ts — 616 tokens (full)
├── test/
│   ├── fixtures/
│   │   ├── rp-session-binding-error.txt — 95 tokens (full)
│   │   └── rp-windows.txt — 323 tokens (full)
│   ├── domain.test.ts — 612 tokens (full)
│   ├── rpCliProvider.test.ts — 3,742 tokens (full)
│   └── trayMenu.test.ts — 854 tokens (full)
├── electron-main.cjs — 34 tokens (full)
├── eslint.config.js — 144 tokens (full)
├── package.json — 319 tokens (full)
├── tsconfig.json — 116 tokens (full)
└── vitest.config.ts — 45 tokens (full)


---

## Generated Plan

## Chat Send ✅
- **Chat**: `s-tier-control-plane-BA16DD` | **Mode**: plan

### Response
## 1. Summary

Evolve the existing tray-only Electron app into a desktop “RepoPrompt Control Plane” while preserving the current read-only `rp-cli` provider, fixture/demo mode, deterministic summaries, and tray fallback. This should be a **moderate architecture refactor**, not a rewrite: keep `ControlPlaneSnapshot` as the canonical provider contract, add a main-process controller/state owner, expose snapshots to an isolated renderer via typed IPC/preload, and build a no-new-dependency desktop renderer with dashboard/view-model components inspired by the screenshot. The desktop UI should show Cockpit-style status, workspaces, sessions, attention/focus queue, implementation-plan items, capabilities, diagnostics, and read-only detail panels without pretending unsupported logs/transcripts/artifacts are available.

Completion promise: the implementation should be considered complete only when existing tests still pass, new dashboard/controller/IPC tests pass, build/lint pass, read-only provider guardrails remain covered, and tray + desktop smoke flows both verify live/default and fixture fallback behavior.

---

## 2. Current-state analysis

### Runtime shell

Current flow:

```text
electron-main.cjs
  → imports dist/src/main/main.js
  → app.whenReady()
  → bootstrap()
  → loadConfig()
  → createProvider(config)
  → create Tray
  → refresh()
  → setInterval(refresh, config.pollingIntervalMs)
```

`src/main/main.ts` currently owns:

- process-level mutable state:
  - `tray`
  - `provider`
  - `config`
  - `latestSnapshot`
  - `refreshTimer`
- provider switching to `DemoFixtureProvider`
- refresh polling
- tray title/menu updates
- clipboard summary action

Blocking issues for desktop expansion:

- No central controller abstraction; tray, provider, polling, summary, and lifecycle are coupled in one module.
- No renderer process, `BrowserWindow`, preload, or IPC boundary.
- Refreshes can overlap if manual refresh and interval refresh happen concurrently.
- Provider switching can race with an in-flight refresh.
- Provider exceptions are not normalized into a diagnostic snapshot at the shell boundary.

Reusable pieces:

- `createProvider(config)` already preserves live-default/demo override.
- `createDeterministicSummary()` is the right clipboard/status text boundary.
- `buildTrayTemplate()` and `buildTrayTitle()` are good compact status surfaces and should remain supported.

### Data/provider boundary

`src/shared/types.ts` defines the canonical live data contract:

- `ControlPlaneSnapshot`
- `AgentSession`
- `RepoPromptWindow`
- `CapabilityMatrixEntry`
- `ProviderDiagnostic`
- `ObservationKind`

`src/repoprompt/providers/rpCliProvider.ts` is the live adapter. It already:

- uses `execFile`, not shell interpolation
- probes `rp-cli --help`
- parses `rp-cli -e windows`
- attempts read-only `agent_manage list_sessions`
- retries targeted selectors:
  - unbound
  - hidden `_windowID`
  - `working_dirs`
  - `context_id`
  - `window_id`
- emits diagnostics/capabilities
- enforces read-only payload validation through `assertReadOnlyRpCliArgs()`

Hard constraints to preserve:

- No mutating RepoPrompt operations.
- No `agent_run.respond`, `cancel`, `steer`, `bind`, file edits, or transcript uploads.
- Live `rp-cli` remains default.
- Fixture/demo mode remains visibly labeled.
- LLM summaries remain disabled by default.
- Transcript/log bodies are not uploaded or shown by default.

### Domain derivation

`src/domain/attention.ts` derives `AttentionItem[]` from `ControlPlaneSnapshot`.

Current behavior to preserve:

- waiting input > failed > blocked > running > completed > idle > unknown
- diagnostics become attention items
- unavailable session state produces explicit fallback instead of fabricated priority

`src/domain/summary.ts` creates bounded deterministic summaries.

Current behavior to preserve:

- summary max is bounded by `DEFAULT_SUMMARY_MAX_CHARS`
- fixture data is labeled
- no transcript/log bodies
- `maybeCreateLlmSummary()` throws intentionally

### Current presentation layer

`src/main/trayMenu.ts` maps `ControlPlaneSnapshot` to an Electron menu.

Reusable vocabulary:

- Focus next
- Sessions
- Workspaces
- Capabilities
- Diagnostics
- observation labels:
  - `[observed]`
  - `[fixture]`
  - `[inferred]`
  - `[unavailable]`

The new desktop UI should reuse this vocabulary so tray and desktop feel like two surfaces over the same model.

---

## 3. Design

### 3.1 Architectural approach

Use a **controller + IPC + renderer view-model** architecture:

```text
Main process
  ControlPlaneController
    owns config/provider/latestSnapshot/polling/refresh serialization
    emits snapshot changes
    updates Tray
    serves IPC

Renderer process
  preload API
    getSnapshot()
    refreshNow()
    copySummary()
    setProviderMode()
    onSnapshotChanged()

Renderer UI
  derives ControlPlaneDashboard from ControlPlaneSnapshot
  renders Cockpit/workspaces/sessions/details/capabilities/diagnostics
```

Do **not** introduce React/Vite/Tailwind for this step. The repo has a no-new-dependencies posture, so use:

- TypeScript renderer modules compiled by `tsc`
- static HTML/CSS
- DOM APIs with `textContent`, not unsafe live-data `innerHTML`

Rationale: this delivers a polished desktop experience without adding build-system complexity or dependency risk.

---

### 3.2 Main-process controller

Add:

`src/main/controlPlaneController.ts`

Kind: class.

Purpose: central owner for provider state, polling, refresh lifecycle, subscribers, and provider mode changes.

Owns:

```ts
interface ControlPlaneControllerState {
  config: ControlPlaneConfig;
  provider: RepoPromptProvider;
  latestSnapshot?: ControlPlaneSnapshot;
  refreshTimer?: NodeJS.Timeout;
  refreshInFlight?: Promise<ControlPlaneSnapshot>;
  refreshSequence: number;
  providerMode: 'live' | 'fixture';
}
```

Key interfaces:

```ts
class ControlPlaneController {
  constructor(config: ControlPlaneConfig)

  start(): Promise<ControlPlaneSnapshot>;
  stop(): void;

  getSnapshot(): ControlPlaneSnapshot | undefined;

  refreshNow(reason: RefreshReason): Promise<ControlPlaneSnapshot>;

  setProviderMode(mode: 'live' | 'fixture'): Promise<ControlPlaneSnapshot>;

  onSnapshot(listener: (snapshot: ControlPlaneSnapshot) => void): () => void;
}
```

`RefreshReason` closed set:

```ts
type RefreshReason =
  | 'startup'
  | 'timer'
  | 'manual'
  | 'provider-switch'
  | 'smoke';
```

Refresh behavior:

1. Increment `refreshSequence`.
2. Capture current provider reference and sequence.
3. If another refresh is already in flight, either:
   - return the in-flight promise for duplicate timer/manual calls, or
   - start a new refresh only after provider switch.
4. Call `provider.collectSnapshot()`.
5. Apply the snapshot only if:
   - the provider reference still matches, and
   - sequence is not stale.
6. Notify listeners.
7. Return latest snapshot.

Provider-switch behavior:

```text
renderer/tray action
  → controller.setProviderMode('fixture' | 'live')
  → create provider
  → clear in-flight relevance via sequence increment
  → refreshNow('provider-switch')
  → notify tray + renderer
```

Failure behavior:

- If `provider.collectSnapshot()` throws unexpectedly, controller must convert the error into a `ControlPlaneSnapshot` with:
  - `provider` matching current provider name when possible
  - empty `windows`/`sessions`
  - diagnostic code: `provider_collect_exception`
  - severity: `error`
  - `summarySource: 'unavailable'`
  - capabilities either empty or generated as unavailable if possible

This protects both tray and renderer from crashes.

Concurrency:

- Main process is the only owner of provider mutation.
- Renderer never imports or calls `RpCliProvider`.
- All renderer actions are async IPC calls into controller.
- Out-of-order refreshes are ignored via sequence/provider identity.

---

### 3.3 Desktop window lifecycle

Add:

`src/main/desktopWindow.ts`

Kind: module with functions.

Responsibilities:

- create/reuse `BrowserWindow`
- load renderer HTML
- expose show/hide/focus behavior
- keep the app tray-capable

Key shape:

```ts
interface DesktopWindowController {
  show(): void;
  hide(): void;
  toggle(): void;
  sendSnapshot(snapshot: ControlPlaneSnapshot): void;
  isCreated(): boolean;
}
```

BrowserWindow options:

- `width: 1280`
- `height: 860`
- `minWidth: 1040`
- `minHeight: 700`
- `title: 'RepoPrompt Control Plane'`
- `show: false`, then show after ready
- `webPreferences`:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `sandbox: false` only if required for the compiled preload
  - `preload: dist/src/main/preload.js`

Window startup:

- Add `openWindowOnStart` to config.
- Default should be `true` because the task explicitly expands beyond tray-only.
- Existing tray-only smoke should override this with `RP_CONTROL_PLANE_SMOKE=1` and avoid showing the window.

Close behavior:

- On normal close, prevent app quit and hide window unless the app is quitting.
- Tray Quit remains the app exit path.

Tray integration:

- Add tray action: `Open Control Plane`.
- Clicking the tray icon should toggle or show the desktop window.
- Existing menu remains as compact fallback/status surface.

---

### 3.4 Typed IPC and preload API

Add:

`src/shared/ipc.ts`

Kind: shared constants and type declarations.

Channel names:

```ts
CONTROL_PLANE_IPC = {
  getSnapshot: 'control-plane:get-snapshot',
  refreshNow: 'control-plane:refresh-now',
  copySummary: 'control-plane:copy-summary',
  setProviderMode: 'control-plane:set-provider-mode',
  snapshotChanged: 'control-plane:snapshot-changed'
}
```

Add:

`src/main/preload.ts`

Kind: Electron preload bridge.

Exposes:

```ts
window.controlPlane = {
  getSnapshot(): Promise<ControlPlaneSnapshot | undefined>;
  refreshNow(): Promise<ControlPlaneSnapshot>;
  copySummary(): Promise<void>;
  setProviderMode(mode: 'live' | 'fixture'): Promise<ControlPlaneSnapshot>;
  onSnapshotChanged(callback): () => void;
}
```

Add:

`src/main/ipcHandlers.ts`

Kind: module registering `ipcMain.handle` handlers.

Responsibilities:

- delegate to `ControlPlaneController`
- clipboard write via main process only
- validate provider mode input strictly:
  - only `'live'`
  - only `'fixture'`

Security constraints:

- Renderer receives snapshots and sends refresh/provider-mode/copy commands only.
- No renderer-exposed arbitrary command execution.
- No transcript/log body IPC APIs.
- No mutating RepoPrompt action channels.

---

### 3.5 Dashboard/domain view model

Add:

`src/domain/dashboard.ts`

Kind: pure derivation module.

Purpose: transform `ControlPlaneSnapshot` into a desktop-friendly, screenshot-inspired model without changing provider semantics.

New view model types can live in `src/shared/types.ts` if shared broadly, or in `dashboard.ts` if only derived. Prefer `dashboard.ts` exports to avoid bloating provider contracts.

Shape:

```ts
interface ControlPlaneDashboard {
  generatedAt: string;
  providerLabel: string;
  isFixture: boolean;
  isLive: boolean;
  statusCounts: StatusCounts;
  focusItems: AttentionItem[];
  workspaces: WorkspaceView[];
  sessionGroups: SessionGroupView[];
  implementationPlan: ImplementationPlanView;
  activityPanel: ActivityPanelView;
  capabilityRows: CapabilityRowView[];
  diagnostics: ProviderDiagnostic[];
  privacyBanner: PrivacyBannerView;
}
```

Status counts:

```ts
interface StatusCounts {
  workspaces: number;
  sessions: number;
  running: number;
  waiting: number;
  blocked: number;
  failed: number;
  completed: number;
  idle: number;
  unknown: number;
}
```

Implementation plan items:

```ts
interface ImplementationPlanItem {
  id: string;
  title: string;
  detail: string;
  state: SessionState | 'unavailable';
  observation: ObservationKind;
  progress?: number;
  workspace?: string;
  model?: string;
}
```

Derivation rules:

- If sessions exist:
  - each session becomes an implementation item
  - `title = session.title`
  - `detail = session.summary ?? session.workspace ?? session.model ?? 'No session summary available from read-only snapshot.'`
  - preserve `progress`, `model`, `workspace`, `observation`
- If no sessions but windows exist:
  - one unavailable item:
    - title: `No live implementation plan available`
    - detail: `RepoPrompt workspaces are visible, but agent session state is unavailable.`
    - observation: `unavailable`
- If no windows/sessions:
  - one unavailable item:
    - title: `No RepoPrompt activity available`
    - detail: provider diagnostics or setup guidance

Activity/detail panel:

- Default selected item can be the top attention item or first session.
- Tabs are present but truthful:
  - Activity: available metadata
  - Diff: unavailable unless future provider supports it
  - Logs: unavailable/redacted by default
  - Results: unavailable unless session summaries/artifacts exist
- No log/transcript body is fetched or rendered.

Privacy banner:

```ts
interface PrivacyBannerView {
  label: string;
  detail: string;
  severity: 'safe' | 'warning';
}
```

Rules:

- Always show deterministic/read-only privacy copy:
  - “Read-only monitoring. Transcript/log bodies are not loaded or uploaded by default.”
- If `enableLlmSummaries` is true in config later, still require explicit implementation before any provider call; current `maybeCreateLlmSummary()` remains throwing until intentionally replaced.

---

### 3.6 Renderer component architecture

Add directory:

```text
src/renderer/
  index.html
  index.ts
  styles.css
  global.d.ts
  components/
    appShell.ts
    sidebar.ts
    topBar.ts
    statusStrip.ts
    focusQueue.ts
    workspaceList.ts
    sessionBoard.ts
    implementationPlan.ts
    detailPanel.ts
    capabilityMatrix.ts
    diagnosticsPanel.ts
    emptyState.ts
    dom.ts
```

No framework.

`dom.ts` owns safe element helpers:

```ts
function element(tag, options, children): HTMLElement;
function text(value: string): Text;
function clear(node: HTMLElement): void;
```

Important rule:

- Live provider strings go into `textContent` or Text nodes.
- Do not assign unsanitized provider values to `innerHTML`.

Renderer state:

```ts
interface RendererState {
  snapshot?: ControlPlaneSnapshot;
  selectedSessionId?: string;
  selectedWorkspaceId?: string;
  providerMode: 'live' | 'fixture';
  refreshState: 'idle' | 'refreshing' | 'error';
  lastError?: string;
}
```

Lifecycle:

```text
DOMContentLoaded
  → render loading shell
  → window.controlPlane.getSnapshot()
  → if undefined: refreshNow()
  → derive dashboard
  → render
  → subscribe onSnapshotChanged
```

User actions:

- Refresh:
  - set refreshState `refreshing`
  - call `refreshNow()`
  - render returned snapshot
- Fixture mode:
  - call `setProviderMode('fixture')`
- Live mode:
  - call `setProviderMode('live')`
- Copy summary:
  - call `copySummary()`
  - show local “Copied” toast/state

Desktop layout inspired by screenshot:

```text
┌ Sidebar ┬ Top status / provider controls ┐
│ Cockpit │ Status cards                    │
│ Worksp. │ Focus queue + implementation    │
│ Agents  │ Session board                   │
│ MCP     │ Detail tabs / capability matrix │
│ Settings│ Diagnostics / privacy banner    │
└─────────┴─────────────────────────────────┘
```

Sidebar sections are navigational affordances, but only Cockpit is functional initially. Other items should be visibly disabled or marked “coming later” to avoid false capability claims.

---

### 3.7 Tray menu preservation

Modify:

`src/main/trayMenu.ts`

Current `TrayMenuActions`:

```ts
refreshNow(): void;
copySummary(): void;
switchToFixtureMode(): void;
quit(): void;
```

After:

```ts
export interface TrayMenuActions {
  openControlPlane(): void;
  refreshNow(): void;
  copySummary(): void;
  switchToFixtureMode(): void;
  switchToLiveMode(): void;
  quit(): void;
}
```

Behavior changes:

- Add `Open Control Plane` as the first action.
- Keep `Refresh now`.
- Keep `Copy summary`.
- Show `Use fixture demo mode` only when provider is live.
- Show `Use live rp-cli mode` only when provider is fixture.
- Preserve existing sections and labels.

Tests in `test/trayMenu.test.ts` must update action object construction and assert the new desktop action exists.

---

### 3.8 Config changes

Modify:

`src/shared/config.ts`

Add fields to `ControlPlaneConfig`:

```ts
openWindowOnStart: boolean;
desktopWindowWidth: number;
desktopWindowHeight: number;
```

Env defaults:

```text
RP_CONTROL_PLANE_OPEN_WINDOW
  default: true
  false when explicitly "0"

RP_CONTROL_PLANE_WINDOW_WIDTH
  default: 1280

RP_CONTROL_PLANE_WINDOW_HEIGHT
  default: 860
```

Smoke behavior:

- In `RP_CONTROL_PLANE_SMOKE=1`, main should avoid opening the desktop window regardless of `openWindowOnStart`.

Do not add persistent config files yet.

---

### 3.9 Provider safety and data extension policy

Do not expand `RpCliProvider` with new commands for this desktop step.

Allowed live behavior remains the existing read-only allowlist:

- `rp-cli --help`
- `rp-cli -e windows`
- `agent_manage list_sessions` with bounded selectors

The desktop UI may render placeholders for:

- logs
- diffs
- results
- workflows
- model/strategy selectors

But placeholders must say unavailable/read-only rather than triggering new data acquisition.

Future extension point:

- If logs are later added, implement behind explicit action and privacy gate.
- Add tests proving transcript/log bodies are not fetched by default.

---

## 4. File-by-file impact

### `src/main/main.ts`

Changes:

- Replace module-level lifecycle logic with composition:
  - load config
  - instantiate `ControlPlaneController`
  - create tray
  - create desktop window controller
  - register IPC handlers
  - wire snapshot listener to update tray/window
- Keep smoke timeout behavior.
- Add app quit cleanup through `controller.stop()`.

Depends on:

- `controlPlaneController.ts`
- `desktopWindow.ts`
- `ipcHandlers.ts`
- updated `trayMenu.ts`

---

### `src/main/controlPlaneController.ts` new

Adds:

- controller class
- serialized refresh
- provider mode switching
- snapshot subscribers
- exception-to-diagnostic snapshot fallback

Why:

- required to share state between tray and desktop renderer without duplicating provider ownership.

---

### `src/main/desktopWindow.ts` new

Adds:

- BrowserWindow creation/reuse
- show/hide/toggle
- snapshot push to renderer

Why:

- desktop app shell beyond tray-only.

---

### `src/main/ipcHandlers.ts` new

Adds:

- typed IPC registration
- validation for provider mode
- copy summary handler

Why:

- renderer must not access Node/provider directly.

---

### `src/main/preload.ts` new

Adds:

- `contextBridge` API for renderer
- typed snapshot subscription cleanup

Why:

- secure isolated renderer communication.

---

### `src/main/trayMenu.ts`

Changes:

- add `openControlPlane`
- add `switchToLiveMode`
- preserve existing status sections
- add action visibility based on provider

Why:

- tray becomes compact companion to desktop UI.

---

### `src/shared/types.ts`

Changes:

- extend `ControlPlaneConfig` with desktop-window fields.
- optionally add provider mode type:

```ts
export type ProviderMode = 'live' | 'fixture';
```

Avoid:

- adding screenshot-specific fields to `ControlPlaneSnapshot` unless live provider can support them truthfully.

---

### `src/shared/config.ts`

Changes:

- parse desktop window config env vars.
- keep LLM disabled default.
- keep live provider default.

---

### `src/shared/ipc.ts` new

Adds:

- channel constants
- preload API type declarations if not placed in renderer global file.

---

### `src/domain/dashboard.ts` new

Adds:

- pure `createControlPlaneDashboard(snapshot)` derivation.
- status counts.
- workspace/session grouping.
- implementation plan view model.
- read-only/privacy banner model.

Why:

- gives desktop UI a strong model without weakening provider contracts.

---

### `src/domain/attention.ts`

Likely minimal change.

Potential addition:

- export `STATE_PRIORITY` only if dashboard needs it.

Avoid duplicating priority logic in dashboard.

---

### `src/domain/summary.ts`

No behavior change required.

Potential addition:

- allow dashboard copy path to reuse `summarizeForClipboard`.

Do not implement LLM summaries.

---

### `src/renderer/index.html` new

Adds:

- static HTML shell
- CSS link
- module script pointing at compiled renderer entry
- restrictive CSP suitable for local app:
  - no remote scripts
  - no remote connections

---

### `src/renderer/styles.css` new

Adds polished desktop styling:

- dark shell
- left navigation
- status cards
- focus/attention queue
- session cards/table
- detail panel tabs
- diagnostics/capability matrix
- fixture/live/unavailable badges
- responsive behavior down to min window width

---

### `src/renderer/index.ts` new

Adds:

- bootstrap
- state management
- IPC action wiring
- render orchestration

---

### `src/renderer/global.d.ts` new

Adds:

```ts
declare global {
  interface Window {
    controlPlane: ControlPlanePreloadApi;
  }
}
```

---

### `src/renderer/components/*.ts` new

Adds pure-ish DOM rendering components grouped by UI section.

Why:

- clear view/component architecture without framework dependencies.

---

### `src/repoprompt/providerFactory.ts`

Potential change:

- expose provider creation by mode:

```ts
createProvider(config, mode?: ProviderMode): RepoPromptProvider
```

Before:

```ts
createProvider(config): RepoPromptProvider
```

After:

```ts
createProvider(config, mode = config.preferDemoProvider ? 'fixture' : 'live'): RepoPromptProvider
```

Call sites:

- `main.ts` / controller
- tests if any direct expectations are added

---

### `src/repoprompt/providers/rpCliProvider.ts`

No new behavior required.

Keep tests around:

- read-only allowlist
- binding target retries
- parse drift diagnostics
- permission denied handling

---

### `src/repoprompt/providers/demoFixtureProvider.ts`

Enhance fixture data only if needed for richer UI:

- add more varied `summary` values.
- do not add unsupported provider fields.

Why:

- desktop demo should look credible in fixture mode.

---

### `test/domain.test.ts`

Add/adjust:

- dashboard derivation tests may live in a new file instead.

Keep existing summary/attention tests passing.

---

### `test/dashboard.test.ts` new

Covers:

- fixture dashboard labels fixture mode.
- live empty session snapshot produces unavailable implementation item.
- status counts are correct.
- no transcript/log body fields are present.
- diagnostics flow into dashboard.
- top focus item matches `deriveAttentionItems()`.

---

### `test/trayMenu.test.ts`

Update actions object with:

- `openControlPlane`
- `switchToLiveMode`

Add assertions:

- `Open Control Plane` appears.
- fixture snapshots show `Use live rp-cli mode`.
- live snapshots show `Use fixture demo mode`.

---

### `test/ipc.test.ts` new, optional

If IPC handlers are factored with injectable fake controller, test:

- invalid provider mode rejects.
- refresh handler delegates.
- copy summary uses deterministic summary.

Do not require real Electron BrowserWindow in unit tests.

---

### `scripts/smoke-menu.ts`

Update actions object for new tray actions.

Keep existing invariants.

---

### `scripts/smoke-dashboard.ts` new

Uses fixture provider and `createControlPlaneDashboard()` to assert:

- Cockpit model has status cards.
- implementation plan items exist.
- privacy banner says no transcript/log upload.
- fixture labels are preserved.

---

### `scripts/smoke-provider.ts`

No behavior change required.

---

### `scripts/probe-rp-cli.ts`

Optionally include dashboard summary fields in probe output, but keep current JSON stable unless needed.

---

### `package.json`

Add scripts:

```json
{
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "smoke:dashboard": "tsx scripts/smoke-dashboard.ts"
}
```

Keep:

- `build`
- `test`
- `lint`
- existing smoke scripts

No new dependencies.

---

### `tsconfig.json`

Ensure includes already cover:

- `src/**/*.ts`
- `scripts/**/*.ts`
- `test/**/*.ts`

No change likely needed.

---

### `.omx/plans/repoprompt-control-plane-demo.md`

Do not treat tray-only MVP non-goals as current scope.

Optional update:

- add superseding note that desktop control plane is now in scope while preserving safety/privacy constraints.

---

## 5. Risks and migration

### Baseline compatibility

Baseline `02398d9` behavior to preserve:

- live `rp-cli` default
- fixture override
- tray status/menu
- deterministic bounded summary
- read-only provider allowlist
- negative diagnostics for missing CLI/socket denied/binding required

No persisted data schema exists, so no data migration is required.

### Main risks

1. **Renderer build path fragility**
   - Mitigation: keep static renderer files under repo root and compiled JS under `dist`; verify with `pnpm build` and Electron smoke.

2. **Electron preload ESM compatibility**
   - Mitigation: validate during implementation. If compiled ESM preload fails under Electron 39, use a `.cjs` preload shim as the only CommonJS exception.

3. **False affordances in screenshot-inspired UI**
   - Mitigation: disabled/placeholder panels must explicitly say unavailable/read-only.

4. **Refresh/provider switch races**
   - Mitigation: sequence refreshes in `ControlPlaneController`.

5. **Privacy regression**
   - Mitigation: no new provider commands for logs/transcripts; tests assert dashboard has privacy banner and no transcript/log body fields.

---

## 6. Implementation order

1. **Add dashboard domain model**
   - Create `src/domain/dashboard.ts`.
   - Add `test/dashboard.test.ts`.
   - Verify with `pnpm test`.

2. **Introduce controller without desktop UI**
   - Add `ControlPlaneController`.
   - Refactor `main.ts` to use it for tray updates.
   - Existing tray behavior should remain visually/functionally equivalent.
   - Run `pnpm test`, `pnpm build`, `pnpm lint`.

3. **Add provider-mode factory support**
   - Update `createProvider()` to accept explicit mode.
   - Use it inside controller.
   - Preserve `config.preferDemoProvider`.

4. **Add typed IPC and preload**
   - Add `src/shared/ipc.ts`, `src/main/ipcHandlers.ts`, `src/main/preload.ts`.
   - Use fake-controller unit tests if practical.

5. **Add BrowserWindow shell**
   - Add `desktopWindow.ts`.
   - Wire `Open Control Plane` action from tray.
   - Add config for startup window behavior.
   - Keep `RP_CONTROL_PLANE_SMOKE=1` headless/tray-safe.

6. **Build renderer UI**
   - Add static HTML/CSS.
   - Add renderer bootstrap and components.
   - Render fixture and live snapshots using `createControlPlaneDashboard()`.
   - Ensure unsafe `innerHTML` is not used for provider data.

7. **Enhance tray actions**
   - Add `Open Control Plane`.
   - Add live/fixture switching both ways.
   - Update tray tests and smoke script.

8. **Add dashboard smoke**
   - Add `scripts/smoke-dashboard.ts`.
   - Add `smoke:dashboard` script.

9. **Full verification**
   - `pnpm test`
   - `pnpm build`
   - `pnpm lint`
   - `pnpm smoke:menu`
   - `pnpm smoke:dashboard`
   - `pnpm smoke:missing-rp-cli`
   - `pnpm smoke:socket-denied`
   - `pnpm smoke:binding-target`
   - manual Electron desktop smoke:
     - live default opens desktop
     - tray still works
     - fixture mode switch works
     - copy summary works
     - no logs/transcripts are fetched or uploaded

10. **Final review criteria**
    - No read-only guardrail regression.
    - No LLM calls.
    - Tray and desktop both consume the same snapshot/controller.
    - Unsupported screenshot features are truthful placeholders, not fake controls.
    - Existing provider/domain tests remain green.


> 💡 Continue this plan conversation with ask_oracle(chat_id: "s-tier-control-plane-BA16DD", new_chat: false)
---

## Blocking Update — Session / Workflow Tree Requirement (2026-04-28)

The dashboard must show RepoPrompt sub-agent runs as a tree/hierarchy, not only a flat session list.

Acceptance additions:
- Dashboard has a visible session/workflow tree showing parent orchestration runs and child/sub-agent runs when the provider can infer or expose them.
- Tree rows show title, state, model/agent role when available, and observation label.
- If `rp-cli list_sessions` does not expose explicit parent-child IDs, implement a truthful best-effort grouping strategy from available session metadata/title/workflow.
- Fallback labels must be explicit, e.g. `relationship inferred` or `flat sessions (parent link unavailable)`.
- Do not mark live links as observed unless provider data actually includes explicit parent-child relationship fields.
- Preserve read-only behavior; do not fetch transcript/log bodies by default.
- Add fixture data covering a parent run with 2+ sub-agent children.
- Add tests for tree derivation and renderer/menu presentation.

Coordination note:
- This supersedes the earlier “grouped sessions” requirement by requiring a visible hierarchy/tree in both the dashboard model and renderer presentation.
