---
id: 20260321-1312-coordinator-symphony-same-session-continuation-after-normal-success
title: Coordinator Symphony Same-Session Continuation After Normal Success
relates_to: docs/PRD-coordinator-symphony-same-session-continuation-after-normal-success.md
risk: high
owners:
  - Codex
last_review: 2026-03-22
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: keep `1312` truthful after the runtime-contract audit and lock the chosen implementation seam. Current CO cannot reach upstream same-session continuation by routing `latestRun.status === 'succeeded'` into the existing `resume` surface, so `1312` now targets a provider-specific long-lived worker command/owner inside the existing pipeline model. That owner must keep one worker-lifetime live app-server/session/thread alive across turns, send continuation-only guidance on later turns, and return control to today’s scheduler logic only after worker exit.
- Scope: only the provider-specific continuation contract that fires after a normal success when the issue is still active, plus the narrow proof surface needed to show stable thread/session/turn lineage. This slice does not repurpose `resume`, does not rewrite top-level lifecycle, and does not attempt authoritative live counter parity, dashboard expansion, or unrelated lifecycle reassessment.
- Constraints:
  - parity authority is `/Users/kbediako/Code/symphony/SPEC.md`, with the current Elixir runner used to confirm how the contract is realized today
  - `1312` cannot claim full Symphony parity closure on its own because `1313` now remains as the next registered backend-authoritative runtime snapshot slice
  - same-session wording must stay precise about stable thread/session lineage versus turn-local `session_id`
  - current CO `resume` semantics must remain described truthfully as rerunning an existing `run_id` unless a deeper contract explicitly changes that behavior
  - the deeper contract for `1312` is now chosen: a provider-specific long-lived worker command/owner inside the existing pipeline model, not a top-level `resume` or `performRunLifecycle(...)` rewrite

## Implementation Status - 2026-03-21
- Landed on the current branch: `orchestrator/src/cli/providerLinearWorkerRunner.ts` now owns same-session continuation within one provider worker run, `codex.orchestrator.json` registers the `provider-linear-worker` pipeline, and `orchestrator/src/cli/controlHostCliShell.ts` defaults provider starts to that worker pipeline.
- Landed on the current branch: the provider worker resolves its max-turns budget from explicit env, `CODEX_HOME/config.toml [agent].max_turns`, or the upstream Symphony default `agent.max_turns = 20`, and it exits without launching Codex when the tracked issue is already terminal before turn 1.
- Landed on the current branch: `provider-linear-worker-proof.json` is written as the narrow proof sidecar and surfaced only through the selected-run path via `selectedRunProjection` and `observabilityReadModel`; compatibility counters remain intentionally null.
- Still intentionally unchanged: `resume(runId)` remains rerun-only, and post-worker-exit refresh still launches a fresh provider worker run through `providerIssueHandoff` when the issue remains active after the worker exits.

## Current Branch State
- Upstream continuation contract:
  - `/Users/kbediako/Code/symphony/SPEC.md:614-624` requires the worker to re-check issue state after each normal turn completion and, while the issue stays active, start another turn on the same live coding-agent thread in the same workspace up to `agent.max_turns`
  - `/Users/kbediako/Code/symphony/SPEC.md:980,996-999` requires one `thread_id` to be reused for continuation turns inside a worker run, with another `turn/start` on the same live `threadId`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex:83-145` realizes that contract by starting one app-server session, recursively issuing more turns through `do_run_codex_turns(...)`, and building continuation-only guidance instead of restating the original prompt
- Current CO divergence:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts` defines `ProviderIssueLauncher.resume(...)` as `{ runId, actor, reason, launchToken }` and forwards only those rerun-oriented fields
  - `orchestrator/src/cli/control/providerIssueHandoff.ts:1026-1047` resumes only `failed` and `cancelled` runs, but once the latest run is `succeeded` it launches `launchStartForTrackedIssue(...)` with `reason: 'provider_issue_continuation_launched'`
  - `orchestrator/src/cli/types.ts:149-156` defines `ResumeOptions` as `runId`, `resumeToken`, `actor`, `reason`, `format`, `targetStageId`, `runtimeMode`, and `runEvents`; there is no live-thread handle, live app-session handle, or continuation-guidance input
  - `orchestrator/src/cli/orchestrator.ts:109-140` and `orchestrator/src/cli/services/orchestratorResumePreparationShell.ts:88-135` load the prior manifest by `runId`, validate the resume token, record a resume event, call `resetForResume(...)`, and rerun lifecycle on `manifest.run_id`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts:1583-1645` proves the direct accepted-issue path still starts a fresh child run after a succeeded run remains active
  - `orchestrator/tests/ProviderIssueHandoff.test.ts:2735-2944` proves refresh continuation after a succeeded run is currently modeled as another fresh `start`, not same-session live-thread continuation
- Current truthful posture:
  - `1311` materially covered provider control-host continuation/retry handoff for active issues at the scheduler boundary
  - `1311` did not close same-session continuation after a normal success
  - the runtime-contract audit remains the reason `resume` could not be reused for this lane, but the current branch now adds the provider-specific long-lived worker command/owner that keeps one child run `in_progress` across turns
  - the current branch also adds selected-only proof surfacing for `thread_id`, latest turn/session lineage, owner phase/status, and turn count without widening into authoritative `1313` counters
  - post-worker-exit scheduler retry remains a separate, later path and still launches a fresh provider worker run rather than reusing the prior worker instance
  - `1313` still remains after `1312` as the next registered backend-authoritative runtime snapshot slice, so parity cannot be claimed from `1312` alone
  - current branch publication posture on `2026-03-22`: `1312`, `1313`, and `1314` are one integrated implemented publication unit; use `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md` as the current-head closeout summary, and do not cite older `20260321T124445Z-stacked-closeout` or `20260321T124510Z-stack-closeout` packs as current-head validation

## Technical Requirements
- Functional requirements:
  - after a normal successful turn, if the issue is still active and the worker has not exhausted `agent.max_turns`, continuation must reuse the same live worker-lifetime app-server session and thread lineage instead of creating a fresh child run
  - `1312` must implement that behavior through a provider-specific long-lived worker command/owner inside the existing pipeline model; `resume(runId)` remains rerun-only
  - continuation must stay in the same deterministic workspace and preserve current worker-host ownership for that worker lifetime
  - continuation guidance must be incremental and must not resend the original task prompt when the thread already has that context
  - implementation cannot claim same-session parity unless that provider worker owner can actually hold a live app-server/session/thread handle and continuation-only guidance path beyond the current `runId`-only rerun surface
  - orchestrator-owned short continuation retry after normal worker exit must remain distinct from in-worker same-session continuation
  - if CO cannot add that deeper continuation contract within the bounded seam, `1312` must stop with an explicit rescope/no-go outcome rather than relabeling fresh-start or rerun behavior as parity
- Non-functional requirements (performance, reliability, security):
  - no regression to provider claim/release/retry authority already hardened in `1311`
  - same-session continuation must fail closed if the existing live session/thread cannot be resumed safely; docs and implementation must not overclaim partial reuse as parity
  - do not change top-level `resume(...)` or `performRunLifecycle(...)` semantics for this lane
  - do not silently fall back to `launchStartForTrackedIssue(...)` or `resume(runId=...)` and label it same-session continuation
  - read models and logs must stay truthful enough to prove same-session continuation or explicit no-go/rescope without inventing runtime-snapshot parity that belongs to `1313`
- Interfaces / contracts:
  - preserve the upstream distinction between worker-lifetime app-server-session reuse plus stable `thread_id` reuse, and turn-local `session_id = "<thread_id>-<turn_id>"`
  - add a provider-specific worker-owner request shape that can target an existing live thread/session and carry continuation-only guidance without changing current `resume(runId)` semantics
  - preserve scheduler-owned retry behavior after normal worker exit as documented in `/Users/kbediako/Code/symphony/SPEC.md:622-624,751`
  - keep the current provider/control-host contract bounded; do not widen `1312` into tracker-write ownership or authoritative live counter capture

## Architecture & Data
- Architecture / design adjustments:
  - moving the current `latestRun.status === 'succeeded'` branch away from fresh-child-run `start` behavior is necessary but not sufficient; the chosen implementation seam is a provider-specific long-lived worker command/owner launched inside the existing pipeline model
  - the current provider/control-host layer remains scheduler-owned glue; it is not itself the same-session owner because it only knows about claim state, run ids, manifest paths, and rerun/start launches
  - the provider worker owner should keep the child run `in_progress` across turns, re-check issue state after each successful turn, and only hand back to current scheduler retry logic after the worker exits
  - live proof must demonstrate one continued worker-lifetime app-server session and thread lineage after normal success, not merely a quick relaunch into a new run or a rerun of the old manifest
- Data model changes / migrations:
  - current CO does not claim any persisted live app-session or thread-handle contract for this lane
  - `1312` should add a narrow run-dir sidecar snapshot for proof, carrying `thread_id`, latest turn `session_id`, `turn_count`, owner phase/status, workspace path, and end reason; do not persist raw process handles
  - any thread/session lineage surfacing needed for proof must stay narrower than the authoritative live counter work deferred to `1313`
- External dependencies / integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `codex.orchestrator.json`
  - `orchestrator/src/cli/run/runPaths.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/controlAuthenticatedRouteHandoff.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Validation Plan
- Tests / checks:
  - pre-implementation `docs-review` for the registered `1312` packet
  - before implementation, confirm the chosen provider worker owner can actually own a live app-server/session/thread handle and continuation-only guidance path; if it cannot, record a no-go/rescope outcome and stop
  - targeted regression updates around `orchestrator/tests/ProviderIssueHandoff.test.ts` only after a truthful deeper continuation contract exists; replacing the current fresh-child-run expectation alone is not sufficient
  - any new focused tests required to prove stable thread/session lineage, same-workspace continuation, and continuation-only guidance without a new child run
  - standard implementation lane checks before closeout: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, targeted tests, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, review, and `npm run pack:smoke` if downstream-facing surfaces are touched
- Rollout verification:
  - if the chosen provider worker owner is implemented, live proof on the existing control host should show a normal successful turn on an issue that remains active, then another turn continuing on the same live app-server session, thread, and workspace lineage rather than a fresh child run directory
  - live proof must also show that continuation-only guidance, not the original full task prompt, is sent on later turns
  - if the deeper seam is not implementable in bounded scope, the rollout result for `1312` is an explicit stop/rescope decision with no parity claim
  - live proof should preserve the current truthful sequencing: `1312` closes only when same-session continuation is visible; `1313` still remains afterward for authoritative live observability counters, so `1312` alone still does not close full Symphony parity
- Monitoring / alerts:
  - inspect provider/control-host state and selected-run lineage for any fresh-child-run restart on the normal-success continuation path
  - inspect logs/manifests for stable thread/workspace continuity across the continuation turn path
  - if live handle reuse is added, inspect the chosen proof surface for stable worker-session/thread continuity rather than inferring from `run_id` alone

## Open Questions
- Resolved on the current branch: the runtime-session proof snapshot remains the dedicated run-dir sidecar `provider-linear-worker-proof.json` for `1312`; it is not mirrored into the authoritative manifest-backed counter surfaces.
- Resolved on the current branch: the minimal live-proof surface is the selected-run/read-model path only, including the selected runtime fingerprint so proof-only updates are visible to selected-run readers without widening compatibility counters.
- Remaining open question: live provider proof on the existing control host is still pending for end-to-end closure of this slice.

## Approvals
- Reviewer: docs-review rerun recorded at `.runs/1312-coordinator-symphony-same-session-continuation-after-normal-success/cli/2026-03-21T09-06-58-400Z-8f084cf2/manifest.json`.
- Date: 2026-03-22
