# ACTION_PLAN - CO workflow restore docs/TASKS headroom and make task archiving proactive

## Added by Parent Lane 2026-04-18

## Summary
- Goal: restore non-zero `docs/TASKS.md` headroom and keep the existing archive path proactive and truthful.
- Scope: docs-first packet, policy update, archive/docs-hygiene code changes, focused tests, and final repo validation.
- Assumptions: the current archive system stays in place; there are enough archive-eligible completed tasks to restore headroom once the proactive policy lands.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs/TASKS.md`
  - `450/450`
  - `docs:check`
  - `docs/TASKS-archive-2026.md`
  - `linear-*`
  - `restore non-zero docs/TASKS headroom`
  - `make task archiving proactive`
- Not done if:
  - `main` can settle back at `450/450`
  - the proactive archive path loses snapshot truth
  - unrelated docs-first lanes still need packet-local archive cleanup only because base `main` stayed full
- Pre-implementation issue-quality review:
  - 2026-04-18 parent review: this is a standing workflow-headroom seam, not a `CO-213` symptom-only lane, and not a generic docs cleanliness project.

## Milestones & Sequencing
1. Register the docs-first packet, task mirror, task index row, and docs freshness registry entries for `CO-221`.
2. Update the tasks archive policy with an explicit reserve target and document the new behavior in repo-facing guidance.
3. Update `scripts/tasks-archive.mjs` so the existing archive path trims back to the reserve target once reserve is exhausted.
4. Update `scripts/docs-hygiene.ts` so zero-headroom `docs/TASKS.md` states fail closed instead of passing until overflow.
5. Add focused regression coverage for proactive near-full archiving and zero-headroom docs checks.
6. Run the archive path against the repo state, add the active `docs/TASKS.md` snapshot for `CO-221`, refresh the workpad, and complete validation/review handoff.

## Dependencies
- `docs/tasks-archive-policy.json`
- `scripts/tasks-archive.mjs`
- `scripts/docs-hygiene.ts`
- `tests/tasks-archive.spec.ts`
- `tests/docs-hygiene.spec.ts`
- `.github/workflows/tasks-archive-automation.yml`

## Validation
- Checks / tests:
  - focused `vitest` coverage for `tests/tasks-archive.spec.ts` and `tests/docs-hygiene.spec.ts`
  - required repo validation commands from `AGENTS.md`
  - manifest-backed standalone review
  - explicit elegance review pass
- Rollback plan:
  - revert the reserve semantics if the archive path stops preserving snapshot truth
  - do not roll back by weakening the archive system or by removing `linear-*` support

## Risks & Mitigations
- Risk: proactive trimming archives the wrong snapshot block.
  - Mitigation: add focused archive truth coverage using `linear-*` task keys and inline snapshot blocks.
- Risk: docs check becomes too strict and blocks ordinary lanes unnecessarily.
  - Mitigation: keep the docs check focused on zero-headroom truth while the archive script maintains the reserve target proactively.
- Risk: the packet remains inconsistent because `docs/TASKS.md` started full.
  - Mitigation: restore headroom in the same lane before handoff, then add the active snapshot and mirror evidence.

## Approvals
- Reviewer: pending parent docs-review and implementation validation
- Date: 2026-04-18
