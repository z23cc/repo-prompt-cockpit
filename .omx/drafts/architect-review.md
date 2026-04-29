**Verdict: ITERATE**

The chosen direction is architecturally plausible, but the draft needs one tightening pass before consensus approval. The core recommendation fits the stated constraints: fresh repo, PNPM/TS preference, menu-bar-first demo, control plane not RepoPrompt clone, and adapter isolation. See [context](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/.omx/context/repoprompt-control-plane-demo-20260428T214304Z.md:17) and [draft](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/.omx/drafts/repoprompt-control-plane-demo-draft.md:67).

**Steelman Antithesis**

The strongest case against **Electron Tray + `rp-cli` adapter** is that it optimizes for the fastest visible demo while inheriting two unstable surfaces at once: Electron tray packaging/polish and a CLI not yet proven as a stable machine API for agent state.

A tray menu is a narrow attention surface, but the desired product wants cross-session status, waiting states, failures, logs, and next-action synthesis. That may exceed what a menu can honestly show without a richer dashboard. Meanwhile `rp-cli` is clearly powerful, but its help exposes a workspace/chat/control CLI, not a guaranteed read-only telemetry API. The draft already admits text/Markdown instability and binding quirks [draft](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/.omx/drafts/repoprompt-control-plane-demo-draft.md:165). In this review environment, `rp-cli --help` worked, but live calls like `rp-cli -e 'windows'`, `rp-cli -d agent_manage`, and `rp-cli -d agent_run` failed with `permission denied (errno 1)`, which makes runtime accessibility a first-class risk, not just a parser detail.

A stronger-first alternative would be a local web/daemon prototype with a fixture/live provider split, proving the status model before committing to Electron packaging. If native menu bar is non-negotiable, Swift/AppKit is the cleaner long-term tray surface despite slower initial delivery.

**Real Tradeoff Tension**

Fast demo value vs truthful operational status. Electron + `rp-cli` can produce a credible menu-bar artifact quickly, matching the context’s menu-bar-first constraint [context](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/.omx/context/repoprompt-control-plane-demo-20260428T214304Z.md:20). But if session/waiting/failure state is unavailable or only inferable, the app risks looking useful while reporting weak truth. The draft’s “Truthful status” principle is right [draft](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/.omx/drafts/repoprompt-control-plane-demo-draft.md:33), but the plan needs stricter gates around what is observed versus inferred.

**Synthesis Path**

Keep Option A, but make it explicitly capability-gated:

Electron Tray remains the demo shell. `rp-cli` becomes one provider behind `RepoPromptProvider`, not the product’s source-of-truth assumption. Add a fixture/demo provider immediately so UI and domain logic can be built and demonstrated when live RepoPrompt socket access is unavailable. Phase 0 must prove, field by field, which statuses can be read live, which require window/tab binding, which are unavailable, and which are inference only. Direct MCP stays as a later provider behind the same interface.

Also note: Image #1 is unavailable and was not inspectable here, matching both the draft and context [draft](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/.omx/drafts/repoprompt-control-plane-demo-draft.md:12), [context](/Users/zakelfassi/Documents/Code/RepoPrompt-control-plane/.omx/context/repoprompt-control-plane-demo-20260428T214304Z.md:15).

**Plan Amendments**

1. Update intake evidence: current repo contains `.omx/` draft/context files and no project scaffold; not literally only `.git/`.

2. Add a Phase 0 capability matrix for every displayed field: source command/API, required binding, parse format, failure mode, privacy class, and whether it is observed or inferred.

3. Add an `OfflineFixtureProvider` or `DemoFixtureProvider` before tray UI work. Acceptance criteria should allow a labeled fixture demo and separately require live `rp-cli` diagnostics.

4. Add a read-only command allowlist for the MVP adapter. Explicitly exclude mutating commands such as file actions, app settings writes, session steering/responding/canceling unless a later phase opts in.

5. Amend acceptance criteria so “Focus next” cannot fabricate session priority when session APIs are unavailable. It should either operate on observed window/workspace state or state “no actionable session data available.”

6. Add a negative smoke for RepoPrompt socket permission failure, not just missing `rp-cli`.

7. Separate RepoPrompt Agent Mode role labels from Codex/OMX execution agent rosters. The final implementation plan should not hardcode a session-specific agent roster unless it is verified at execution time.