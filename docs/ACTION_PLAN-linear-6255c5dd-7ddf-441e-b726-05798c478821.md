# ACTION_PLAN - Fix missing CO-276 docs packet paths blocking docs:check

## Summary
- Goal: unblock `docs:check` by reconciling the stale-workspace `CO-276` / `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` packet references against current `origin/main` without changing `CO-354` doctor/default behavior or weakening missing-path validation.
- Scope: the child lane created the six `CO-370` docs-first packet files only; parent owns `CO-276` reconciliation, registry mirrors, validation, Linear state, workpad, and PR lifecycle.
- Assumptions: the declared source-0 payload was absent in the child checkout when the packet was drafted but is present in the parent artifact tree, and exact `CO-370` wording is preserved from the read-only issue-context output.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `CO-276`, `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb`, `docs:check`, `backticked-path-missing`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `docs/TASKS.md`, `CO-354`.
- Not done if: `docs:check` still reports `backticked-path-missing` for the `CO-276` task id, registry entries still point at missing packet files without rationale, or the fix weakens docs hygiene checks.
- Pre-implementation issue-quality review: approved for parent implementation because the issue names exact failing paths, exact registry/docs surfaces, explicit non-goals, and a narrow source issue boundary.

## Milestones & Sequencing
1. Child lane drafts the six `CO-370` packet files and leaves changes uncommitted for parent patch export.
2. Parent accepts or rejects the child docs packet patch. The accept helper invalidated because Linear `updated_at` changed during workpad refresh, so the reviewed patch artifact was applied mechanically.
3. Parent inspects current `CO-276` references in `docs/TASKS.md`, `tasks/index.json`, and `docs/docs-freshness-registry.json`.
4. Parent chooses the narrow repair: restore the missing `CO-276` packet files or remove stale references with explicit recorded rationale. Current `origin/main` already contains the selected CO-332/CO-350 restoration, so parent records that proof instead of duplicating restoration work.
5. Parent reruns `npm run docs:check` and `npm run docs:freshness` to prove the named blocker is gone without validation weakening.
6. Parent restores `docs/TASKS.md` reserve headroom through `npm run docs:archive-tasks` if review or validation shows the new snapshot exceeds the configured 440-line target.
7. Parent completes standalone review/elegance as needed, refreshes the workpad, and handles PR lifecycle.

## Dependencies
- Parent-owned authoritative `CO-370` workspace and Linear workpad.
- Existing `CO-276` registry/docs references.
- `docs:check` backticked-path validation.
- `docs/docs-freshness-registry.json` freshness coverage rules.

## Validation
- Child scoped checks:
  - protected-term grep over the six `CO-370` packet files
  - direct trailing-whitespace scan over the six `CO-370` packet files
  - `git status --short` confirms only declared files changed
- Parent checks:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run docs:archive-tasks` when `docs/TASKS.md` reserve headroom is exhausted
  - standalone review plus explicit elegance/minimality pass if the final diff remains non-trivial

## Risks & Mitigations
- Risk: source-0 payload remains unavailable in this child checkout.
  - Mitigation: preserve the source anchor and use read-only issue-context output for exact wording; parent owns source reconciliation.
- Risk: parent repair accidentally expands into `CO-354` behavior.
  - Mitigation: keep `CO-354` doctor/default behavior as an explicit non-goal and validation review point.
- Risk: a broad freshness sweep masks the actual failure.
  - Mitigation: require the final repair to address the exact `CO-276` missing path list and the `backticked-path-missing` failure.
- Risk: weakening `docs:check` hides future missing docs.
  - Mitigation: make strict missing-path validation an acceptance criterion.

## Rollback
- Revert the parent `CO-370` registry/path closeout additions if they weaken docs hygiene checks, remove unrelated task history, or change `CO-354` behavior.
- Revert only the six `CO-370` packet files from this child lane if the parent rejects this docs packet.
