# ACTION_PLAN - CO: maintain docs freshness after terminal CO-300 owner

## Summary
- Goal: restore a live owner path for `docs:freshness:maintain` after `CO-300` became terminal, and clear the reproduced current-main stale docs through review-backed refresh.
- Scope: docs packet, owner policy docs, docs catalog owner metadata, docs freshness registry, task mirrors, task index, and task snapshot.
- Assumptions: `CO-324` remains live while this lane is active and can be used as the same-project owner for `docs:freshness:maintain`.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs:freshness:maintain`, `block_unowned_repo_debt`, `CO-300`, `Done`, `terminal owner`, `blocking_changed_paths=[]`, `.agent/task`, `docs/ACTION_PLAN-*`, `docs/PRD-*`, `docs/TECH_SPEC-*`, `tasks/tasks-*`, and the four hard-stale guide/reference paths.
- Not done if: terminal `CO-300` remains the live owner, freshness gates are weakened, CO-321 is broadened, or stale rows are hidden without evidence-backed disposition.
- Pre-implementation issue-quality review: issue-context and parent baseline both confirm this is current-main repo debt with no changed-path blocker.

## Milestones & Sequencing
1. Capture issue/workpad/parallelization evidence and current-main baseline.
2. Add CO-324 docs packet and reviewed stale-row findings.
3. Re-home maintenance owner metadata to `CO-324` and refresh reviewed stale registry rows.
4. Validate `docs:freshness` and `docs:freshness:maintain`, then run required docs/review closeout.

## Dependencies
- Linear issue-context for live owner verification.
- Current `origin/main` freshness reports.
- `docs/docs-catalog.json` rolling freshness policy.

## Validation
- Checks / tests:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
- Rollback plan: revert the docs catalog owner change, registry refreshes, and CO-324 docs packet as a single docs-only change if validation shows policy broadening or stale rows were misclassified.

## Risks & Mitigations
- Risk: changing the global owner field could broaden ownership beyond CO-324 scope. Mitigation: refresh current stale rows directly so the owner is only the live maintenance path, not a hidden rolling-debt waiver.
- Risk: stale rows could be bumped without review. Mitigation: record explicit classification evidence in `docs/findings/linear-3c52bf66-f805-4537-8671-ad1dec2f4623-docs-freshness-classification.md`.
- Risk: CO-321 scope drift. Mitigation: keep CO-321 surfaces out of the edited file set except for historical mention in docs.

## Approvals
- Reviewer: standalone review clean-success via `.runs/linear-3c52bf66-f805-4537-8671-ad1dec2f4623/cli/2026-04-23T03-33-24-344Z-7775baca/review/telemetry.json`; explicit elegance review via `out/linear-3c52bf66-f805-4537-8671-ad1dec2f4623/manual/elegance-review.md`
- Date: 2026-04-23
