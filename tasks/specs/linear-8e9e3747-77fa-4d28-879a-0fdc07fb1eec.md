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

## Canonical Reference
- PRD: `docs/PRD-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- Task checklist: `tasks/tasks-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- Linear issue: `CO-406` / https://linear.app/asabeko/issue/CO-406/control-host-no-run-accepted-recover-claims-can-self-block-admission

## Summary
- Objective: ensure accepted pending-revalidation no-run recover claims do not consume running/launching provider-worker capacity or self-block same-issue retries as `provider_issue_start_blocked:max_concurrency`.
- Scope:
  - provider-worker admission accounting in `providerIssueHandoff.ts`
  - provider-intake/read-model active versus running classification in control-host status surfaces
  - focused regressions in `ProviderIssueHandoff` and `ControlRuntime` coverage
- Constraints:
  - preserve duplicate launch protection for real running or launching claims
  - preserve auditable provider-intake state
  - exclude CO-404 acknowledgement-timeout behavior

## Issue-Shaping Contract
- User-request translation carried forward: CO-406 fixes admission/capacity accounting for a retained `accepted` / `provider_issue_rehydration_pending_revalidation` claim that has no run and no launch token. That retained claim may remain visible, but it must not count as a running worker slot or block its own retry as max concurrency.
- Protected terms / exact artifact and surface names:
  - `accepted pending-revalidation claims`
  - `run_id=null`
  - `run_manifest_path=null`
  - `launch_token=null`
  - `provider_issue_start_blocked:max_concurrency`
  - `provider_issue_rehydration_pending_revalidation`
  - `control_host_provider_worker_recover`
  - `recover/relaunch/nudge`
  - `running=2`
  - `max_allowed=3`
  - `co-status --format json`
  - `/ui/data.json`
  - `provider-intake-state.json`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
- Nearby wrong interpretations to reject:
  - changing acknowledgement timeout semantics from CO-404
  - deleting retained provider-intake claims instead of correcting occupancy classification
  - treating all `accepted` claims as live occupancy
  - weakening real duplicate-worker protection
  - solving only display output while admission still counts stale capacity
- Explicit non-goals carried forward:
  - no provider workflow redesign
  - no broad current-state authority consolidation
  - no manual provider-intake cleanup tool
  - no unrelated review-wrapper, docs freshness, or release detector work

## Capacity Authority Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Provider-intake claims | `accepted` no-run recover residue can be retained. | Retained no-run rows are audit/revalidation state, not running occupancy. | Capacity predicate excludes accepted claims with no `run_id`, no `run_manifest_path`, no `launch_started_at`, and no `launch_token`. | Deleting retained rows. |
| Admission retries | Same-issue residue can self-block as `provider_issue_start_blocked:max_concurrency`. | WIP cap should count live workers and in-flight launches. | Same-issue no-run residue does not consume the slot used to decide retry eligibility. | Bypassing cap for other active issues. |
| Control-host status | Accepted active identifiers can diverge from running worker truth. | Operators need both active intake truth and running worker truth. | `co-status --format json`, `/ui/data.json`, and provider-intake state agree on active/no-run versus running. | UI redesign. |
| Duplicate protection | Running/launching claims block duplicate starts. | Admission single-flight safety must remain intact. | Real run or launch evidence still blocks duplicate starts. | Weakening CO-125 admission constraints. |

## Readiness Gate
- Not done if:
  - a no-run accepted pending-revalidation claim still consumes running/launching capacity
  - the same issue can still self-block as `provider_issue_start_blocked:max_concurrency`
  - duplicate provider-worker launches become possible for real running or launching claims
  - `co-status --format json`, `/ui/data.json`, and provider-intake state disagree on running workers
  - CO-404 acknowledgement-timeout behavior changes
- Pre-implementation issue-quality review evidence:
  - 2026-04-28: micro-task path is unavailable because the fix touches admission safety, status truth, and duplicate-launch protection.
  - 2026-04-28: the issue is narrower than CO-404 and broader than a display-only status repair.
- Safeguard ownership split:
  - parent owns docs, implementation, Linear state, PR, review, and source files
  - tests child lane owns `orchestrator/tests/ProviderIssueHandoff.test.ts` and `orchestrator/tests/ControlRuntime.test.ts` until accepted, rejected, or invalidated

## Technical Requirements
- Functional requirements:
  - Define or reuse a capacity predicate that returns false for accepted pending-revalidation claims with no `run_id`, no `run_manifest_path`, no `launch_started_at`, and no `launch_token`.
  - Apply that predicate anywhere accepted claims are counted as running or launching capacity.
  - Ensure recover/relaunch/nudge retries for the same no-run accepted claim do not return `provider_issue_start_blocked:max_concurrency` solely because of that claim.
  - Preserve duplicate protection when a claim has live run evidence or launch evidence.
  - Keep provider-intake state audit-visible and status-visible.
  - Keep `active_issue_identifiers` and `running_issue_identifiers` distinct and truthful across `co-status --format json` and `/ui/data.json`.
- Non-functional requirements:
  - Fail closed for ambiguous live run or launch evidence.
  - Keep admission behavior deterministic under WIP cap pressure.
  - Avoid broad source refactors.
- Interfaces / contracts:
  - Provider-intake state schema remains backward compatible.
  - `co-status --format json` and `/ui/data.json` continue to expose counts and provider-intake summaries.
  - Linear helper and provider-worker lifecycle commands remain unchanged at the CLI surface.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider admission capacity | Accepted pending-revalidation no-run claim counted as active capacity | remove fallback | CO-406 | Retry sees a retained accepted claim without run or launch evidence. | observed 2026-04-27 | N/A after removal | N/A after removal | No-run accepted claims are excluded from occupancy. | `ProviderIssueHandoff` regression for `running=2`, `max_allowed=3`, same-issue accepted no-run claim. |
| Provider-intake audit state | Retained accepted pending-revalidation no-run claim | justify retaining fallback | CO-406 | Recover/relaunch/nudge persists a revalidation claim before launch evidence exists. | observed 2026-04-27 | 2026-05-12 | Non-expiring only as non-occupancy audit state | Replace with an explicit non-occupancy state if introduced. | Control-runtime/status regression proves visible but non-running. |
| Provider admission single-flight | Running or launching claims block duplicate starts | justify retaining fallback | CO-125 / CO-406 | Claim has `run_id`, `run_manifest_path`, `launch_started_at`, or `launch_token` evidence. | existing provider admission contract | 2026-05-12 | Non-expiring duplicate-launch safety contract | Replace only with stronger launch lock. | Duplicate-running/launching regression stays green. |

- For `justify retaining fallback`, contract names:
  - provider-intake pending-revalidation audit state
  - provider-worker duplicate-launch single-flight protection
- Large-refactor check: another minor seam is acceptable if the implementation centralizes occupancy classification and does not create a new status authority. Escalate to a separate current-state authority issue only if source inspection shows incompatible duplicated capacity models.

## Architecture & Data
- Architecture / design adjustments:
  - Prefer a small predicate/helper near provider-intake/admission code over spreading ad hoc checks.
  - Thread the active-versus-running distinction into status/read-model outputs using existing provider-intake summary structures where possible.
- Data model changes / migrations:
  - No migration expected.
  - Optional additive status metadata is allowed if required to represent no-run accepted non-occupancy truth.
- External dependencies / integrations:
  - Linear issue state and provider-worker WIP cap
  - retained provider-intake state
  - control-host status API and UI dataset

## Validation Plan
- Tests / checks:
  - docs-review before implementation
  - focused `ProviderIssueHandoff` regression for same-issue no-run accepted claim under max concurrency
  - focused duplicate-protection regression for real running/launching claim
  - focused `ControlRuntime` or status projection regression proving active accepted/no-run and running worker claims remain distinct
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review and elegance pass
- Rollout verification:
  - workpad records child-lane result, focused tests, full validation, review telemetry, PR attachment, and ready-review drain.
- Monitoring / alerts:
  - no new runtime monitor required; existing `co-status` and provider-intake diagnostics provide the operator-visible proof.

## Open Questions
- Resolved 2026-04-28: distinct active/running identifiers satisfy CO-406; no new no-run count is needed for this issue.
- Resolved 2026-04-28: source inspection found the existing admission predicate already excludes `accepted` claims from occupancy and provider-intake summaries already split active from running claims. This lane pins that contract with focused handoff and status/UI regressions rather than moving the predicate.

## Approvals
- Reviewer: docs-review / standalone review pending
- Date: 2026-04-28
