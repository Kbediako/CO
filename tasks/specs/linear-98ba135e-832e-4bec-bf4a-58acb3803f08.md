---
id: 20260330-linear-98ba135e-832e-4bec-bf4a-58acb3803f08
title: CO: Clarify bounded-success vs failed review-wrapper outcomes for operators
status: done
owner: Codex
created: 2026-03-30
last_review: 2026-04-30
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md
related_action_plan: docs/ACTION_PLAN-linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md
related_tasks:
  - tasks/tasks-linear-98ba135e-832e-4bec-bf4a-58acb3803f08.md
review_notes:
  - 2026-04-30: CO-428 live Linear audit confirmed CO-28 is `Done`; this completed-lane spec is reclassified to inactive `done` under canonical owner key `spec-guard:active-specs:last_review=2026-03-30` so historical implementation evidence remains preserved without staying in active-spec freshness.
  - 2026-03-30: Live `linear issue-context` confirmed the CO team workflow states, no attached PR, and no existing workpad on `CO-28`; the issue was moved from `Ready` to `In Progress` before active coding.
  - 2026-03-30: The bootstrap workpad was created in the single required `## Codex Workpad` comment after the state transition.
  - 2026-03-30: Baseline audit on the current tree confirmed the remaining gap is an operator-facing interpretation seam, not missing boundary detection: recent evidence includes one succeeded review with `termination_boundary: null`, one succeeded review with `termination_boundary.kind: relevant-reinspection-dwell`, and one failed review with `termination_boundary.kind: command-intent`.
  - 2026-03-30: The current wrapper success path persists `termination_boundary` but does not emit an explicit terminal outcome classification or downstream summary shaping that tells operators whether that boundary was success-side or failure-side.
---

# Technical Specification

## Context

`CO-16` already changed standalone review so low-yield post-startup rereads can end as truthful bounded success while preserving the success-side `termination_boundary`. The remaining defect is narrower and operator-facing: current review artifacts, summary lines, and worker guidance still make a succeeded review with a non-null boundary too easy to misread as wrapper failure or generic quiet-tail blockage.

## Requirements

1. Persist a machine-checkable terminal review outcome classification that distinguishes `bounded-success` from actual wrapper failure without replacing the existing `termination_boundary` family contract.
2. Keep bounded-success review runs on the success side while preserving their `termination_boundary` family and provenance.
3. Keep real review-wrapper failures explicit and machine-checkable, including existing command-intent, startup-loop, timeout, and stall families.
4. Surface the bounded-success versus failure distinction in operator-facing review outputs:
   - wrapper closeout/telemetry summary lines
   - downstream review-stage summaries used by manifests or validation packets
   - worker-facing handoff/workpad guidance
5. Update repo docs so operators know how to interpret a non-null `termination_boundary` together with the explicit terminal outcome classification.
6. Keep the patch narrow to review outcome presentation/interpretation surfaces and focused regressions; do not change the underlying boundary policies or widen into the older repo-test quiet-tail blocker.

## Current Truth

- `scripts/lib/review-execution-telemetry.ts` persists `status` plus `termination_boundary`, but no explicit terminal-outcome classification says whether a preserved boundary was success-side or failure-side.
- `scripts/lib/review-launch-attempt.ts` logs telemetry summaries only on failure paths; the success path writes telemetry but does not emit an explicit bounded-success interpretation line.
- `orchestrator/src/cli/services/commandRunner.ts` verifies review telemetry freshness/status/output-log affinity, but the resulting success summary still does not explain when review succeeded via bounded completion.
- `docs/standalone-review-guide.md` notes that success-side bounded completion preserves `termination_boundary`, but it does not yet tell operators how to read that state distinctly from true wrapper failure.
- `orchestrator/src/cli/providerLinearWorkerRunner.ts` and `skills/linear/SKILL.md` currently require standalone review/elegance gates and workpad refreshes, but they do not yet state that `bounded-success` review telemetry should be recorded as successful review completion rather than as a blocker or generic quiet-tail failure.
- Baseline audit evidence is recorded in `out/linear-98ba135e-832e-4bec-bf4a-58acb3803f08/manual/20260330T064530Z-baseline-audit.md`.

## Validation Plan

- `linear child-stream --pipeline docs-review` after the docs-first packet lands
- focused regressions in `tests/review-execution-telemetry.spec.ts`, `tests/run-review.spec.ts`, `orchestrator/tests/CommandRunnerReviewEvidenceConsistency.test.ts`, and `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- required repo validation floor after implementation
- standalone review plus elegance review before any review handoff

## Manifest Evidence

- Baseline audit: `out/linear-98ba135e-832e-4bec-bf4a-58acb3803f08/manual/20260330T064530Z-baseline-audit.md`
