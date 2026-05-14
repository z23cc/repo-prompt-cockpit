# RP Code

RP Code is a native macOS, read-only desktop companion for [Repo Prompt](https://repoprompt.com/).

It gives operators a compact control plane for live Repo Prompt sessions, workspace/context metadata, sub-agent state, diagnostics, and a minimal always-on-top monitoring mode — without collecting transcript, log, prompt, artifact, or result bodies by default.

## Repository shape

This is now a root-level Swift package:

- `Package.swift`
- `Sources/RPCodeCore`
- `Sources/RPCodeApp`
- `Tests/RPCodeChecks`
- `Resources/`
- `scripts/` for dependency-free Node packaging/release-hygiene helpers

The previous Electron/TypeScript shell has been retired.

## Features

- live `rp-cli` provider mode
- deterministic fixture/demo mode
- AppKit status item/menu
- desktop cockpit window
- minimal floating monitor window
- cross-workspace/session snapshot summary
- sub-agent/session cards and status filters
- Repo Prompt tab/context metadata folded into the sidebar
- capability and diagnostic reporting
- deterministic metadata-only copy summary
- unsigned native `.app`, `.zip`, `.tar.gz`, and optional `.dmg` preview packaging

## Privacy and read-only contract

The live provider inspects Repo Prompt state; it does not mutate it.

- provider integrations remain read-only
- unavailable states are shown truthfully instead of hidden
- fixture/demo data is visibly fixture-backed
- transcript, prompt, artifact, result, and log bodies are not collected by default
- `agentLogs` remains unavailable unless a future explicit opt-in feature is designed
- no LLM calls are wired by default

## Build and run locally

Requirements:

- macOS
- SwiftPM / Xcode command line tools
- Node 22+ only for packaging and release hygiene scripts
- `rp-cli` on `PATH` for live mode

Run checks:

```bash
swift build
swift run RPCodeChecks
node scripts/check-release-hygiene.mjs
```

Run the app in fixture mode:

```bash
swift run rp-code
```

Run the app in live mode:

```bash
REPOPROMPT_COCKPIT_PROVIDER=live swift run rp-code
```

Build unsigned preview artifacts:

```bash
node scripts/package-native-preview.mjs        # .app, .zip, .tar.gz
node scripts/package-native-preview.mjs --dmg  # .app, .zip, .tar.gz, .dmg
```

Artifacts are written under `release/`, including `release/native-preview/RP Code.app`.

## Where to inspect body content

RP Code deliberately keeps transcript/log/artifact/result bodies out of the desktop UI by default.

If you need body-level detail:

1. Use RP Code's workspace/context metadata to identify the matching Repo Prompt workspace and tab.
2. Switch to that session inside Repo Prompt itself.
3. Inspect Logs / Results / Artifacts there.

Repo Prompt remains the source of truth for deeper workflow content.

## Release scope

This repository is ready for source use and unsigned native macOS preview releases.

Still pending for fully trusted distribution:

- Developer ID signing
- hardened runtime
- notarization/stapling
- signed DMG/zip release flow
- auto-update

## Relationship to Repo Prompt

This repository is an independent companion UI experiment for Repo Prompt. Repo Prompt remains the canonical product and source of truth for workflow execution, context, logs, results, and permissions.

## License

Apache-2.0.
