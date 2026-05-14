---
id: 20260413-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba
title: CO: decouple released-claim deferred-poll suppression from unrelated fresh discovery
relates_to: docs/PRD-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md
risk: high
owners:
  - Codex
last_review: 2026-04-13
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`
- PRD: `docs/PRD-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`
- Task checklist: `tasks/tasks-linear-d26b2799-a4a1-41d0-87cb-ee64eabcdbba.md`

## Traceability
- Linear issue: `CO-161` / `d26b2799-a4a1-41d0-87cb-ee64eabcdbba`
- Linear URL: https://linear.app/asabeko/issue/CO-161/co-decouple-released-claim-deferred-poll-suppression-from-unrelated

## Summary
- Objective: prove whether released-only deferred-poll cached skips block unrelated runnable discovery and because the proof was real, record the landed suppression-seam split without reintroducing retained released-claim direct reads.
- Scope:
  - deferred-poll suppression routing in `providerIssueHandoff.ts`
  - focused regressions in `ProviderIssueHandoff.test.ts`
- Constraints:
  - preserve local-first retained released-claim handling from `CO-160`
  - preserve `CO-159` and other non-released cached fail-closed suppression paths
  - avoid widening into cadence or budget redesign

## Technical Requirements
- Functional requirements:
  - prove or disprove the unrelated runnable suppression case when retained claims are fully released and deferred polls would otherwise rely on `fresh_discovery`
  - retain zero per-claim `resolveTrackedIssue(...)` / `dispatch_source_issue_by_id` reads for retained released claims during deferred polls
  - if the case is real, let bounded unrelated discovery proceed without changing non-released cached suppression behavior
  - keep regression coverage for both retained all-released local-first handling and mixed/unrelated runnable discovery
- Non-functional requirements:
  - keep the fix local to the poll suppression seam
  - keep the acceptance proof machine-checkable
  - keep the behavior change explicit in docs and tests rather than implicit in code only
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused `ProviderIssueHandoff` regressions for the all-released and unrelated-discovery cases
  - required repo validation floor after implementation
- Rollout verification:
  - retained released claims remain local-first and zero-direct-read
  - unrelated runnable work can still be admitted when release-only cached truth was otherwise the only blocker
  - deferred `fresh_discovery` does not replay the same released issue through the generic dispatch path
  - non-released cached suppression paths still behave as before
- Monitoring / alerts:
  - rely on existing tracked-issue query source attribution and provider poll tests; no new external alert surface is required in this lane

## Open Questions
- Resolved on 2026-04-13: the narrowest separation is a dedicated fresh-discovery suppression helper rather than a richer skip disposition shape.

## Approvals
- Reviewer: docs-review child stream completed; packet truth was refreshed on the parent branch after the stale-spec finding.
- Date: 2026-04-13
