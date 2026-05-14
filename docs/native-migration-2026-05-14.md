# Native migration and release notes

Date: 2026-05-14

## Current status

The repository now has two maintained implementation paths:

- **Electron/TypeScript** remains the packaged unsigned macOS preview and reference implementation.
- **SwiftPM native macOS** lives under `Native/` and now has an unsigned, non-notarized `.app` preview packaging gate for release parity validation.

Do not delete or retire the Electron implementation in this milestone.

## Native validation gates

Run these before merging native changes:

```bash
pnpm native:verify
```

The GitHub Actions `CI` workflow runs `pnpm native:verify` in a separate macOS job while keeping `pnpm verify` for the Electron/TypeScript gate.

## Native preview artifact

Native preview artifacts can be staged with:

```bash
pnpm native:package:preview  # .app, zip, tar.gz
pnpm native:package:dmg      # .app, zip, tar.gz, dmg
```

This writes:

- `release/native-preview/Repo Prompt Cockpit Native.app`
- `release/native-preview/README.txt`
- `release/repo-prompt-cockpit-native-<version>-mac-<arch>.zip`
- `release/repo-prompt-cockpit-native-<version>-mac-<arch>.tar.gz`
- `release/repo-prompt-cockpit-native-<version>-mac-<arch>.dmg` when `pnpm native:package:dmg` / `pnpm native:verify` is used

The bundle includes `Contents/Info.plist`, `Contents/PkgInfo`, icon resources, executable permissions, and ad-hoc codesigning when `codesign` is available. The package script validates both the staged app and DMG-staged bundle similarly to the Electron preview path. This is intentionally **not** Developer ID signed, notarized, or auto-updating distribution.

## Release hygiene

Generated artifacts must stay out of git:

- `Native/.build/`
- `release/`
- `out/`
- coverage, logs, prompt exports, and local agent state

`pnpm verify` includes `scripts/check-release-hygiene.ts`, which rejects tracked SwiftPM build output and release output and verifies required ignore entries remain present.

## Manual release work remaining

Before a native public preview can replace the Electron preview, add and verify:

1. Launch-behavior smoke coverage from packaged `.app` and `.dmg` builds.
2. Developer ID signing with hardened runtime.
3. Notarization and stapling.
4. DMG packaging for the signed native app.
5. A release checklist covering fixture mode, live provider mode, status item, desktop/minimal window behavior, copy summary, and unavailable-state truthfulness.

Only after those gates pass in release use should the project plan Electron removal.
