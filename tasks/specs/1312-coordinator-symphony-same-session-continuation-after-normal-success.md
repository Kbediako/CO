---
id: 20260321-1312-coordinator-symphony-same-session-continuation-after-normal-success
title: Coordinator Symphony Same-Session Continuation After Normal Success
status: in_progress
owner: Codex
created: 2026-03-21
last_review: 2026-03-21
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-same-session-continuation-after-normal-success.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-same-session-continuation-after-normal-success.md
related_tasks:
  - tasks/tasks-1312-coordinator-symphony-same-session-continuation-after-normal-success.md
review_notes:
  - 2026-03-21: Opened as the next truthful parity slice after `1311`. The planner result is already settled for sequencing: same-session continuation after normal success lands before the authoritative runtime snapshot slice, so `1312` is intentionally bounded and `1313` remains explicit as the next registered follow-on blocker after this work.
  - 2026-03-21: Upstream authority for this slice remains `/Users/kbediako/Code/symphony/SPEC.md:614-624,980,996-999` plus `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex:83-145`; the authority requires one live app-server session, stable `thread_id` reuse, and continuation-only guidance on later turns.
  - 2026-03-21: The runtime-contract audit tightened the current CO truth: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/types.ts`, `orchestrator/src/cli/orchestrator.ts`, and `orchestrator/src/cli/services/orchestratorResumePreparationShell.ts` show that current `resume` is only a same-`run_id` rerun surface and that CO does not yet persist or reuse a live app-server thread/session handle or accept continuation-only guidance on `resume`.
  - 2026-03-21: `orchestrator/tests/ProviderIssueHandoff.test.ts` still codifies fresh-child-run continuation after `succeeded`, so `1312` cannot be framed as a simple `succeeded -> resume` reroute.
  - 2026-03-21: In this packet, "same-session" means one worker-lifetime app-server session plus stable `thread_id` reuse, not a fixed per-turn `session_id`; the chosen seam is now a provider-specific long-lived worker command/owner inside the existing pipeline model, with `resume(runId)` left rerun-only and post-worker-exit scheduler retry kept separate. `1313` remains the separate follow-on blocker for authoritative runtime snapshot parity.
  - 2026-03-21: Current branch state now lands that provider worker owner plus selected-only proof surfacing; post-worker-exit refresh still starts a fresh provider worker run, so `1312` is a bounded parity slice rather than full closure.
  - 2026-03-21: The `1314` closeout pack is now historical evidence for the earlier `1312`/`1313`/`1314` implemented-on-branch tranche; current branch truth for PR `#283` is that `1315` and `1316` are also landed on branch, but publication remains open and the `1316` closeout root is the current validation vehicle.
---

# Technical Specification

## Context

`1311` left same-session continuation after normal success as a real parity blocker. The runtime-contract audit made the blocker more precise: CO could not resolve it by pointing the `succeeded` path at the existing `resume` surface, because that surface only reruns an existing `run_id` and does not own or address a live app-server thread/session for continuation turns. The current branch now lands the provider-specific worker seam for in-worker same-session continuation, while keeping `resume(runId)` rerun-only and leaving post-worker-exit fresh-start behavior distinct.

## Requirements

1. Do not describe current CO `resume` as same-session continuation; document it truthfully as rerunning an existing `run_id`.
2. Implement `1312` as a provider-specific long-lived worker command/owner inside the existing pipeline model, with a worker-lifetime live app-server/session/thread continuation contract that can continue after a normal successful turn on the same live thread and workspace.
3. Keep the current worker-host and deterministic workspace ownership stable across those continuation turns.
4. Preserve the upstream contract that continuation turns send only continuation guidance rather than replaying the original task prompt.
5. Keep `resume(runId)` rerun-only and keep scheduler-owned retry after normal worker exit distinct from in-worker same-session continuation.
6. Write a narrow run-dir proof snapshot for `thread_id`, latest `session_id`, `turn_count`, owner phase/status, workspace path, and end reason.
7. If the deeper seam is not feasible inside bounded scope, stop `1312` and re-scope rather than overclaim parity.
8. Keep `1313` explicit as the remaining blocker for authoritative runtime snapshot parity after `1312`; parity cannot be claimed from this slice alone.

## Current Truth

- The parity contract for this slice is explicit in `/Users/kbediako/Code/symphony/SPEC.md:614-624,980,996-999`: continuation after a normal turn stays on the same live coding-agent thread in the same workspace up to `agent.max_turns`.
- The current Elixir implementation at `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex:83-145` keeps one app-server session live and recursively continues turns through `do_run_codex_turns(...)`.
- CO still diverges on this exact seam:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts` defines `resume` only in terms of `runId`, `actor`, `reason`, and `launchToken`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts:1026-1047` launches a fresh `start` when the latest run is `succeeded`
  - `orchestrator/src/cli/types.ts:149-156`, `orchestrator/src/cli/orchestrator.ts:109-140`, and `orchestrator/src/cli/services/orchestratorResumePreparationShell.ts:88-135` show that current `resume` reloads and resets an existing manifest for rerun; it does not reuse a live app-server thread/session handle or accept continuation-only guidance
  - `orchestrator/tests/ProviderIssueHandoff.test.ts` currently expects fresh-child-run behavior after `succeeded`
- The chosen implementation seam is now landed on the current branch as a provider-specific long-lived worker command/owner inside the existing pipeline model; it keeps the child run `in_progress` across turns, leaves `resume` rerun-only, derives its max-turns budget from env or `CODEX_HOME/config.toml [agent].max_turns` with the upstream default `20` as fallback, and only hands control back to the existing scheduler retry path after worker exit.
- The current branch also lands the narrow proof sidecar `provider-linear-worker-proof.json` plus selected-only proof surfacing on the selected-run/read-model path; compatibility counters remain intentionally null so `1313` stays explicit.
- The current branch now also fail-closes before turn 1 when the tracked issue is already terminal, so a stale inactive issue does not spend an extra Codex turn.
- `1311` materially covered provider control-host continuation/retry handoff for active issues, but it did not close same-session continuation after normal success.
- `1313` still remains after `1312` for authoritative runtime snapshot parity, so `1312` alone cannot support a truthful parity claim.

## Validation Plan

- docs-review before implementation
- pre-implementation seam check: confirm the chosen provider worker owner is actually feasible inside bounded scope, otherwise record a no-go/rescope result and stop
- focused continuation regressions around `orchestrator/tests/ProviderIssueHandoff.test.ts` only after a truthful deeper continuation contract exists
- any new focused tests needed to prove same-session worker-session/thread/workspace continuity and continuation-only guidance without a fresh child run
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- targeted tests for the chosen seam
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- review
- `npm run pack:smoke` if downstream-facing surfaces are touched
- live provider proof against the existing control host showing continued worker-session/thread/workspace lineage and continuation-only guidance after a normal successful turn while the issue remains active, or explicit stop/rescope evidence if the chosen seam is not feasible
