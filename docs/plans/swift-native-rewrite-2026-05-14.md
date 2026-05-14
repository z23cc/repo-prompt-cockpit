# Swift Native Rewrite: Plan

## Goal

将 Repo Prompt Cockpit 从 Electron/TypeScript 重写为 Swift 原生 macOS 应用。路线是 **Swift 原生重构**：不逐行移植 TS/Electron，但保留产品目标与安全约束。

## Background

- Cockpit 是 Repo Prompt 的只读桌面 companion，不替代 Repo Prompt；核心价值是跨 workspace/session 监控、tray + desktop cockpit、session tree、上下文元数据、诊断和 demo mode（`README.md:3-7`, `README.md:29-65`）。
- Read-only/privacy 是产品契约：默认不收集 transcript/log/artifact bodies，fixture 必须显式标注，缺失数据必须 truthful unavailable（`README.md:82-94`, `CONTRIBUTING.md:5-16`）。
- 当前 runtime 由 main process 串起 config、provider、polling、tray/window 和 renderer snapshot fanout（`src/main/main.ts:33-60`, `src/main/controlPlaneController.ts:8-79`）。
- 当前 provider seam 是 `RepoPromptProvider.collectSnapshot() -> ControlPlaneSnapshot`；live/demo provider 共用 snapshot contract（`src/shared/types.ts:76-99`, `src/repoprompt/providerFactory.ts:4-14`）。
- UI 从 snapshot 生成 dashboard view model，再渲染 sidebar/workspace/main/context rail/composer（`src/renderer/index.ts:19-55`, `src/domain/dashboard.ts:136-184`）。
- 没有发现已有 Swift 重写计划；最接近的先例是 2026-04-28 的 Electron redesign，目标是 native macOS 感，但仍保留 read-only/privacy/provider contracts（`docs/designs/cockpit-redesign-2026-04-28.md:3-18`）。

## Approach

### Planning assumptions

- 首版目标为 **macOS 13+**。
- 首个可分发 native preview 仍计划走 **Developer ID preview**，不以 Mac App Store sandbox 为第一目标；当前 milestone 只提供 SwiftPM build-only preview artifact。
- SwiftUI 负责 cockpit UI；AppKit 补 status item、window close/hide、minimal always-on-top 等 macOS 行为。
- Electron app 在迁移期保留为 reference；Swift 版达到 live/demo/provider/tray/window/test gates 后，再单独规划删除 Electron。

### Native shape

- 用 SwiftUI `App` 作为入口，并建立一个 `@MainActor` app/store layer 管理 UI-observable state。
- 用 `DashboardStore` 取代 `ControlPlaneController + IPC fanout`：负责 provider mode、polling、manual refresh、refresh coalescing、provider switch invalidation、latest snapshot/dashboard、selection/filter/tab/window state。
- 用 Swift `RepoPromptProvider` protocol 保留 provider seam。这里的“等价”指职责等价：provider 产出一个能表达同样七类顶层事实的 snapshot，而不是强制沿用 TS 命名：`generatedAt`, provider identity, windows, sessions, capabilities, diagnostics, summary source（`src/shared/types.ts:76-84`）。
- 将 dashboard/attention/session tree/summary 写成 pure Swift reducers，保留产品语义，不保留 DOM/CSS 实现。
- 原 Electron IPC/preload boundary 在 native app 中消失；refresh、copy summary、provider switch、window mode toggle 变成 store/coordinator methods。

### Provider safety seam

Swift live provider 必须先规格化安全边界，再接完整 parsing：

- `RpCliCommandValidator` 是唯一 subprocess gate；迁移现有两层契约：argument shape allowlist（`src/repoprompt/providers/rpCliProvider.ts:696-705`）和 `agent_manage list_sessions` JSON key/limit selector validation（`src/repoprompt/providers/rpCliProvider.ts:707-746`）。
- 允许的命令集合仍是 `--help`、`windows`、`windows --raw-json`、bounded `agent_manage list_sessions` variants（`src/repoprompt/providers/rpCliProvider.ts:16-26`）。
- Binding retry planner 不是普通 parser helper；它需要显式迁移 `MAX_TARGETED_SESSION_ATTEMPTS`、`BindingTarget` kinds，以及 unbound / hidden `_windowID` / workspace / context / window selectors 的尝试顺序（`src/repoprompt/providers/rpCliProvider.ts:15`, `src/repoprompt/providers/rpCliProvider.ts:29-43`）。
- Provider exception 仍应变成 diagnostic snapshot，而不是 crash 或 silent empty state（`src/main/controlPlaneController.ts:88-110`）。

### UI/product seam

SwiftUI 不追求像素级 parity；验收依据是信息架构与 truthfulness：

- Desktop cockpit：sidebar、workspace/session list、workflow activity/details、context rail、composer/status。
- Minimal mode：适合 always-on-top monitoring，隐藏次要 rail/diagnostics，但保留状态、activity、refresh/copy controls。
- Status item menu 保留当前 tray 语义：title、focus next、grouped sessions、workspaces、capabilities、diagnostics、open cockpit、mini/full、refresh、copy summary、live/fixture、quit（`src/main/trayMenu.ts`）。
- `agentLogs` / artifacts / transcripts 默认仍 unavailable；copy summary 仍 bounded + metadata-only（`src/domain/summary.ts:5-25`）。

## Work Items

1. **Create native skeleton**
   Add `Native/` Swift app with empty cockpit window, status item, basic window lifecycle, and Swift test target. Keep Electron untouched.

2. **Define Swift snapshot contract**
   Model snapshot/provider/window/session/capability/diagnostic/observation/privacy/window-mode types. Encode unavailable/fixture/inferred/observed as enums. Define placeholder rows so they cannot be counted as real sessions.

3. **Port demo fixture and pure reducers**
   Implement deterministic fixture provider plus dashboard, attention, session tree, and summary reducers. Lock with tests derived from `test/dashboard.test.ts`, `test/domain.test.ts`, and `scripts/smoke-dashboard.ts`.

4. **Build command validator first**
   Implement and test `RpCliCommandValidator` before any live provider parsing. Include negative tests for mutating `agent_manage` ops, missing/invalid bounded `limit`, unsupported selector keys, malformed JSON, and non-allowlisted args.

5. **Build live provider parsing and binding planner**
   Add subprocess runner, `--help`, windows raw JSON + text fallback, session parser, binding retry planner, capability/diagnostic construction, and parse-drift diagnostics.

6. **Implement `DashboardStore` orchestration**
   Add polling, manual refresh, refresh coalescing, provider switch invalidation, diagnostic fallback, selected item/filter/tab/window-mode state. Run provider collection off MainActor; apply snapshots on MainActor.

7. **Implement status item + copy summary**
   Recreate tray/menu semantics and clipboard summary using the Swift reducers. Test menu grouping and unavailable/fixture/diagnostic labels.

8. **Implement window coordination**
   Desktop close hides instead of quitting. Minimal mode is always-on-top and monitor-friendly. Persist bounds/mode in `UserDefaults`.

9. **Implement SwiftUI cockpit**
   Build the desktop and minimal views. Prioritize truthful state rendering and keyboard/click selection behavior before visual polish.

10. **Translate CI and release gates**
    Add native build/test workflow on macOS runner, release-hygiene checks for native artifacts, and a SwiftPM build-only native preview artifact path. Document Developer ID signing/notarization as follow-on work. Keep `pnpm verify` until the Electron app is formally retired.

11. **Update docs and deprecation path**
    Update README/CONTRIBUTING with Swift build/run/package instructions and the Swift allowlist contract. Plan Electron removal only after Swift passes live/demo/provider/tray/window/test gates.

## Execution Progress

- [x] Items 1–3: Native SwiftPM skeleton, snapshot/domain contract, demo fixture, reducers, executable check path.
- [x] Item 4: Swift `RpCliCommandValidator` with positive/negative executable checks.
- [x] Item 5: Live provider parsing and binding planner.
- [x] Item 6: `DashboardStore` orchestration.
- [x] Items 7–8: Status item and window coordination.
- [x] Item 9: SwiftUI cockpit.
- [x] Items 10–11: Native CI/release docs and migration documentation.

## Open Questions

- **Can a demo-only native preview ship before live provider parity?** If yes, work items 5–7 can move after an initial demo UI milestone. If no, keep the order above.
- **Is Mac App Store distribution required for the first native release?** The plan assumes no. If yes, insert a sandbox/helper-tool/XPC spike before work item 5.

## References

- Product/design: `README.md`, `CONTRIBUTING.md`, `docs/designs/cockpit-redesign-2026-04-28.md`
- Runtime seams: `src/main/main.ts`, `src/main/controlPlaneController.ts`, `src/main/trayMenu.ts`, `src/shared/types.ts`
- Provider seams: `src/repoprompt/providers/rpCliProvider.ts`, `src/repoprompt/providers/demoFixtureProvider.ts`, `src/repoprompt/providerFactory.ts`
- UI/domain seams: `src/renderer/index.ts`, `src/domain/dashboard.ts`, `src/domain/attention.ts`, `src/domain/summary.ts`
- Quality gates: `package.json`, `test/`, `scripts/`, `.github/workflows/ci.yml`, `.github/workflows/package-macos-preview.yml`
- Apple SwiftUI App lifecycle: https://developer.apple.com/documentation/swiftui/app
- Apple MenuBarExtra: https://developer.apple.com/documentation/swiftui/menubarextra
- Apple notarization: https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- Apple helper tools in sandboxed apps: https://developer.apple.com/documentation/xcode/embedding-a-helper-tool-in-a-sandboxed-app
