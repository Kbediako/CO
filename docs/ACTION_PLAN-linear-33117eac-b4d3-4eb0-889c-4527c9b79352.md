# ACTION_PLAN - CO-559 normalize Linear Markdown before create-follow-up post-create verification

## Summary
- Goal: prevent `codex-orchestrator linear create-follow-up` from reporting a failed post-create verification when the only mismatch is Linear Markdown bullet or spacing normalization.
- Scope: provider Linear workflow facade description verification, focused regressions, docs-first packet, review/elegance/PR handoff.
- Assumptions: Linear issue identity, canonical marker, labels, and relations remain the authoritative structural checks; normalized text equivalence only addresses format-preserving Markdown differences.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `create-follow-up`, `Linear Markdown normalization`, `post-create verification`, `canonical-owner-key`, `non-retryable failure`.
- Not done if: successful create/reuse can still false-fail solely on Linear Markdown rendering differences; rerun can still risk duplicate confusion; missing sections, canonical marker, labels, or related links are treated as text drift.
- Pre-implementation issue-quality review: live CO-559 issue-context was translated into PRD/TECH_SPEC/checklist before source edits.
- Fallback decision: remove the byte-exact Markdown verification seam; no retained fallback or large refactor.

## Milestones & Sequencing
1. Complete docs-first packet, registry mirrors, and pre-implementation docs-review.
2. Launch and complete the `markdown-normalization-tests` same-issue child lane for focused regression coverage.
3. Inspect current post-create verification flow, identify root cause, and add the narrow normalizer.
4. Reconcile child test patch, run focused RED/GREEN evidence, and preserve structural hard-fail tests.
5. Run required validation, standalone review, elegance pass, PR attach, ready-review drain, and Linear review handoff.

## Validation
- Checks / tests:
  - docs-review before implementation.
  - focused facade regression for Linear bullet/spacing normalization.
  - focused canonical-owner-key follow-up normalization regression.
  - negative tests for missing sections, marker, labels, or relations.
  - provider-worker required validation floor before review handoff.
- Rollback plan: revert the normalizer and focused tests; no data migration required.

## Approvals
- Reviewer: provider-worker parent lane.
- Date: 2026-05-19.
