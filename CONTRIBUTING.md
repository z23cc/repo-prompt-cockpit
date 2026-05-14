# Contributing

Thanks for helping make RP Code safe to review and reuse. Keep changes small, practical, and easy to verify.

## Guardrails

- **Keep Repo Prompt provider integrations read-only.** The Swift source of truth is `RpCliCommandValidator` in `Sources/RPCodeCore/RpCliCommandValidator.swift`. It allows only `rp-cli --help`, `rp-cli -e 'windows'` with optional `--raw-json`, and `rp-cli -c agent_manage -j {"op":"list_sessions", …}` with a bounded integer `limit` and a small selector set. Do not add mutating calls such as `agent_run.respond`, `cancel`, `steer`, `start`, `app_settings set`, file mutations, session cleanup, oracle/chat sends, or `agent_manage.get_log`.
- **Do not collect transcripts, prompts, logs, artifacts, results, or chat history by default.** Any future opt-in path must be explicit, bounded, redacted, and off by default.
- **Preserve truthful unavailable states.** Missing data should remain visibly unavailable and diagnostics should explain provider drift or binding failure.
- **Keep fixture mode visibly fixture-backed.** Fixture rows must keep fixture observations and must not masquerade as live truth.
- Prefer existing patterns and small diffs. Do not add dependencies unless the change explicitly requires them.

## Before opening a PR

Run:

```bash
swift build
swift run RPCodeChecks
node scripts/check-release-hygiene.mjs
```

For UI/window/status item changes, also sanity-check the app on macOS:

```bash
swift run rp-code
REPOPROMPT_COCKPIT_PROVIDER=live swift run rp-code
```

For packaging changes, run on macOS:

```bash
node scripts/package-native-preview.mjs --dmg
```

Include what you verified in the PR notes, especially live-provider limitations or unavailable states you observed.

## Repo conventions

- **Primary language:** Swift 5.9 / SwiftPM at repository root.
- **Node usage:** dependency-free `.mjs` scripts for packaging and release hygiene only.
- Keep generated artifacts out of git: `.build/`, `release/`, `dist/`, coverage, logs, and local prompt/export state must remain ignored.
- Keep diffs scoped: provider, domain/reducers, app UI/window/status item, packaging, and docs are separate concerns.

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).
