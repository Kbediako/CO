---
id: 20260412-linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d
title: CO: stop startup recovery sweeps from burning issue-by-id reads for retained released claims
relates_to: docs/PRD-linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md
risk: high
owners:
  - Codex
last_review: 2026-04-12
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`
- PRD: `docs/PRD-linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`
- Task checklist: `tasks/tasks-linear-8c691f55-5277-443a-b5dd-1f3f548b1b6d.md`

## Traceability
- Linear issue: `CO-162` / `8c691f55-5277-443a-b5dd-1f3f548b1b6d`
- Linear URL: https://linear.app/asabeko/issue/CO-162/co-stop-startup-recovery-sweeps-from-burning-issue-by-id-reads-for

## Summary
- Objective: stop startup full recovery sweep from burning direct issue-by-id reads for locally terminal retained released claims after `CO-160` while preserving runnable recovery-sweep work and explicit live reopen paths.
- Scope:
  - startup poll caller contract in `controlServerPublicLifecycle.ts`
  - released-claim poll fallback handling in `providerIssueHandoff.ts`
  - focused recovery-sweep regressions in `ProviderIssueHandoff.test.ts` and `ControlServerPublicLifecycle.test.ts`
- Constraints:
  - preserve the deferred-poll no-burn contract from `CO-160`
  - keep recovery-sweep returned tracked issues runnable
  - avoid widening into general fresh-discovery policy or scheduler redesign

## Technical Requirements
- Functional requirements:
  - startup recovery sweep must not call direct issue-by-id resolution for retained released inactive or non-mutable claims that are missing from the returned tracked-issue map
  - recovery-sweep returned tracked issues must still flow through existing owned/start or resume handling
  - deferred-poll all-released behavior from `CO-160` must remain unchanged
  - non-deferred explicit reopen and active-run recovery must still be able to revalidate live state when needed
- Non-functional requirements:
  - keep the fix narrow to one startup caller seam plus shared poll fallback handling
  - keep acceptance proof machine-checkable through focused tests and restart evidence
  - do not add unrelated budget-policy or discovery-policy churn
- Interfaces / contracts:
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ControlServerPublicLifecycle.test.ts`

## Validation Plan
- Tests / checks:
  - audited docs-review before implementation
  - focused `ProviderIssueHandoff` recovery-sweep regressions
  - focused `ControlServerPublicLifecycle` caller-contract regressions
  - required repo validation floor after implementation
- Rollout verification:
  - no `resolveTrackedIssue` or `dispatch_source_issue_by_id` calls occur for the all-released startup recovery-sweep case
  - at least one runnable recovery-sweep tracked issue is still processed normally
  - deferred-poll and non-deferred reopen behavior remain intact
  - guarded restart proof shows no new request-burn entries for `dispatch_source_issue_by_id` after the first startup recovery sweep
- Monitoring / alerts:
  - rely on existing `request_burn_history` source attribution and intake snapshots; no new external alerting surface is required

## Decision
- Use the dedicated startup poll flag `allowPollFailClosed`, but scope that startup path to released-claim cached fail-closed behavior only. Broader cached fail-closed reasons remain tied to the deferred-poll `deferFreshDiscovery` path.

## Approvals
- Reviewer: pending docs-review evidence
- Date: 2026-04-12
