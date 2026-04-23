# ACTION_PLAN - Maintain docs freshness rolling baseline

## Summary
- Goal: restore the Apr 20 repository-wide docs freshness baseline so stale docs and the CO-175 rolling freshness cohort are reviewed/current without weakening the gate.
- Scope: CO-267 docs-first packet, before/after artifacts, classification, reviewed freshness metadata refresh, CO-175 rolling cohort handling, registry mirrors, validation, and review handoff.
- Assumptions:
  - CO-266 remains scoped to terminal-blocker advisory work
  - current evidence supports reviewed refresh for stale rows rather than policy dilution
  - CO-175 rolling debt is visible owner debt that must be reviewed/current before expiry

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `rolling freshness cohort`
  - `CO-175`
  - `stale docs`
  - `canonical owner`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Not done if:
  - `docs:freshness` remains red for stale docs or rolling debt
  - `docs:freshness:maintain` remains blocking
  - the closeout hides CO-175 rolling debt or weakens gates
  - before/after artifacts omit exact counts and residual risk
  - CO-266 remains responsible for repo-wide freshness maintenance
- Pre-implementation issue-quality review:
  - 2026-04-20: current parent reproduction confirms the issue shape and keeps CO-266 out of scope.
  - 2026-04-21: Rework reset confirmed PR #566 had already merged, deleted the old workpad, created `linear/co-267-docs-freshness-rolling-baseline-r2` from current `origin/main`, and reproduced the remaining Apr 21 baseline as 37 stale Task Packet / Task Mirror rows with no rolling cohort rows.

## Milestones & Sequencing
1. Inspect Linear context, move `Ready -> In Progress`, create the single workpad, and record the current-turn parallelization decision.
2. Launch a bounded same-issue tests lane for baseline reproduction; if patch accept is invalidated by live issue timestamp drift, rerun parent-owned baseline artifacts.
3. Capture before artifacts:
   - `MCP_RUNNER_TASK_ID=linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4 npm run docs:freshness`
   - `MCP_RUNNER_TASK_ID=linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4 npm run docs:freshness:maintain`
   - `node scripts/spec-guard.mjs --dry-run`
4. Create/refresh the CO-267 PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry entries.
5. Classify stale docs/spec rows and the CO-175 rolling cohort in `docs/findings/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4-docs-freshness-classification.md`.
6. Apply the smallest truthful reviewed disposition:
   - refresh exact stale docs registry rows
   - refresh exact stale active spec frontmatter rows
   - refresh or otherwise explicitly dispose of the CO-175 rolling cohort
   - update cohort guidance and mirrors
7. Rerun freshness/spec/docs validation and capture after artifacts.
8. Complete required validation floor, standalone review, elegance pass, PR attachment, ready-review drain, and Linear handoff.
9. Rework addendum: refresh the exact Apr 21 stale `0954` and `1311`-`1316` packet/mirror rows, update the CO-267 classification/cohort guidance, rerun freshness validation, and only then proceed to review handoff.

## Dependencies
- Linear issue `CO-267`
- Source issue `CO-266`
- Rolling owner issue `CO-175`
- Current before artifacts under `out/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/before/`
- Parent manifest `.runs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/cli/2026-04-20T00-16-23-383Z-f8073975/manifest.json`

## Validation
- Checks / tests:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - full provider-worker validation floor before handoff
- Rollback plan:
  - revert CO-267 metadata/frontmatter refreshes if after validation shows hidden debt, incorrect class/path inclusion, or gate weakening
  - preserve classification and before reports for a follow-up owner if a different disposition is needed

## Risks & Mitigations
- Risk: refresh looks like a blind date bump.
  - Mitigation: exact path-level classification and before/after artifacts are required before closeout.
- Risk: CO-175 rolling debt becomes invisible.
  - Mitigation: explicitly classify and refresh/current the CO-175 cohort, then record final ledger status.
- Risk: spec guard and docs freshness disagree because they read different metadata.
  - Mitigation: update both registry metadata and active spec frontmatter only for classified rows.
- Risk: same-issue child-lane patch cannot be accepted after issue timestamp drift.
  - Mitigation: record the successful child run and invalidated accept truthfully, rerun parent baseline, and avoid relying on unaccepted patch content.

## Approvals
- Docs-first packet: parent-authored after current issue-context and baseline reproduction.
- Rework packet refresh: parent-authored on 2026-04-21 after current-main reproduction.
- Parent docs-review / standalone review: rework standalone review completed with `bounded-success`; evidence `.runs/linear-8f605d1a-e4ec-4acf-bb8a-bb3a2a1027c4/cli/2026-04-21T05-34-25-740Z-9cf43116/review/telemetry.json`.
