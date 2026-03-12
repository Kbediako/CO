---
id: 20260312-1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary
title: Coordinator Symphony-Aligned Standalone Review Architecture Surface Boundary
status: completed
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md
related_tasks:
  - tasks/tasks-1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Architecture Surface Boundary

## Summary

Add an explicit `architecture` review surface so broader design/context inspection no longer leaks into bounded diff review, while preserving the current `audit` evidence surface and tightening the default diff startup-anchor contract.

## Scope

- Extend the review surface contract to include `architecture`.
- Update prompt/runtime/docs handling for the new surface, including the canonical docs-first inputs and narrow `architecture` allowlist.
- Refine diff startup-anchor handling so `git show <rev>:<path>` is not treated as a default diff startup anchor.
- Add focused review-wrapper/runtime-state regression coverage.

## Out of Scope

- Native review replacement.
- Reopening `1098` or `1099` structured scope rendering work.
- Collapsing `audit` back into `diff`.
- Product/controller refactors outside standalone review tooling.

## Notes

- 2026-03-12: Registered after `1127` completed. The next truthful review-reliability seam is no longer generic historical drift; it is the lack of a first-class architecture review surface, which still pushes broader design reasoning into bounded diff review. The startup-anchor contract also remains too permissive because `git show <rev>:<path>` currently counts as a diff anchor. Evidence: `docs/findings/1128-standalone-review-architecture-surface-boundary-deliberation.md`, `docs/standalone-review-guide.md`, `scripts/run-review.ts`, `scripts/lib/review-execution-state.ts`, `tests/review-execution-state.spec.ts`.
- 2026-03-12: Pre-implementation local read-only review approved. The bounded scouts converged on an additive third `architecture` surface with canonical docs-first inputs plus a narrow runtime allowlist, while keeping `diff` default, `audit` evidence-focused, and the startup model limited to `diff|audit`. The refreshed docs-first guard bundle passed on the registered package. Evidence: `docs/findings/1128-standalone-review-architecture-surface-boundary-deliberation.md`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/00-summary.md`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/01-spec-guard.log`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/02-docs-check.log`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/03-docs-freshness.log`.
- 2026-03-12: Final-tree manifest-backed `docs-review` succeeded for the registered `1128` package after a bounded scout manifest was created to satisfy the repo's delegation contract. Evidence: `.runs/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary-scout/cli/2026-03-12T03-21-38-462Z-4e49eed1/manifest.json`, `.runs/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/cli/2026-03-12T03-31-32-510Z-bb0e3ced/manifest.json`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T031604Z-docs-first/00-summary.md`.
- 2026-03-12: Closed. `run-review` now ships the explicit `architecture` surface, the execution-state boundary no longer treats `git show <rev>:<path>` as a default diff anchor, and focused wrapper/runtime regressions passed. Deterministic validation, elegance review, and pack-smoke passed. Two explicit overrides remain part of the closeout evidence rather than hidden: the full Vitest suite quiet-tailed after the final CLI-heavy file with no terminal summary, and the patient `0.114.0` architecture review rerun retried after prompt-plus-scope flag rejection but still timed out after an in-bounds `300s` loop with no verdict. Evidence: `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/00-summary.md`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/05-targeted-tests.log`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/11-pack-smoke.log`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/12-manual-review-architecture-surface-check.md`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/13-override-notes.md`, `out/1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary/manual/20260312T034950Z-closeout/15-elegance-review.md`.
