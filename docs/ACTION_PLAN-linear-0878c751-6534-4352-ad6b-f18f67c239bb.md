# ACTION_PLAN - linear-0878c751-6534-4352-ad6b-f18f67c239bb

## Summary
- Goal: finish CO-136 from a clean Rework reset by restoring truthful deterministic command-surface validation on current main.
- Scope: reset stale handoff artifacts, create the docs packet and fresh workpad, run audited docs-review, reproduce the five cited command-surface cases on fresh main, implement the smallest scoped fix, and complete the required validation/review loop.
- Assumptions:
  - the stale r2 handoff cannot be treated as current truth because it never merged and the issue is back in `Rework`
  - the smallest correct solution is likely either a truthful timeout-budget/test-path fix or a very narrow parsing correction, not a broad CLI redesign

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `tests/cli-command-surface.spec.ts`, `15_000ms`, `quoted single-token exec`, `escaped quotes`, `CO-96`, and the requirement to keep the fix scoped to the command-surface timing/parsing seam.
- Not done if: the five cited command-surface cases still fail or the solution reopens unrelated CO-96 or generic test-performance scope.
- Pre-implementation issue-quality review: approved. The issue is not narrower than the user request just because a prior attempt thought the runtime seam was fixed; the current request is to clear the full blocker on current main, whether that lands in tests or product code.

## Milestones & Sequencing
1. Reset the Rework lane: inspect live issue state, record the required serial/no-parallel decision, delete the stale workpad, confirm the historical PR state, recreate the branch from `origin/main`, and stage the fresh workpad source.
2. Create the CO-136 docs packet in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`, then upsert the fresh single workpad.
3. Run the audited `linear child-stream --pipeline docs-review`, record the manifest or truthful fallback, and only then reproduce the five cited command-surface cases on fresh main.
4. Implement the smallest scoped fix, rerun the focused subset plus the full `tests/cli-command-surface.spec.ts` file, and expand to the required validation floor.
5. Run standalone review, perform the explicit elegance pass, refresh the workpad, and prepare PR/review handoff if the lane is clean.

## Dependencies
- `tests/cli-command-surface.spec.ts`
- `bin/codex-orchestrator.ts`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`
- provider-worker `linear` helper commands for workpad and docs-review evidence

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - direct raw source-entrypoint probes for the five cited cases
  - focused five-case subset in `tests/cli-command-surface.spec.ts`
  - full `tests/cli-command-surface.spec.ts`
  - full repo validation floor before handoff
- Rollback plan:
  - revert the bounded command-surface/test-seam changes together so raw source-entrypoint coverage and the docs packet return to the current-main baseline cleanly

## Risks & Mitigations
- Risk: the issue packet and the stale r2 handoff disagree on whether the quoted-argv bug still exists.
  - Mitigation: reproduce fresh-main truth first and record the direct probes in the workpad/checklist before editing code.
- Risk: a test-only timeout adjustment could accidentally mask a real parser regression.
  - Mitigation: keep direct quoted-argv probes and the dedicated quoted-single-token regression case in scope.
- Risk: the lane could broaden into general CLI or test-performance work.
  - Mitigation: keep implementation confined to the cited command-surface seam and file-level evidence paths.

## Approvals
- Reviewer: pending `codex-orchestrator docs-review`
- Date: 2026-04-10
