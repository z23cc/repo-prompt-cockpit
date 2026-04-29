REJECT

Blockers:
- [rpCliProvider.ts](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/src/repoprompt/providers/rpCliProvider.ts:106) marks `agentSessionStates` as `available` on a successful session call, but [line 126](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/src/repoprompt/providers/rpCliProvider.ts:126) always returns `sessions: []`. Accessible live session data would be silently dropped while labeled observed/available.
- [rpCliProvider.ts](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/src/repoprompt/providers/rpCliProvider.ts:214) labels `status: "error"` capabilities as `inferred`; socket-permission failure smoke showed `windows` as `error` + `inferred`, which violates the truthful observed/inferred/unavailable requirement.
- `pnpm lint` fails: [electron-main.cjs](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/electron-main.cjs:2) reports `console` and `process` as `no-undef`.

Verified: PNPM/Electron/TS scaffold exists, `DemoFixtureProvider` exists, LLM is disabled by default, `tsc --noEmit` passes, and menu/missing-rp-cli/socket-denied smokes pass via `node --import tsx`. `pnpm test` and `pnpm smoke:*` were blocked by the read-only sandbox’s temp/socket restrictions, not by implementation assertions.