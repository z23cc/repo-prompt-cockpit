# Contributing

Thanks for helping make Repo Prompt Cockpit safe to review and reuse. Keep changes small, practical, and easy to verify.

## Guardrails

- **Keep Repo Prompt provider integrations read-only.** The TypeScript source of truth is `assertReadOnlyRpCliArgs` in `src/repoprompt/providers/rpCliProvider.ts`; the Swift native source of truth is `RpCliCommandValidator` in `Native/Sources/RepoPromptCockpitCore/RpCliCommandValidator.swift`. Both allowlists must stay equivalent: `rp-cli --help`, `rp-cli -e 'windows'` (with optional `--raw-json`), and `rp-cli -c agent_manage -j {"op":"list_sessions", …}` with a bounded integer `limit` and a small set of selectors. Do not widen either implementation to add `agent_run.respond` / `cancel` / `steer` / `start`, `app_settings set`, file mutations, session cleanup, chat/oracle sends, or `agent_manage.get_log`. If a feature genuinely needs a new read-only call, add it to both allowlists when applicable **and** add tests that prove it stays read-only and bounded.
- **Do not collect transcripts, prompts, logs, or chat history by default.** `agentLogs` ships with `defaultStatus: 'unavailable'` and `privacyClass: 'transcript'`. Any opt-in path you add must be off by default, gated behind explicit user action (not just an env flip), bounded in size and count, redacted, and routed away from any LLM unless the user has separately opted in.
- **Preserve truthful unavailable states.** Every displayed field is tagged `observed | inferred | fixture | unavailable` and tracked in the capability matrix. When data is missing, surface a diagnostic; do not invent values. "Focus next" must say `No actionable session data available` when the source data doesn't support a recommendation. If you add a new field to the snapshot, add a capability matrix entry for it in the same PR.
- **Keep fixture mode visibly fixture-backed.** It is for demos and deterministic review, not a substitute for live Repo Prompt truth. Fixture rows must keep `observation: 'fixture'` and the summary source must remain `fixture`.
- Prefer existing patterns and small diffs. Do not add dependencies unless the change explicitly requires them and the rationale is documented.

## Before opening a PR

Run the verification gates:

```bash
pnpm verify
pnpm native:verify
```

Plus the relevant smoke(s) when you've touched the matching layer:

| Touched area | Run at minimum |
| --- | --- |
| `src/repoprompt/providers/` | `pnpm probe:rp` (live) **and** `pnpm smoke:missing-rp-cli`, `pnpm smoke:socket-denied`, `pnpm smoke:binding-target` |
| `Native/Sources/RepoPromptCockpitCore/RpCliCommandValidator.swift`, native provider code | `swift run --package-path Native RepoPromptCockpitChecks`; keep the Swift allowlist equivalent to the TypeScript allowlist |
| `Native/Sources/RepoPromptCockpitApp/`, native UI/window/status item | `pnpm native:verify` and a local `swift run --package-path Native RepoPromptCockpitApp` sanity check on macOS |
| `src/main/trayMenu.ts`, tray wiring | `pnpm smoke:menu` (and `pnpm smoke:tray` if you have Electron set up locally) |
| `src/domain/`, `src/renderer/` | `pnpm smoke:dashboard` |

Negative smokes (missing rp-cli, socket-denied, binding-target) are part of the gate, not optional, when you've touched provider code.

For Electron UI or provider changes, also sanity-check the relevant mode:

```bash
pnpm dev
RP_CONTROL_PLANE_DEMO=1 pnpm dev
```

For native live-provider changes, sanity-check fixture and live mode on macOS:

```bash
swift run --package-path Native RepoPromptCockpitApp
REPOPROMPT_COCKPIT_PROVIDER=live swift run --package-path Native RepoPromptCockpitApp
```

Include what you verified in the PR notes, especially any live-provider limitations or unavailable states you observed.

## Repo conventions

- **Package manager:** pnpm. Don't commit `package-lock.json` or `yarn.lock`.
- **Languages:** TypeScript/ES modules for the Electron implementation; Swift 5.9 / SwiftPM for the native app in `Native/`.
- Keep generated artifacts out of git: `Native/.build/`, `release/`, `out/`, coverage, logs, and local prompt/export state must remain ignored.
- Keep diffs scoped: provider, domain, main, renderer, native core, native app UI, and tests are separate concerns and easier to review when they land in separate PRs.

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).
