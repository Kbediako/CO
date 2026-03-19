---
id: 20260310-1095-coordinator-symphony-aligned-standalone-review-audit-supporting-evidence-parity
title: Coordinator Symphony-Aligned Standalone Review Audit Supporting-Evidence Parity
status: completed
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-audit-supporting-evidence-parity.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-audit-supporting-evidence-parity.md
related_tasks:
  - tasks/tasks-1095-coordinator-symphony-aligned-standalone-review-audit-supporting-evidence-parity.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Audit Supporting-Evidence Parity

## Summary

Complete the bounded `audit` evidence contract by allowlisting `run-runner-log` alongside `run-manifest`, while keeping the audit meta-surface guard active for unrelated drift.

## Scope

- Expand the audit-mode allowed meta-surface kinds in `scripts/run-review.ts`.
- Preserve the bounded classifier contract in `scripts/lib/review-execution-state.ts`.
- Add focused audit regression coverage in `tests/run-review.spec.ts`.
- Update operator docs for the manifest + runner-log audit evidence boundary.

## Out of Scope

- Native-review controller replacement.
- Reopening the `1093` `diff` vs `audit` split.
- Broad new `.runs` allowlists outside manifest + runner transcript evidence.
- Resuming Symphony controller extraction in the same slice.

## Notes

- 2026-03-10: Approved for docs-first registration based on the `1094` closeout and a bounded `gpt-5.4` slice-shaping pass. Evidence: `docs/findings/1095-standalone-review-audit-supporting-evidence-parity-deliberation.md`.
- 2026-03-10: Completed. Audit-mode standalone review now treats `run-runner-log` as explicit audit evidence alongside `run-manifest`, focused final-tree audit regressions passed (`4/4`, `66` skipped), the full suite passed (`184/184` files, `1241/1241` tests), pack-smoke passed, and the remaining live-review drift is recorded honestly before resuming the next authenticated-route Symphony seam. Evidence: `out/1095-coordinator-symphony-aligned-standalone-review-audit-supporting-evidence-parity/manual/20260310T050300Z-closeout/00-summary.md`, `out/1095-coordinator-symphony-aligned-standalone-review-audit-supporting-evidence-parity/manual/20260310T050300Z-closeout/05-targeted-tests.log`, `out/1095-coordinator-symphony-aligned-standalone-review-audit-supporting-evidence-parity/manual/20260310T050300Z-closeout/05-test.log`, `out/1095-coordinator-symphony-aligned-standalone-review-audit-supporting-evidence-parity/manual/20260310T050300Z-closeout/10-pack-smoke.log`, `out/1095-coordinator-symphony-aligned-standalone-review-audit-supporting-evidence-parity/manual/20260310T050300Z-closeout/13-override-notes.md`.
