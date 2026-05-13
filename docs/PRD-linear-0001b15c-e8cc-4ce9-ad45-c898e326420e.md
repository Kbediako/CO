# PRD - CO STATUS: finish post-CO-103 Symphony parity for Agents, live runtime ticking, and EVENT truth

## Added by Bootstrap 2026-04-08

## Traceability
- Linear issue: `CO-107` / `0001b15c-e8cc-4ce9-ad45-c898e326420e`
- Linear URL: https://linear.app/asabeko/issue/CO-107/co-status-finish-post-co-103-symphony-parity-for-agents-live-runtime
- Source issue: `CO-103` / `f71992e3-ddda-4198-b43c-97ccb36908cf`

## Summary
- Problem Statement: current `main` after `CO-103` is still short of the bounded Symphony handling-model parity required by the issue. The terminal header still renders `Agents` as `running/tracked` rather than `running/max_allowed`, the live STATUS clock still appears snapshot-driven because the visible header `Runtime`, running-row `AGE / TURN`, and event-age text do not advance independently of fresh datasets, and the running-row `EVENT` surface still allows dashboard-local fallback text like `turn running` to outrank richer authoritative message/progress data that already exists upstream.
- Desired Outcome: land the smallest truthful STATUS patch that finishes the post-`CO-103` remainder without reopening adjacent work. `CO STATUS` should show `running/max_allowed`, keep operator-visible elapsed-time surfaces ticking locally every second during live monitoring, and treat upstream message/progress text as the authoritative running `EVENT` surface with raw event/timestamp preserved for secondary semantics.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish the remaining current-`main` STATUS truth gap against the Symphony Elixir reference, but keep the lane tightly bounded to the three remaining operator-visible defects called out in the issue. The solution must use the same runtime/config contract Symphony uses for agent capacity semantics, must provide genuine local live ticking rather than forced snapshot rereads, and must push `EVENT` meaning upstream so the terminal renderer stops inventing generic fallback truth.
- Success criteria / acceptance:
  - header `Agents` renders `running/max_allowed`
  - the denominator comes from the same live runtime/config contract that governs provider worker concurrency, not from tracked issue count
  - header `Runtime`, row `AGE / TURN`, and relative event-age text advance locally every second while monitoring
  - running-row `EVENT` is message-first and projection-authored; generic fallback text only appears when that is the only authoritative signal left
  - tests document the exact Symphony mapping for agent denominator, event handling, and live clock behavior
  - closeout includes real device screenshots embedded directly in Linear
- Constraints / non-goals:
  - do not reopen unrelated rate-limit hardening, token/session restoration, attach-viewer work, paused-scrollback cleanup, or HTTP dashboard redesign
  - do not call a forced 1-second snapshot reread `live ticking` if the visible counters still freeze between upstream updates
  - do not keep `running/tracked` and claim Symphony parity

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO STATUS`
  - `Agents`
  - `Runtime`
  - `AGE / TURN`
  - `EVENT`
  - `running/max_allowed`
  - `current_running/current_tracked`
  - `controlStatusDashboard.ts`
  - `compatibilityIssuePresenter.ts`
  - `controlRuntime.ts`
  - `status_dashboard.ex`
  - `dashboard_live.ex`
  - `presenter.ex`
  - `orchestrator.ex`
  - `max_concurrent_agents`
  - `Symphony Elixir handling model`
- Protected terms / exact artifact and surface names:
  - `CO STATUS`
  - `Agents`
  - `Runtime`
  - `AGE / TURN`
  - `EVENT`
  - `running/max_allowed`
  - `current_running/current_tracked`
- Nearby wrong interpretations to reject:
  - “fix the old `CO-103` screenshot hygiene miss instead of current STATUS behavior”
  - “counting tracked issues is close enough to max allowed concurrency”
  - “rerendering with the same frozen reference time counts as live ticking”
  - “leave event semantics in `summarizeRunningEvent(...)` and just rename strings”
  - “broaden into new rate-limit/token/dashboard redesign work”

## Non-Goals
- Retroactively repairing the `CO-103` proof record without changing current STATUS behavior.
- Reopening rate-limit hardening beyond what is needed to keep `EVENT` truthful.
- Reopening token/session telemetry restoration already handled by `CO-83`, `CO-98`, and `CO-99`.
- Attach-viewer, paused-scrollback, or HTTP dashboard redesign work.
- Pixel-cloning Symphony UI instead of matching the relevant handling model.

## Parity / Alignment Matrix
- Current CO:
  - header `Agents` is `counts.running / counts.issues tracked`
  - live viewer refreshes every second, but cached rerenders reuse snapshot-derived time anchors so visible runtime/recency text can freeze until a new dataset lands
  - `compatibilityIssuePresenter.ts` already produces `display_event`, but `controlStatusDashboard.ts` still lets `summarizeRunningEvent(...)` choose between `display_event`, `last_message`, event-key humanization, status reason, and summary fallback in ways that still allow low-signal generic text to win
- Reference Symphony:
  - terminal header `Agents` is `length(running) / Config.settings!().agent.max_concurrent_agents`
  - terminal/dashboard elapsed-time surfaces use a 1-second local `now` tick instead of waiting for fresh snapshots to make counters move
  - running row `EVENT` shows humanized last Codex message first, with raw event and timestamp retained as secondary semantics
- Target CO:
  - header `Agents` uses `running/max_allowed`, where `max_allowed` comes from the same live concurrency contract CO already uses for provider admission
  - live STATUS maintains a local wall-clock/reference-time strategy so visible runtime/age/event recency move every second even on cached frames
  - `EVENT` becomes projection-authored and message-first upstream, while the renderer becomes a thin formatter over authoritative fields
- Explicitly out-of-scope differences:
  - unrelated rate-limit display changes already handled by `CO-103`
  - token/session restoration or proof-refresh lanes
  - attach scrolling and dashboard surface redesign already split into other issues

## Not Done If
- Header `Agents` still renders tracked issue count instead of the max allowed concurrency contract.
- Header `Runtime`, row `AGE / TURN`, or event recency still freeze until upstream snapshot refreshes land.
- Running-row `EVENT` can still degrade to generic text like `turn running` or `provider worker turn is active` when richer authoritative message/progress data exists.
- The implementation claims Symphony parity without mapping the chosen CO fields back to the Elixir source behavior.
- Closeout does not include real device screenshots embedded directly in Linear.

## Goals
- Re-map the `Agents` denominator to the same live concurrency contract that already governs provider worker admission.
- Make visible runtime/age/recency text advance locally every second during live monitoring.
- Make running `EVENT` message-first and projection-authored instead of dashboard-inferred.
- Keep the patch bounded to the post-`CO-103` remainder and add focused regression coverage plus live proof.

## Stakeholders
- Product: CO operators relying on truthful `CO STATUS` while provider-worker sessions are live
- Engineering: control runtime, compatibility presenter, dashboard renderer, and provider workflow/dispatch maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - `Agents` visibly renders `running/max_allowed`
  - header runtime, row age, and event-age counters visibly tick every second on a cached frame
  - authoritative message/progress text wins on `EVENT` whenever it exists
  - focused tests prove the Symphony mapping and prevent regression back to tracked-count denominators or generic event fallback
- Guardrails / Error Budgets:
  - keep the denominator wired to the existing live provider concurrency contract instead of inventing a new config source
  - keep renderer logic thin; prefer upstream fields over new dashboard-local heuristics
  - file a follow-up instead of broadening into adjacent STATUS/UI work if more gaps appear during implementation

## User Experience
- Personas:
  - operator watching `CO STATUS` during active provider-worker execution
  - reviewer cross-checking the terminal surface against Symphony handling semantics
- User Journeys:
  - operator sees `Agents` as actual live occupancy over allowed concurrency, not over tracked issue count
  - operator watches runtime, running age, and event recency continue to move even if a fresh dataset is briefly delayed
  - operator sees the latest authoritative message/progress text on `EVENT` rather than generic runtime filler

## Technical Considerations
- Architectural Notes:
  - keep the current runtime/projection substrate authoritative; this lane is not a new observability architecture
  - expose the `max_allowed` denominator from the same runtime/config seam CO already uses for provider poll dispatch concurrency (`max_concurrent_agents` under the provider poll agent contract), rather than from tracked issue count or a new hard-coded constant
  - carry a live clock anchor through the dashboard render path so cached rerenders derive the current reference time from wall-clock elapsed time instead of freezing the first snapshot reference
  - tighten `compatibilityIssuePresenter.ts` so the authoritative running `display_event` prefers real message/progress text and uses raw event/timestamp as secondary context rather than as a competing fallback source
  - keep `controlStatusDashboard.ts` responsible mainly for formatting authoritative fields, not for deciding event truth
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir_web/live/dashboard_live.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`

## Open Questions
- Is the smallest truthful `max_allowed` seam a new field on the compatibility/operator dataset, or should the existing provider workflow/read-model payload grow to carry the live concurrency contract directly?
- Should raw event/timestamp remain implicit secondary data in the running row, or should the projection carry an additional explicit secondary event label to reduce renderer fallback even further?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: `codex-orchestrator docs-review` child stream rerun passed `spec-guard` and `docs:check` after the repo-supported `docs:archive-tasks` trim returned `docs/TASKS.md` under the line budget, then failed only on the existing repo-wide `docs:freshness` stale-doc baseline (`stale docs: 121`, with Task Packet stale=`90`, Task Mirror stale=`18`, Report Only stale=`13`); manual fallback accepted for `linear-0001b15c-e8cc-4ce9-ad45-c898e326420e`
- Design: N/A
