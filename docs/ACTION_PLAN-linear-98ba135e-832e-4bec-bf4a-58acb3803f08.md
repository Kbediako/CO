# ACTION_PLAN - CO: Clarify bounded-success vs failed review-wrapper outcomes for operators

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: close the remaining operator-facing review-outcome truthfulness gap by explicitly separating bounded successful review completion from real wrapper failure.
- Scope:
  - baseline audit plus docs-first packet for `CO-28`
  - explicit review terminal-outcome classification in telemetry/log/summaries
  - worker-guidance and docs alignment for workpad/review closeout semantics
  - focused tests and standard validation
- Assumptions:
  - the existing `termination_boundary` kind/provenance taxonomy stays intact
  - the missing seam is interpretation/presentation, not additional runtime-policy changes
  - the current workspace branch will carry the full issue implementation unless review-state handoff happens first

## Milestones & Sequencing
1) Baseline + docs-first
   - capture the current artifact/code truth in a baseline audit
   - draft PRD, TECH_SPEC, ACTION_PLAN, task checklist, mirror, task registry, and `docs/TASKS.md` snapshot
   - run a bounded docs-review child stream and record the manifest
2) Implementation
   - add an explicit review terminal-outcome classification to telemetry
   - surface that distinction in wrapper summaries and downstream review-stage summaries
   - align provider-worker prompt and `skills/linear` guidance with bounded-success handoff semantics
3) Validation + handoff prep
   - run focused regressions, then the required validation floor
   - run standalone review and elegance review
   - refresh the single workpad with docs-review, implementation, and validation truth before any PR or review-state handoff

## Dependencies
- shared review telemetry artifacts in `/Users/kbediako/Code/CO/.runs/**/review/telemetry.json`
- current standalone-review wrapper code paths in `scripts/lib/**` and `scripts/run-review.ts`
- provider-worker prompt / `skills/linear` workflow contract

## Validation
- Checks / tests:
  - docs-review child stream for the docs-first packet
  - focused regressions in telemetry/log/summaries and provider-worker prompt wording
  - required repo validation floor
  - standalone review plus elegance review before handoff
- Rollback plan:
  - revert the narrow telemetry/log/summary/prompt/doc changes together if they blur the outcome distinction or regress existing review failure classification

## Risks & Mitigations
- Risk: downstream review-stage consumers keep showing an ambiguous generic success string.
  - Mitigation: annotate review-stage summaries from the telemetry outcome classification, not from raw wrapper stdout alone.
- Risk: the new outcome field duplicates or conflicts with `termination_boundary`.
  - Mitigation: keep `termination_boundary` as family truth and use the new field only for the success-versus-failure disposition axis.
- Risk: worker guidance drifts from shipped behavior.
  - Mitigation: update both the provider-worker prompt and `skills/linear`, then cover the prompt text with focused tests.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-30
