# Swift 原生重写计划 — 评审

**范围**：仅评审 `docs/plans/swift-native-rewrite-2026-05-14.md`。覆盖四项：欠规格接缝、矛盾/缺失依赖、过度规划、影响实现顺序的问题。不扩展范围、不重写计划。

## 1. Top 3 欠规格接缝

**(a) Session binding retry / `BindingTarget` planner** — "Preserve Deliberately" 写了 "session binding retry" 但**无任何 file:line**；work item 4 只有 "binding target planner" 几个字。实际逻辑在 `src/repoprompt/providers/rpCliProvider.ts:15`（`MAX_TARGETED_SESSION_ATTEMPTS = 8`）、`:29-37`（`BindingTarget` 三种 kind）、`:39+`（`ListSessionsAttempt`）——一个带 fallback 策略的多次尝试循环。这是全计划最不透明、edge-case 最密集的接缝，却近乎零规格。

**(b) `RpCliCommandValidator`** — work item 4 把 validator 与另外 5 个组件压成一行。真实强制逻辑是两层精确契约：`assertReadOnlyRpCliArgs`（`rpCliProvider.ts:696-705`，逐位置 arg 形状匹配）+ `assertReadOnlyAgentManagePayload`（`:707-746`，JSON key 白名单 + `limit` 1–100 边界）。这是 read-only/privacy 的唯一强制点，不应只占 work item 4 的六分之一。

**(c) `ControlPlaneSnapshot` / `RepoPromptProvider` 契约** — work item 2 说 "define Swift enums/structs"，却从未说明 Swift 版是**复刻** `src/shared/types.ts:76-84` 的字段形状，还是**重新设计**。契约本身小且可见（7 字段），欠的是"等价"的定义（见第 2 节）。

## 2. 矛盾 / 缺失依赖

- **Approach 已决策的事项又列入 Open Questions**：macOS 13+ 与 "Developer ID preview 优先" 在 Approach 中是既定方向，在 Open Questions 中又是未决问题。计划实际建立在两个未确认假设上。
- **"重新设计 domain model" vs "等价于 collectSnapshot()"**：Direction 允许重设计 domain model，Native Architecture 又要求 provider protocol "等价于现有 collectSnapshot()"。"等价"指字段相同还是职责相同？这决定 work item 2 是"转写 types.ts"还是"设计新模型"。
- **work item 1/6 依赖 Open Question #2**：计划自承 macOS 版本决定 `MenuBarExtra` vs `NSStatusItem`，但 wi 1（"status item"）和 wi 6 仍按已解决排程。
- **测试职责分散**：test target 在 wi 1、fixture/reducer 测试在 wi 3、"translate quality gates" 在 wi 9——三处都碰测试，归属不清。
- **缺失：Swift CI 工具链**：wi 9 "Add CI for Swift build/test" 一笔带过；现有 `ci.yml` 为 Node-only，新增 Xcode/Swift runner 是独立非平凡工作。

## 3. 过度规划 — 应删减

- **"Redesign Freely" 整节可删**：4 条 bullet 实质都在重复 Goal（"不强制兼容现有 TypeScript"）和 Direction（"不是逐行移植"）。
- **"Background" 可瘦身**："没有发现已有 Swift 重写计划"一条不产生 actionable 信息；quality-gate 枚举与 References 重复。
- **"Native Architecture" 预先命名 8 个类型**（`AppCoordinator`/`WindowCoordinator`/`ConfigStore`…）在 wi 1 验证骨架前即锁定结构。建议只保留承重的 `DashboardStore` 与 `RepoPromptProvider` protocol，其余留给实现期决定。

## 4. 会改变实现顺序的问题

- **MAS sandbox vs Developer ID？** 若走 MAS，沙箱应用无法自由 `Process` spawn `rp-cli`，wi 4（live provider）需 helper tool/XPC——它会从"一个 work item"变成"必须先做的 spike"，直接决定 wi 4 是否如所写可行。
- **macOS 13+ 是否确认？** 决定 wi 1 是否需先建 AppKit/SwiftUI 桥（`NSStatusItem`），还是可直接用 SwiftUI `MenuBarExtra`。
- **snapshot 契约冻结还是可重设计？**（见第 2 节）决定 wi 2 与 wi 3 是串行（先逆向 `types.ts`）还是可协同设计。
- **demo-only 预览能否先发？** wi 11 要求 live/demo/provider/tray/window 全部 parity 才移除 Electron；但若 demo-only native preview 可作为过渡交付，则最难的 wi 4 可后置，wi 5–8 可围绕 demo provider 先行重排。
