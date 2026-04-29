# Contributing

Thanks for helping make RepoPrompt Control Plane safe to review and reuse. Keep changes small, practical, and easy to verify.

## Guardrails

- Keep Repo Prompt provider integrations read-only. Do not add provider writes, workspace mutation, agent actions, or hidden side effects.
- Do not collect transcripts, prompts, logs, or chat history by default. Any future collection must be explicit, opt-in, and clearly documented.
- Preserve truthful unavailable states. If the live Repo Prompt binding is missing, stale, or unsupported, show that honestly instead of falling back to fake live data.
- Keep fixture mode visibly fixture-backed. It is for demos and deterministic review, not a substitute for live Repo Prompt truth.
- Prefer existing patterns and small diffs. Do not add dependencies unless the change explicitly requires them and the rationale is documented.

## Before opening a PR

Run:

```bash
pnpm verify
```

For UI or provider changes, also sanity-check the relevant mode:

```bash
pnpm dev
RP_CONTROL_PLANE_DEMO=1 pnpm dev
```

Include what you verified in the PR notes, especially any live-provider limitations or unavailable states you observed.
