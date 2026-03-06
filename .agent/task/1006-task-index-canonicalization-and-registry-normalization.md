# Task Checklist - 1006-task-index-canonicalization-and-registry-normalization

- MCP Task ID: `1006-task-index-canonicalization-and-registry-normalization`
- Primary PRD: `docs/PRD-task-index-canonicalization-and-registry-normalization.md`
- TECH_SPEC: `tasks/specs/1006-task-index-canonicalization-and-registry-normalization.md`
- ACTION_PLAN: `docs/ACTION_PLAN-task-index-canonicalization-and-registry-normalization.md`

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-task-index-canonicalization-and-registry-normalization.md`, `docs/TECH_SPEC-task-index-canonicalization-and-registry-normalization.md`, `docs/ACTION_PLAN-task-index-canonicalization-and-registry-normalization.md`, `tasks/specs/1006-task-index-canonicalization-and-registry-normalization.md`, `tasks/tasks-1006-task-index-canonicalization-and-registry-normalization.md`, `.agent/task/1006-task-index-canonicalization-and-registry-normalization.md`.
- [x] Registry entries updated (`tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`). Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Explicit slice scope captured (canonical `items[]`, retire legacy `tasks[]`, align refs, no unrelated refactors). Evidence: `docs/PRD-task-index-canonicalization-and-registry-normalization.md`, `docs/TECH_SPEC-task-index-canonicalization-and-registry-normalization.md`, `tasks/specs/1006-task-index-canonicalization-and-registry-normalization.md`.

## Validation (Docs Lane)
- [x] Subagent-prefixed run evidence exists for delegation guard compatibility. Evidence: `.runs/1006-task-index-canonicalization-and-registry-normalization-docs-scout/cli/2026-03-05T10-24-53-312Z-d2df52f5/manifest.json`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/01-subagent-diagnostics.log`.
- [x] Docs-review manifest captured for top-level `1006`. Evidence: `.runs/1006-task-index-canonicalization-and-registry-normalization/cli/2026-03-05T10-29-59-282Z-375092f4/manifest.json`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/05-docs-review-rerun.log`.
- [x] `npm run docs:check` passed. Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/11-docs-check-final.log`.
- [x] `npm run docs:freshness` passed. Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/12-docs-freshness-final.log`.
- [x] Standalone review checkpoint captured. Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/07-standalone-review.log`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/08-standalone-review-checkpoint.md`.
- [x] Elegance/minimality note captured. Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/09-elegance-note.md`.
- [x] Optional docs-review rerun disposition captured (non-authoritative). Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/15-docs-review-rerun-disposition.md`.

## Handoff
- [x] Implementation handoff note created with accepted constraints + exact expected file-change scope. Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/10-implementation-handoff-note.md`.

## Terminal Closeout
- [x] Ordered validation gates reached terminal PASS for 1006 closeout. Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/00-terminal-closeout-summary.md`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/00-gate-matrix.tsv`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/00-log-index.md`.
- [x] Shared-checkout override usage is explicitly recorded (gates 8 and 9 only). Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/08-diff-budget.attempt2-override.log`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/09-review.attempt2-override.log`.
- [x] Post-sync docs checks and task mirror parity validation passed. Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/12-docs-check-post-sync.log`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/13-docs-freshness-post-sync.log`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T110206Z-terminal-closeout-validation/14-task-agent-mirror-parity.diff`.
