# ACTION_PLAN - linear-54387f04-30aa-436a-9901-690c0e9cfcee

## Summary
- Goal: shrink the Core Lane hot test tail by redesigning the subprocess-heavy CLI and review-wrapper suites without weakening validation coverage.
- Scope: docs-first packet, workpad upkeep, focused timing baselines, in-process test-harness extraction, bounded subprocess smoke retention, required validation, and review/handoff prep.
- Assumptions:
  - the current slowdown is dominated by repeated subprocess startup cost rather than a fresh hang regression
  - the smallest honest fix is a hybrid harness, not all-subprocess or all-in-process extremes

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `Core Lane`, `Test`, `tests/run-review.spec.ts`, `tests/cli-command-surface.spec.ts`, `node --loader ts-node/esm`, `bounded subprocess smoke matrix`, and `without lowering validation coverage`.
- Not done if: the hot suites still dominate the same wall-clock tail, or the apparent speedup comes from deleting guardrails instead of redesigning the harness.
- Pre-implementation issue-quality review: approved. The issue is explicitly a hot-suite performance lane, not a generic CI cleanup or hang-truth lane.

## Milestones & Sequencing
1. Create the CO-114 docs packet, checklist mirrors, `docs/TASKS.md` snapshot, freshness-registry entries, and the single local workpad source; upsert the workpad and run the audited `linear child-stream --pipeline docs-review`.
2. Capture current focused timing baselines for `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts`, plus the current full-test proxy or recorded Core Lane baseline.
3. Refactor the CLI and review-wrapper harnesses, so pure contract assertions move in-process while a bounded subprocess smoke layer remains.
4. Re-run focused timings, validate the retained subprocess smoke layer, and complete the required repo validation floor.
5. Run standalone review, an explicit elegance pass, refresh the workpad, and prepare PR or review handoff if the lane is ready.

## Dependencies
- `bin/codex-orchestrator.ts`
- `scripts/run-review.ts`
- `tests/cli-command-surface.spec.ts`
- `tests/run-review.spec.ts`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused before/after timed runs for the two hot suites
  - retained subprocess smoke coverage for the real CLI and review-wrapper entrypoints
  - full repo validation floor before handoff
- Rollback plan:
  - revert the harness extraction and smoke-matrix changes together so the suites return to the prior behavior without mixed coverage ownership

## Risks & Mitigations
- Risk: moving assertions in-process could accidentally stop testing the true entrypoint wiring.
  - Mitigation: keep an explicit bounded subprocess smoke matrix and call out which contracts move where.
- Risk: switching subprocess cases to built JS could become flaky if the build artifact is missing.
  - Mitigation: make any built-entry selection deterministic and fall back truthfully when the artifact is unavailable.
- Risk: timing claims could be anecdotal.
  - Mitigation: record before/after timings for both hot suites and the full test-step proxy in task artifacts and the workpad.

## Approvals
- Reviewer: `codex-orchestrator docs-review`
- Date: 2026-04-09
