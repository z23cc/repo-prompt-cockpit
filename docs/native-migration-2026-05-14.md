# Swift Native Migration

Date: 2026-05-14

The project has migrated from the previous Electron/TypeScript shell to a root-level Swift package named **RP Code**.

## Current status

- SwiftPM native macOS app is the primary implementation.
- The former Electron/TypeScript source, smoke tests, npm package metadata, and packaging scripts have been retired.
- `test/fixtures/` remains because Swift provider checks still use captured `rp-cli` fixture output.
- Native preview packaging produces unsigned, non-notarized `.app`, `.zip`, `.tar.gz`, and optional `.dmg` artifacts.

## Verification

```bash
swift build
swift run RPCodeChecks
node scripts/check-release-hygiene.mjs
```

## Packaging

```bash
node scripts/package-native-preview.mjs        # .app, zip, tar.gz
node scripts/package-native-preview.mjs --dmg  # .app, zip, tar.gz, dmg
```

Artifacts:

- `release/native-preview/RP Code.app`
- `release/native-preview/README.txt`
- `release/rp-code-<version>-mac-<arch>.zip`
- `release/rp-code-<version>-mac-<arch>.tar.gz`
- `release/rp-code-<version>-mac-<arch>.dmg` when `--dmg` is used

The bundle includes `Contents/Info.plist`, `Contents/PkgInfo`, icon resources, executable permissions, and ad-hoc codesigning when `codesign` is available. Developer ID signing and notarization are not performed by this preview script.

## Remaining release work

Before public trusted distribution, add and verify:

1. Developer ID signing identity configuration.
2. Hardened runtime entitlements.
3. Notarization + stapling.
4. Signed DMG/zip release workflow.
5. Auto-update strategy if this app is distributed beyond internal previews.
