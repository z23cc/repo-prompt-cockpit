# RepoPrompt Control Plane

RepoPrompt Control Plane is a small Electron dashboard for watching Repo Prompt workspace activity from the desktop. It surfaces windows, sessions, workflows, attention states, diagnostics, and a composer-style control surface so a reviewer can understand what is happening without scraping chat logs or collecting transcripts by default.

The app can run against a live Repo Prompt CLI binding, or against deterministic fixtures for development, demos, and review.

## What it is

- A read-only desktop companion for Repo Prompt operators and reviewers.
- A visual control-plane prototype for session awareness, workflow status, capability visibility, and diagnostics.
- A safe demo surface that can be exercised without a live Repo Prompt install by using bundled fixtures.

## What is novel here vs. Repo Prompt itself

Repo Prompt remains the source of truth for project context, file selection, code intelligence, agent/session state, and any real workspace actions. This app experiments with a complementary presentation layer:

- desktop-first cockpit layout for multi-session awareness;
- attention and availability states that make inactive, unavailable, or fixture-backed data explicit;
- a provider boundary that keeps live Repo Prompt access read-only;
- fixture mode for repeatable demos and review without touching a real workspace.

## What this intentionally does not do

- It does not replace Repo Prompt or reimplement Repo Prompt's context engine.
- It does not write files, mutate Repo Prompt state, or perform agent actions through the provider.
- It does not collect transcripts, logs, prompts, or chat history by default.
- It does not claim live availability when the Repo Prompt CLI binding is missing or unavailable.
- It does not make fixture data look like live workspace truth.

## Why this complements Repo Prompt

Repo Prompt is still the canonical system for workspace context, selections, code maps, session data, and model/agent workflows. Control Plane adds an external dashboard that can make that state easier to review, demo, and discuss. Treat this repo as a companion UI experiment; defer to Repo Prompt for authoritative data, behavior, permissions, and workflow execution.

## Privacy and read-only contract

The live provider is intended to inspect Repo Prompt state, not change it. Keep that contract intact:

- provider integrations must remain read-only;
- unavailable states must be shown truthfully instead of hidden;
- transcript, prompt, and log collection must stay opt-in and must not be added by default;
- fixture mode must remain clearly distinguishable from live mode.

## Running the app

Install dependencies:

```bash
pnpm install
```

Run with the live Repo Prompt provider:

```bash
pnpm dev
```

Run with deterministic fixtures:

```bash
RP_CONTROL_PLANE_DEMO=1 pnpm dev
```

Fixture mode is the safest path for demos, screenshots, and review when a live Repo Prompt binding is not available. Live mode requires the local Repo Prompt CLI integration expected by the provider; if it is unavailable, the UI should report that state instead of fabricating data.

## Verification

Before opening a PR, run:

```bash
pnpm verify
```

Use fixture mode for repeatable UI checks, and live mode only when you need to validate the Repo Prompt CLI binding.


## Source release scope

This repository is currently prepared as a source release, not a signed desktop distribution. Use `pnpm dev` and `pnpm verify` as the supported local workflows. Packaging, code signing, and notarization are separate follow-on work.