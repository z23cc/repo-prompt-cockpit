APPROVE

Blockers: none.

Verified:
- `agent_manage list_sessions` success path now parses JSON into `sessions`: [rpCliProvider.ts](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/src/repoprompt/providers/rpCliProvider.ts:102), [rpCliProvider.test.ts](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/test/rpCliProvider.test.ts:74).
- Error capabilities map to `observation: "unavailable"`, not inferred: [rpCliProvider.ts](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/src/repoprompt/providers/rpCliProvider.ts:276).
- `electron-main.cjs` is linted cleanly: `pnpm lint` and `pnpm exec eslint electron-main.cjs` both passed.
- TypeScript scaffold/type boundary passes: `pnpm exec tsc -p tsconfig.json --noEmit`.
- Demo fixture, capability matrix, truthful labels, deterministic <=1200 summaries, and LLM-disabled default are present: [demoFixtureProvider.ts](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/src/repoprompt/providers/demoFixtureProvider.ts:8), [summary.ts](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/src/domain/summary.ts:5), [config.ts](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/src/shared/config.ts:5), [trayMenu.ts](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/src/main/trayMenu.ts:22).
- Smoke scripts exist for menu, missing `rp-cli`, socket permission, and tray: [package.json](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/package.json:8).
- Loaded workspace discovery is parser-driven from `rp-cli -e windows`, not runtime-bound to fixed window ID: [rpCliProvider.ts](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/src/repoprompt/providers/rpCliProvider.ts:172).

Verification caveat: `pnpm test` and `pnpm smoke:*` through `tsx` hit this read-only sandbox’s temp-file/IPC restrictions, not app assertions. I ran equivalent `node --import tsx` smoke paths plus inline parser/domain/menu assertions successfully. Live `rp-cli` access currently returns expected socket permission-denied diagnostics.

