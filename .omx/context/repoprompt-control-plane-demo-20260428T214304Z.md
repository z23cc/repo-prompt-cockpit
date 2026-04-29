# Context Snapshot: RepoPrompt Control Plane Demo

## Task statement
Figure out how much of the desired UI/control plane can be approximated by using `rp-cli`, exposed APIs, and/or RepoPrompt's MCP server. Start with a menu-bar-first demo that shows agents running across sessions and provides a snapshot of what the user should focus on or do next. The goal is not to rebuild the RepoPrompt app; it is a focused control plane for monitoring agent runs and possibly summarizing run messages through a cheap LLM.

## Desired outcome
A grounded implementation plan for an MVP control plane, prioritized around a quick demo: menu bar/status surface first, read-only monitoring of agent/session state, then optional lightweight status summarization.

## Known facts/evidence
- Repository root: `/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane`.
- `git status --short --branch` reports `## No commits yet on main`.
- `find("**/*", hidden=true)` found no tracked or untracked project files in the working tree; only `.git/` was visible via directory read.
- No `package.json`, workspace config, source files, docs, or tests were found.
- RepoPrompt MCP tooling available in this session includes agent/session APIs: `agent_manage`, `agent_run`, `bind_context`, `manage_workspaces`, `workspace_context`, `git`, etc.
- `rp-cli -e 'windows'` now lists 5 open RepoPrompt windows. Window `12` is workspace `RepoPrompt-control-plane` with 1 tab (`T1`) rooted at `/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane`, context_id `0D1D0428-949A-485F-A3B0-6924EE9EC5CF`. This confirms a plain RepoPrompt control-plane workspace is loaded for later implementation/Ralph-loop handoff.
- User-provided screenshot/prototype depicts a much fuller control-plane vision: left navigation (Cockpit, Workspaces, Worktrees, Agents, MCP Servers, Workflows, Templates, Integrations, Settings), status counts (Running, Waiting, Blocked, Completed, Idle), a workspace/task list with progress and agent/model metadata, a central activity/diff/log/results area, strategy/model selectors, workflow progress, and a right context rail with files, prompts, workflow, agents involved, and related workflows. The MVP should borrow its information hierarchy but not rebuild the full app.

## Constraints
- Fresh repo: plan must include scaffolding decisions.
- Do not rebuild RepoPrompt app; keep scope to an Oh My Pi-oriented control plane.
- Prefer fast demo value: menu bar first.
- Use `pnpm` for JS/TS package management per user global context.
- No execution handoff in non-interactive ralplan mode; output final plan only.
- Significant behavior later must be verified with concrete tests or harnesses.

## Unknowns/open questions
- Exact `rp-cli` command surface and output formats are only partially observed; execution must inspect local CLI docs/help or package source before binding to a field.
- What fields are available from RepoPrompt MCP for externally started sessions versus only MCP-started sessions needs source/API verification.
- Cheap LLM summarization provider/model and privacy constraints are unspecified.
- Which prototype details matter after the menu-bar demo remains a later product decision; the screenshot is treated as design direction, not MVP scope.

## Likely codebase touchpoints
- New project scaffold: package manager/workspace, app entrypoint, background polling service, RepoPrompt adapter, state store, menu-bar/tray UI, tests.
- Integration layer around `rp-cli` and/or RepoPrompt MCP APIs.
- Optional summarization module with explicit privacy/config boundaries.
- Documentation for setup/demo commands once implementation begins.
- RepoPrompt workspace/window handoff path for implementation: target window `12` / workspace `RepoPrompt-control-plane` when using `rp-cli` to run Ralph or inspect this repo later.
