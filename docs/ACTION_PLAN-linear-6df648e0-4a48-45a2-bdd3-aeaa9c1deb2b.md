# ACTION_PLAN - CO-444 re-home docs:freshness:maintain owner after terminal CO-441

## Summary
- Goal: make `CO-444` the live same-project owner for `docs:freshness:maintain` after terminal configured owner `CO-441`, without weakening freshness policy or hiding the retained March 28 rolling cohort.
- Scope: packet docs, task mirrors, `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Assumptions:
  - CO-444 is the intended tactical current live-owner handoff for canonical owner key `docs:freshness:maintain`.
  - `terminal configured owner CO-441` is fail-closed owner-truth evidence.
  - The retained `co-420-apr-28-march-28-task-packet-mirror` March 28 task-packet mirror rolling cohort must remain visible.
  - The repair should only move owner metadata and guide lineage.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness:maintain`
  - `canonical_owner_key=docs:freshness:maintain`
  - `co-420-apr-28-march-28-task-packet-mirror`
  - `terminal configured owner CO-441`
  - `block_unowned_repo_debt`
  - `March 28 task-packet mirror rolling cohort`
  - `docs/docs-catalog.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
- Not done if:
  - protected terms or exact packet surfaces are missing
  - the repair treats `terminal configured owner CO-441` as waived or harmless
  - the live owner still resolves only to terminal `CO-441`
  - stale registry rows or historical cohort evidence are deleted, hidden, archived, blindly refreshed, or reclassified
  - `docs:freshness` or `docs:freshness:maintain` behavior is weakened
  - CO-443 or another implementation lane is widened into recurring docs-freshness maintenance
- Pre-implementation issue-quality review:
  - 2026-04-30: CO-444 is narrow docs/config owner-truth maintenance, not a product implementation lane.
  - 2026-04-30: the micro-task path is unavailable because correctness depends on protected terms, exact surfaces, and canonical owner marker compatibility.
  - 2026-04-30: bounded child lane owns packet setup; parent owns owner re-home, validation, PR lifecycle, and Linear state.
- Fallback / refactor decision: no new fallback behavior is introduced. The lane preserves existing `docs:freshness:maintain` fail-closed behavior and rolling freshness cohort visibility.
- Durable retention evidence: the retained cohort remains governed by the existing rolling window and expires after `2026-05-04` unless refreshed, archived, reclassified, or re-homed through a live owner.
- Large refactor decision: bounded metadata cleanup under the existing `docs:freshness:maintain` owner; no runtime or policy authority split is added.

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Completed-lane historical packet/spec freshness hold | `expire fallback` | CO-444 | Terminal Linear source issues left task-packet/spec metadata active past cadence | 2026-05-05 | 2026-05-05 | 2026-05-12 | Archive packet mirrors and reclassify specs under a live owner; otherwise block handoff | `docs:freshness:maintain -- --format json` |

- Large refactor decision: bounded metadata cleanup under the existing `docs:freshness:maintain` owner; no runtime or policy authority split is added.
- Minor seam decision: bounded temporary freshness-hold cleanup is acceptable; unresolved rows must be archived, reclassified, or blocked by 2026-05-12.

## Milestones & Sequencing
1. Inspect live Linear context and move from queued state into started state.
2. Create the persistent workpad and record the required pre-turn decomposition matrix.
3. Launch bounded docs child lane for the CO-444 packet and registry mirrors.
4. Reproduce the pre-fix `docs:freshness:maintain` terminal-owner blocker.
5. Apply the docs packet, register the task, and add registry coverage.
6. Re-home `docs/docs-catalog.json` rolling owner metadata to `CO-444`.
7. Update `docs/guides/docs-freshness-cohorts.md` with terminal `CO-441` lineage and current `CO-444` ownership.
8. Run the required validation chain.
9. Run manifest-backed standalone review and explicit elegance review.
10. Open or update the PR, attach it to Linear, drain automated feedback, and hand off only after checks are green.

## Dependencies
- Linear issue `CO-444` / `6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b`.
- Terminal configured owner `CO-441`.
- Canonical owner key `docs:freshness:maintain`.
- `docs/docs-catalog.json`.
- `docs/guides/docs-freshness-cohorts.md`.
- Child manifest `.runs/linear-6df648e0-4a48-45a2-bdd3-aeaa9c1deb2b-docs-packet/cli/2026-04-30T07-35-51-905Z-15903f69/manifest.json`.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - `npm run repo:stewardship`
  - `git diff --check`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review
  - explicit elegance review
- Rollback plan:
  - revert only the CO-444 packet files, task index item, task snapshot, registry rows, catalog owner pointer, and cohort-guide lineage if the repair is rejected.

## Risks & Mitigations
- Risk: terminal owner evidence is softened.
  - Mitigation: keep `terminal configured owner CO-441`, `block_unowned_repo_debt`, and `canonical_owner_key=docs:freshness:maintain` visible across packet surfaces.
- Risk: historical cohort evidence is removed to force validation green.
  - Mitigation: preserve `co-420-apr-28-march-28-task-packet-mirror` and the March 28 task-packet mirror rolling cohort in Not Done If and acceptance criteria.
- Risk: CO-443 scope expands into docs-freshness maintenance.
  - Mitigation: keep this lane limited to owner metadata, cohort guide lineage, task mirrors, and validation evidence.

## Approvals
- Reviewer: CO-444 parent lane
- Date: 2026-04-30
