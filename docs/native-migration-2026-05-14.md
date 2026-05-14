# Swift Native Migration

Date: 2026-05-14

Repo Prompt Cockpit has migrated from the previous Electron/TypeScript shell to the Swift native macOS implementation under `Native/`.

## Current status

- SwiftPM native macOS app is the primary implementation.
- The former Electron/TypeScript source, smoke tests, and packaging scripts have been retired.
- `test/fixtures/` remains because Swift provider checks still use the captured `rp-cli` fixture output.
- Native preview packaging produces unsigned, non-notarized `.app`, `.zip`, `.tar.gz`, and optional `.dmg` artifacts.

## Verification

```bash
swift build --package-path Native
swift run --package-path Native RepoPromptCockpitChecks
node scripts/check-release-hygiene.mjs
```

Or:

```bash
npm run verify
```

## Packaging

```bash
node scripts/package-native-preview.mjs        # .app, zip, tar.gz
node scripts/package-native-preview.mjs --dmg  # .app, zip, tar.gz, dmg
```

Artifacts:

- `release/native-preview/Repo Prompt Cockpit Native.app`
- `release/native-preview/README.txt`
- `release/repo-prompt-cockpit-native-<version>-mac-<arch>.zip`
- `release/repo-prompt-cockpit-native-<version>-mac-<arch>.tar.gz`
- `release/repo-prompt-cockpit-native-<version>-mac-<arch>.dmg` when `--dmg` is used

The bundle includes `Contents/Info.plist`, `Contents/PkgInfo`, icon resources, executable permissions, and ad-hoc codesigning when `codesign` is available. Developer ID signing and notarization are not performed by this preview script.

## Remaining release work

Before public trusted distribution, add and verify:

1. Developer ID signing identity configuration.
2. Hardened runtime entitlements.
3. Notarization + stapling.
4. Signed DMG/zip release workflow.
5. Auto-update strategy if this app is distributed beyond internal previews.
