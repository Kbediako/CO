---
id: 20260324-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514
title: CO Reduce Review Long Tails and Make Review Evidence Accounting Truthful
status: in_progress
owner: Codex
created: 2026-03-24
last_review: 2026-05-18
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md
related_action_plan: docs/ACTION_PLAN-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md
related_tasks:
  - tasks/tasks-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md
review_notes:
  - 2026-03-24: Opened from Linear issue `CO-16` after confirming the live team workflow state is `Ready`, transitioning it to `In Progress`, and verifying that `In Review` is the actual review-handoff alias for this team.
  - 2026-03-24: Baseline audit confirmed the issue is real: a recent review telemetry artifact terminated as `failed` with `termination_boundary.kind: relevant-reinspection-dwell` and `provenance: post-startup-anchor` while the matching manifest and run summary still reported success.
  - 2026-03-24: The current low-yield diff tail seam lives in the review runtime/state path rather than in docs alone, so this lane owns both runtime behavior and truthful downstream evidence accounting.
  - 2026-03-24: Large uncommitted review scope is currently advisory-only; this issue explicitly tightens the contract to require scope narrowing or a recorded override.
  - 2026-03-24: Delegation is explicitly overridden for this worker run because subagent spawning is unavailable in-session; the planned patch remains bounded to review runtime/state/accounting, focused docs updates, and targeted regressions.
  - 2026-03-24: docs-review approved the packet on `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T08-11-34-245Z-b218e257/manifest.json`; the line-budget fix stayed bounded to restoring the active `0963` snapshot and compressing its historical header/update pair by one line instead of archiving an in-progress task.
  - 2026-04-24: Re-reviewed for CO-343 Apr 24 freshness restoration; the packet remains active historical/operator evidence, so only freshness metadata changed.
  - 2026-05-18: CO-522 active-spec audit found 3 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Technical Specification

## Context

Standalone review already tracks bounded termination boundaries and scope advisories, but the current implementation still has two operator-visible failures. First, bounded diff reviews can keep rereading after startup anchor when concrete progress is effectively zero. Second, downstream success reporting can stay optimistic even when review telemetry records a stale or contradictory terminal outcome. Current large-scope behavior also warns without forcing an explicit operator choice.

## Requirements

1. Add a bounded post-startup low-yield stop for diff reviews that terminates on the truthful success side once concrete progress stays near zero.
2. Preserve deeper review behavior when the scope is not diff-bounded or the review continues to make meaningful concrete progress.
3. Ensure terminal review telemetry can represent success-side bounded termination instead of erasing the boundary on successful completion.
4. Ensure docs-review and implementation-gate require fresh, terminal, internally consistent review evidence across telemetry, manifest, and run-summary consumers unless an explicit waiver is recorded.
5. Ensure large uncommitted review scope requires `--base`, `--commit`, or an explicit override when thresholds trip.
6. Update operator-facing docs so the tighter large-scope and truthfulness behavior is explicit.
7. Add focused regressions covering the runtime/state/telemetry seams called out in the issue acceptance criteria.
8. Keep the issue active until a PR is attached and the team review handoff is ready.

## Current Truth

- `scripts/lib/review-execution-state.ts` already computes relevant-reinspection dwell candidates and termination-boundary records, but the current success telemetry path clears `termination_boundary`.
- `scripts/lib/review-execution-runtime.ts` currently treats post-startup relevant-reinspection dwell as a failure path rather than a bounded success-side stop for low-yield diff reviews.
- `scripts/run-review.ts` and `scripts/lib/review-scope-advisory.ts` currently treat large uncommitted scope as advisory-only instead of explicit gate-or-override behavior.
- Review-gated pipeline consumers currently rely too heavily on review command process success; the baseline audit shows a terminal mismatch where manifest/run-summary claim success while review telemetry later records bounded failure.
- Recent artifact evidence is captured in `out/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/manual/20260324T080455Z-baseline-audit.md`.
- This worker run cannot use spawned subagents, so delegation guard must be satisfied with an explicit override rather than fabricated delegation evidence.

## Validation Plan

- docs-review before implementation with explicit delegation override
- focused regressions in `tests/run-review.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/review-execution-telemetry.spec.ts`, and the large-scope advisory test seam
- required repo validation floor after implementation
- PR attachment to Linear before transition to `In Review`

## Manifest Evidence

- Docs-review manifest: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T08-11-34-245Z-b218e257/manifest.json`
- Baseline audit: `out/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/manual/20260324T080455Z-baseline-audit.md`
