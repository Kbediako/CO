---
id: 20260428-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec
title: "CO-406 no-run accepted recover capacity accounting"
relates_to: docs/PRD-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md
risk: high
owners:
  - Codex
last_review: 2026-04-28
related_action_plan: docs/ACTION_PLAN-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md
task_checklists:
  - tasks/tasks-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md
---

# TECH_SPEC - CO-406 no-run accepted recover capacity accounting

This file mirrors the canonical spec at `tasks/specs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`.

## Canonical Reference
- PRD: `docs/PRD-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- Task checklist: `tasks/tasks-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- Linear issue: `CO-406` / https://linear.app/asabeko/issue/CO-406/control-host-no-run-accepted-recover-claims-can-self-block-admission

## Summary
- Objective: ensure accepted pending-revalidation no-run recover claims do not consume running/launching provider-worker capacity or self-block same-issue retries as `provider_issue_start_blocked:max_concurrency`.
- Scope: provider-worker admission accounting, provider-intake/read-model active versus running classification, and focused regressions.
- Constraints: preserve duplicate launch protection for real running or launching claims, preserve auditable provider-intake state, and exclude CO-404 acknowledgement-timeout behavior.

## Issue-Shaping Contract
- User-request translation carried forward: CO-406 fixes admission/capacity accounting for a retained `accepted` / `provider_issue_rehydration_pending_revalidation` claim with `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, and `launch_token=null`. That retained claim may remain visible, but it must not count as a running worker slot or block its own retry as max concurrency.
- Protected terms / exact artifact and surface names: `accepted pending-revalidation claims`, `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, `launch_token=null`, `provider_issue_start_blocked:max_concurrency`, `provider_issue_rehydration_pending_revalidation`, `control_host_provider_worker_recover`, `recover/relaunch/nudge`, `running=2`, `max_allowed=3`, `co-status --format json`, `/ui/data.json`, `provider-intake-state.json`, `controlRuntime.ts`, and `providerIssueHandoff.ts`.
- Nearby wrong interpretations to reject: changing CO-404 timeout semantics, deleting retained provider-intake claims, treating all `accepted` claims as live occupancy, weakening duplicate-worker protection, or solving only display output while admission still counts stale capacity.
- Explicit non-goals carried forward: no provider workflow redesign, no broad current-state authority consolidation, no manual provider-intake cleanup tool, and no unrelated review-wrapper, docs freshness, or release detector work.

## Capacity Authority Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Provider-intake claims | `accepted` no-run recover residue can be retained. | Retained no-run rows are audit/revalidation state, not running occupancy. | Capacity predicate excludes accepted claims with no `run_id`, no `run_manifest_path`, no `launch_started_at`, and no `launch_token`. | Deleting retained rows. |
| Admission retries | Same-issue residue can self-block as `provider_issue_start_blocked:max_concurrency`. | WIP cap should count live workers and in-flight launches. | Same-issue no-run residue does not consume retry capacity. | Bypassing cap for other active issues. |
| Control-host status | Accepted active identifiers can diverge from running worker truth. | Operators need both active intake truth and running worker truth. | `co-status --format json`, `/ui/data.json`, and provider-intake state agree on active/no-run versus running. | UI redesign. |
| Duplicate protection | Running/launching claims block duplicate starts. | Admission single-flight safety must remain intact. | Real run or launch evidence still blocks duplicate starts. | Weakening CO-125 admission constraints. |

## Readiness Gate
- Not done if a no-run accepted pending-revalidation claim still consumes capacity, the same issue self-blocks as `provider_issue_start_blocked:max_concurrency`, duplicate launches become possible, status surfaces disagree on running workers, or CO-404 acknowledgement-timeout behavior changes.
- Pre-implementation issue-quality review evidence: on 2026-04-28 the lane was classified as high-risk because it touches admission safety, status truth, and duplicate-launch protection.
- Safeguard ownership split: parent owns docs/source/Linear/PR/review; tests child lane owns `orchestrator/tests/ProviderIssueHandoff.test.ts` and `orchestrator/tests/ControlRuntime.test.ts` until accepted, rejected, or invalidated.

## Technical Requirements
- Functional requirements: centralize or reuse a capacity predicate, exclude accepted no-run/no-launch claims from occupancy, avoid same-issue self-blocking as max concurrency, preserve duplicate protection for real active claims, and keep active/running identifiers distinct across status surfaces. Source inspection on 2026-04-28 found the needed admission/read-model distinction already present on current `origin/main`; this lane pins it with focused regressions.
- Non-functional requirements: fail closed for ambiguous live run or launch evidence, keep admission deterministic under cap pressure, and avoid broad refactors.
- Interfaces / contracts: provider-intake state remains backward compatible; `co-status --format json` and `/ui/data.json` continue exposing counts and provider-intake summaries; CLI surface remains unchanged.

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider admission capacity | Accepted pending-revalidation no-run claim counted as active capacity | remove fallback | CO-406 | Retry sees retained accepted claim without run or launch evidence. | observed 2026-04-27 | N/A after removal | N/A after removal | No-run accepted claims are excluded from occupancy. | `ProviderIssueHandoff` regression for `running=2`, `max_allowed=3`, same-issue accepted no-run claim. |
| Provider-intake audit state | Retained accepted pending-revalidation no-run claim | justify retaining fallback | CO-406 | Recover/relaunch/nudge persists a revalidation claim before launch evidence exists. | observed 2026-04-27 | 2026-05-12 | Non-expiring only as non-occupancy audit state | Replace with an explicit non-occupancy state if introduced. | Control-runtime/status regression proves visible but non-running. |
| Provider admission single-flight | Running or launching claims block duplicate starts | justify retaining fallback | CO-125 / CO-406 | Claim has `run_id`, `run_manifest_path`, `launch_started_at`, or `launch_token` evidence. | existing provider admission contract | 2026-05-12 | Non-expiring duplicate-launch safety contract | Replace only with stronger launch lock. | Duplicate-running/launching regression stays green. |

Large-refactor check: another minor seam is acceptable only if occupancy classification is centralized and no new status authority is introduced.

## Architecture & Data
- Architecture / design adjustments: prefer a small predicate/helper near provider-intake/admission code and thread it into read models.
- Data model changes / migrations: no migration expected; optional additive status metadata is allowed if needed.
- External dependencies / integrations: Linear issue state, provider-worker WIP cap, retained provider-intake state, control-host status API, and UI dataset.

## Validation Plan
- Tests / checks: docs-review before implementation, focused `ProviderIssueHandoff` and `ControlRuntime` regressions, validation floor, manifest-backed standalone review, and elegance pass.
- Rollout verification: workpad records child-lane result, focused tests, full validation, review telemetry, PR attachment, and ready-review drain.
- Monitoring / alerts: existing `co-status` and provider-intake diagnostics provide operator-visible proof.

## Open Questions
- Whether status output needs a new explicit no-run accepted count.
- Resolved 2026-04-28: keep the existing `providerIssueHandoff.ts` admission predicate and provider-intake active/running summary split; no helper move is needed for CO-406.

## Approvals
- Reviewer: docs-review / standalone review pending
- Date: 2026-04-28
