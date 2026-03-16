---
id: 20260316-1225-coordinator-symphony-aligned-standalone-review-run-review-non-interactive-handoff-shell-extraction
title: Coordinator Symphony-Aligned Standalone Review Run-Review Non-Interactive Handoff Shell Extraction
status: closed
owner: Codex
created: 2026-03-16
last_review: 2026-03-16
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-run-review-non-interactive-handoff-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-run-review-non-interactive-handoff-shell-extraction.md
related_tasks:
  - tasks/tasks-1225-coordinator-symphony-aligned-standalone-review-run-review-non-interactive-handoff-shell-extraction.md
review_notes:
  - 2026-03-16: `1224` completed the execution-boundary preflight extraction and left the post-prompt artifact/env/non-interactive handoff block as the next truthful implementation seam in `scripts/run-review.ts`. Evidence: `out/1224-coordinator-symphony-aligned-standalone-review-run-review-execution-boundary-preflight-shell-extraction/manual/20260316T031419Z-closeout/00-summary.md`, `out/1224-coordinator-symphony-aligned-standalone-review-run-review-execution-boundary-preflight-shell-extraction/manual/20260316T031419Z-closeout/14-next-slice-note.md`, `docs/findings/1225-standalone-review-run-review-non-interactive-handoff-shell-extraction-deliberation.md`.
  - 2026-03-16: Approved for docs-first registration as a bounded behavior-preserving lane around artifact creation, env export, non-interactive normalization, and printed handoff suppression. Evidence: `docs/findings/1225-standalone-review-run-review-non-interactive-handoff-shell-extraction-deliberation.md`.
  - 2026-03-16: Deterministic docs-first registration completed; `spec-guard --dry-run`, `docs:check`, and `docs:freshness` passed, and the explicit docs-review override is recorded for this registration. Evidence: `out/1225-coordinator-symphony-aligned-standalone-review-run-review-non-interactive-handoff-shell-extraction/manual/20260316T032526Z-docs-first/00-summary.md`, `out/1225-coordinator-symphony-aligned-standalone-review-run-review-non-interactive-handoff-shell-extraction/manual/20260316T032526Z-docs-first/05-docs-review-override.md`.
  - 2026-03-16: Closed with the shipped helper in `scripts/lib/review-non-interactive-handoff.ts`, review-support parity narrowed through `review-launch-attempt`, focused reruns `197/197`, full suite `245/245` files and `1720/1720` tests, bounded review no findings after the one P2 family fix, and pack-smoke green. Evidence: `out/1225-coordinator-symphony-aligned-standalone-review-run-review-non-interactive-handoff-shell-extraction/manual/20260316T041152Z-closeout/00-summary.md`, `out/1225-coordinator-symphony-aligned-standalone-review-run-review-non-interactive-handoff-shell-extraction/manual/20260316T041152Z-closeout/09-review.log`.
---

# Technical Specification

## Context

`1224` removed the remaining execution-boundary preflight cluster from `scripts/run-review.ts`, but the file still owns one cohesive post-prompt non-interactive handoff contract before boundary preflight and launch execution.

## Requirements

1. Extract the non-interactive handoff shell behind a dedicated helper/module.
2. Preserve current artifact creation and `MANIFEST` / `RUNNER_LOG` / `RUN_LOG` env export behavior.
3. Preserve current `nonInteractive` resolution and printed handoff suppression semantics.
4. Keep `run-review.ts` responsible for broader wrapper orchestration.
5. Add focused regression coverage for the extracted handoff shell.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
