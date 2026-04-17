# ACTION PLAN - CO Workflow Refresh Apr 17 docs:freshness Stale Cohort

## Summary
- Goal: restore a truthful green docs freshness path for unrelated feature lanes by resolving or explicitly re-owning the Apr 17 `last_review=2026-03-17` stale cohort.
- Scope: docs-first packet, before-report capture, cohort classification, disposition decision, minimal docs/registry/archive update, and parent-owned validation/handoff.
- Assumptions: source-0 in this child lane contains run metadata and prompt-pack provenance only; the full issue body was read with the packaged read-only `linear issue-context` helper; parent owns all registry mirrors and implementation.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `block_policy_over_budget`
  - `freshness_decision=block_policy_over_budget`
  - `CO-175`
  - `Task Packet`
  - `Task Mirror`
  - `Report Only`
  - `1251-1288`
  - `last_review=2026-03-17`
  - `blocking_changed_paths=0`
  - `221` rolling rows
  - `263` stale docs
  - `484` candidate rows
  - `8` candidate cohorts
  - `300` rows
  - `2` cohorts
- Not done if:
  - before/after reports are absent
  - the cohort disposition is not explicit
  - the resolution is only a blind `last_review` bump
  - freshness caps/windows are widened to pass
  - CO-207 or similar unrelated feature lanes still need bespoke caveats for this cohort
- Pre-implementation issue-quality review:
  - approved for parent implementation only after this packet, registry mirrors, and docs-review are accepted. The issue has protected wording, non-goals, parity/alignment framing, and acceptance criteria.

## Milestones & Sequencing
1. Accept this docs-first packet and have the parent update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Run before reports on current main or the selected baseline branch:
   - `npm run docs:freshness`
   - `npm run docs:freshness:maintain`
3. Save the reports under `out/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0/` with exact command/status notes.
4. Classify the Apr 17 cohort by class, path family, lineage, and recommended disposition.
5. Decide the disposition for each affected group: review/refresh, archive, reclassify, or assign a new explicit owner path.
6. Apply the smallest docs/registry/archive changes that implement the chosen disposition.
7. Run the scoped and docs validation gates; record after counts and capacity status.
8. Confirm CO-207 or another clean unrelated feature lane no longer fails on this stale baseline.
9. Complete standalone review, elegance/minimality review, workpad update, and PR handoff from the parent lane.

## Dependencies
- Linear issue `CO-209` and parent workpad comment `37788d3f-cd25-4baa-b84d-2fa398a16ca1`.
- Source issue `CO-207` / `6b0183b4-9ebc-4423-a356-4105ce8aa32b`.
- Existing evidence paths:
  - `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/docs-freshness.json`
  - `out/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b/docs-freshness-maintenance.json`
  - `docs/guides/docs-freshness-cohorts.md`
- Existing docs freshness registry and task registry.
- Parent-owned docs archive tooling if archiving is selected.

## Validation
- Child-lane checks:
  - target-file presence for the six scoped files
  - `git diff --check -- <six scoped files>`
- Parent-lane checks:
  - before `npm run docs:freshness`
  - before `npm run docs:freshness:maintain`
  - classification artifact for the Apr 17 cohort
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain` or an allowed maintenance decision proving clean unrelated diffs are not blocked
  - standalone review
  - elegance/minimality pass
- Rollback plan: revert any disposition changes and keep this packet as the issue-quality record; do not leave partial cap/window changes or blind review-date bumps.

## Risks & Mitigations
- Risk: parent treats the over-budget condition as a reason to loosen policy.
  - Mitigation: keep cap/window widening explicitly out of scope and require disposition evidence.
- Risk: parent silently bumps `last_review` across broad historical docs.
  - Mitigation: require class/path/lineage classification and owner-action rationale before date changes.
- Risk: CO-175 ownership ambiguity causes stale rows to remain unowned.
  - Mitigation: parent must decide whether CO-175 remains the owner for a subset or whether CO-209 becomes the explicit owner path.
- Risk: report-only rows are handled inconsistently with their source task packets.
  - Mitigation: classify `Report Only` rows separately and tie disposition to source packet status.
- Risk: child-lane packet implies registry work is complete.
  - Mitigation: this plan states registry mirrors were parent-owned; parent updated `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` after applying the child patch artifact.

## Approvals
- Docs packet child lane: completed successfully; helper accept invalidated on stale Linear metadata, and parent applied the reviewed saved patch artifact without file-scope collision.
- Parent docs-review: captured pre-fix in `.runs/linear-901cd944-fc0c-4372-92ce-65bb8bb411c0-docs-review/cli/2026-04-17T00-48-00-977Z-d429f7b5/manifest.json` and failed on the known `docs:freshness:maintain` baseline blocker that this lane then resolved.
- Date: 2026-04-17
