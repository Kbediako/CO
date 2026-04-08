# ACTION_PLAN - Task Index Canonicalization + Registry Normalization (1006)

## Phase 1 - Docs-First Scaffolding
- [x] Create PRD/TECH_SPEC/ACTION_PLAN/spec/checklists for `1006`. Evidence: `docs/PRD-task-index-canonicalization-and-registry-normalization.md`, `docs/TECH_SPEC-task-index-canonicalization-and-registry-normalization.md`, `docs/ACTION_PLAN-task-index-canonicalization-and-registry-normalization.md`, `tasks/specs/1006-task-index-canonicalization-and-registry-normalization.md`, `tasks/tasks-1006-task-index-canonicalization-and-registry-normalization.md`, `.agent/task/1006-task-index-canonicalization-and-registry-normalization.md`.
- [x] Register `1006` across `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Phase 2 - Docs Validation Gate
- [x] Capture a subagent-prefixed run artifact for delegation guard compatibility. Evidence: `.runs/1006-task-index-canonicalization-and-registry-normalization-docs-scout/cli/2026-03-05T10-24-53-312Z-d2df52f5/manifest.json`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/01-subagent-diagnostics.log`.
- [x] Run docs-review pipeline for top-level `1006` and record manifest. Evidence: `.runs/1006-task-index-canonicalization-and-registry-normalization/cli/2026-03-05T10-29-59-282Z-375092f4/manifest.json`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/05-docs-review-rerun.log`.
- [x] Run docs checks (`npm run docs:check`, `npm run docs:freshness`). Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/11-docs-check-final.log`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/12-docs-freshness-final.log`.
- [x] Run standalone review checkpoint. Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/07-standalone-review.log`, `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/08-standalone-review-checkpoint.md`.
- [x] Optional docs-review rerun disposition recorded (non-authoritative). Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/15-docs-review-rerun-disposition.md`.
- [x] Capture explicit elegance/minimality note. Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/09-elegance-note.md`.

## Phase 3 - Handoff for Implementation Stream
- [x] Publish handoff note with accepted constraints and exact expected implementation file scope. Evidence: `out/1006-task-index-canonicalization-and-registry-normalization/manual/20260305T102337Z-docs-first-lane/10-implementation-handoff-note.md`.
- [x] Mirror all evidence links across checklist/spec/TASKS/index artifacts. Evidence: `tasks/specs/1006-task-index-canonicalization-and-registry-normalization.md`, `tasks/tasks-1006-task-index-canonicalization-and-registry-normalization.md`, `.agent/task/1006-task-index-canonicalization-and-registry-normalization.md`, `docs/TASKS.md`, `tasks/index.json`.
