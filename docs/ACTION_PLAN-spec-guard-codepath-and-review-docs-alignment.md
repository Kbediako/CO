# ACTION_PLAN - Spec Guard Codepath + Review Docs Alignment (1005)

## Phase 1 - Docs Gate
- [x] Create/refresh PRD/TECH_SPEC/ACTION_PLAN/spec/checklists and register task snapshots.
- [x] Capture docs-review manifest and docs checks evidence.
- Evidence: `.runs/1005-spec-guard-codepath-and-review-docs-alignment/cli/2026-03-05T08-01-58-382Z-dbd7f5cb/manifest.json`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T075527Z-docs-first/11-docs-check-rerun.log`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T075527Z-docs-first/12-docs-freshness-final.log`.

## Phase 2 - Implementation
- [x] Patch spec-guard path detection.
- [x] Add spec-guard regression tests.
- [x] Apply docs wording alignment updates.
- Evidence: `scripts/spec-guard.mjs`, `tests/spec-guard.spec.ts`, `AGENTS.md`, `.agent/AGENTS.md`, `.agent/SOPs/review-loop.md`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T081607Z-impl/00-impl-summary.md`.

## Phase 3 - Validation + Closeout
- [x] Run ordered validation chain and capture terminal closeout artifacts.
- [x] Record explicit shared-checkout override notes for `delegation-guard`, `diff-budget`, and `review`.
- [x] Confirm authoritative implementation-gate rerun reached terminal `succeeded`.
- [x] Sync checklist mirrors and run post-closeout mirror-sync docs/parity checks.
- Evidence: `.runs/1005-spec-guard-codepath-and-review-docs-alignment/cli/2026-03-05T08-27-09-532Z-329a23e2/manifest.json`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/00-terminal-closeout-summary.md`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305-192125-terminal-closeout/override-ledger.json`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/01-docs-check.log`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/02-docs-freshness.log`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/03-mirror-parity.log`, `out/1005-spec-guard-codepath-and-review-docs-alignment/manual/20260305T084359Z-mirror-sync-post-closeout/00-mirror-sync-summary.md`.
