# ACTION_PLAN - CO-332 restore missing docs-check packet references for linear-1c101

## Summary
- Goal: make `docs:check` pass by restoring or correcting the missing `linear-1c101...` docs-first packet references while preserving historical auditability.
- Scope: CO-332 docs-first packet, registry mirrors, historical CO-276 packet restoration, targeted validation, review/elegance, and review handoff.
- Assumptions: the historical CO-276 packet content from git history is the durable replacement because the current registries still intentionally point at those paths.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs:check`, `docs/TASKS.md`, `backticked-path-missing`, `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb`, docs-first packet paths, and the CO-329 docs-review child-stream manifest.
- Not done if:
  - `npm run docs:check` still reports missing `linear-1c101...` packet paths
  - validation succeeds only because path hygiene is weakened
  - reviewers lose the auditable CO-276 packet context
  - work drifts into CO-329 implementation or docs freshness maintenance
- Pre-implementation issue-quality review:
  - parent confirmed the issue is a docs/reference repair, inspected the live workflow state, created the workpad, recorded the required parallelization decision, verified the files are absent on disk, and found exact historical packet content in git history.

## Milestones & Sequencing
1. Complete Linear setup: issue context, `In Progress` transition, workpad, and parallelization decision.
2. Create the CO-332 docs-first packet and registry/checklist mirrors.
3. Restore the historical CO-276 `linear-1c101...` packet files from git history.
4. Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` so all referenced paths exist.
5. Run targeted path checks and required validation.
6. Run standalone review and explicit elegance/minimality pass before PR/review handoff.

## Dependencies
- Git history for CO-276 packet content, specifically commit `aa653f550e4a632a03546993193290783e60ef23`.
- Existing docs/task registry files:
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
- Source CO-329 docs-review manifest and docs-check log for provenance.

## Validation
- Checks / tests:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - standalone review before handoff
  - explicit elegance/minimality pass before handoff
- Rollback plan: revert only the CO-332 packet/registry entries and restored CO-276 packet files; do not change docs hygiene semantics.

## Risks & Mitigations
- Risk: restoring stale historical files reintroduces old status wording.
  - Mitigation: use the latest available historical commit for the packet and keep this lane focused on path restoration, not CO-276 status rewriting.
- Risk: `docs:check` exposes unrelated missing paths.
  - Mitigation: classify unrelated failures as separate follow-ups instead of broadening this issue.
- Risk: registry edits create JSON drift.
  - Mitigation: parse JSON and run `docs:check` after edits.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-23
