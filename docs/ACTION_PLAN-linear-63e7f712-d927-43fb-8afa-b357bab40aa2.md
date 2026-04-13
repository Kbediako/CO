# ACTION_PLAN - linear-63e7f712-d927-43fb-8afa-b357bab40aa2

## Summary
- Goal: harden the hot-suite retained subprocess freshness selectors for transitive CLI/runtime roots without regressing the CO-114 speedup.
- Scope: docs-first packet, workpad upkeep, audited docs-review, bounded shared-helper extraction, focused stale-root vs unrelated-sibling tests, required validation, and review handoff prep.
- Assumptions:
  - the smallest correct fix is a shared test-local helper plus an entrypoint-specific transitive relative runtime-dependency closure, not product-surface changes
  - current source audit is sufficient to seed the closure design, while implementation will let dependency discovery produce the authoritative file set

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO-114`, `Core Lane`, `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`, `dist/bin/codex-orchestrator.js`, `dist/scripts/run-review.js`, `scripts/lib/**`, and `transitive CLI/runtime dependencies`.
- Not done if: stale tracked roots still leave built JS looking fresh, or unrelated edits lose the fast path because the check broadened into whole-tree invalidation.
- Pre-implementation issue-quality review: approved. The issue is explicitly a bounded hot-suite freshness hardening lane, not a request to reopen CO-114 or to add a generic dependency crawler.

## Milestones & Sequencing
1. Create the CO-123 docs packet, mirrors, `docs/TASKS.md` snapshot, freshness-registry entries, branch, and single workpad source; upsert the initial workpad.
2. Run the audited `linear child-stream --pipeline docs-review` for the CO-123 packet and record manifest-backed approval or truthful fallback.
3. Extract the shared test-local freshness helper and wire entrypoint-specific dependency-closure contracts into `tests/cli-command-surface.spec.ts` and `tests/run-review.spec.ts`.
4. Add focused tests proving stale tracked roots reject `dist` and unrelated siblings still preserve the fast path.
5. Run focused hot-suite validation, then the required repo validation floor, standalone review, and an explicit elegance pass before PR or review handoff.

## Dependencies
- `tests/cli-command-surface.spec.ts`
- `tests/run-review.spec.ts`
- `tests/helpers/**`
- `bin/codex-orchestrator.ts`
- `scripts/run-review.ts`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused vitest runs for the hot suites during implementation
  - final `npx vitest run tests/cli-command-surface.spec.ts tests/run-review.spec.ts`
  - full repo validation floor before handoff
- Rollback plan:
  - revert the shared helper and dependency-closure changes together so both hot suites return to the prior built-vs-source behavior without a mixed contract

## Risks & Mitigations
- Risk: the dependency contract is still too narrow and misses an obvious transitive seam.
  - Mitigation: compute the actual relative runtime-dependency closure from the source entrypoint instead of maintaining a hand-picked subtree list, then add targeted stale-dependency tests.
- Risk: the dependency scan is too broad and forces slow fallbacks on unrelated edits.
  - Mitigation: restrict discovery to the entrypoint's relative runtime-dependency closure, ignore type-only edges, and cache the discovered file set within the test process, then prove unrelated sibling tolerance in focused tests.
- Risk: a tracked dependency disappears and stale `dist` hides the breakage during local reruns.
  - Mitigation: fail closed when the helper cannot resolve a tracked relative runtime dependency, and lock that behavior with a focused run-review test.
- Risk: two suites drift again if they each carry their own freshness helper.
  - Mitigation: centralize the recursion and mtime logic in one test-local helper while keeping separate root builders.

## Approvals
- Reviewer: `codex-orchestrator linear child-stream docs-review (manual fallback recorded after forced review stall)`
- Date: `2026-04-11`
- Manifest: `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2-docs-review/cli/2026-04-10T15-54-09-224Z-cab1c2ab/manifest.json`
- Note: `The rerun passed delegation-guard, spec-guard, docs:check, and docs:freshness, then the forced nested review stalled and was manually terminated. The run closed failed with exit 128 plus missing/incomplete review telemetry, so this packet uses the manual docs-review fallback recorded in out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T160253Z-review-closeout.json.`
