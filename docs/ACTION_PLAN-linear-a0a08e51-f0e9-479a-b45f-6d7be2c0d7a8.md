# ACTION PLAN - CO workflow: reopen CO-175 for Apr 18 docs:freshness over-budget historical packet cohort

## Summary
- Goal: document the resolved March 18 `1289-1298` ownership path while preserving the original CO-175 rolling cohort and fail-closed policy.
- Scope: refreshed docs-first packet, before/after freshness evidence, the second explicit CO-175 baseline cohort in `docs/docs-catalog.json`, the Apr 18 owner update in `docs/guides/docs-freshness-cohorts.md`, and focused validation.
- Assumptions:
  - shared source 0 is metadata/provenance only
  - `origin/main` baseline is `b678ce4`
  - the March 18 cohort is `70` active docs across `1289-1298`
  - the pre-fix over-budget state was caused by cohort count (`8/2`), not row count (`291/300`)

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `block_policy_over_budget`
  - `candidate_entries=291`
  - `current_cohorts=8`
  - `max_cohorts=2`
  - `blocking_changed_paths=[]`
  - `CO-175`
  - `co-175-apr-14-march-14-tasks-1164-1195`
  - `1289-1298`
  - `last_review=2026-03-18`
  - `70` blocking stale docs
  - `221` rolling entries
- Not done if:
  - the March 18 cohort remains blocking with no explicit owner action
  - the parent widens caps or windows
  - the parent hides the original CO-175 rolling cohort
  - the parent resolves the issue with only a blind review-date bump
- Pre-implementation issue-quality review:
  - 2026-04-18: accepted framing is a reopened CO-175 owner lane for the March 18 `1289-1298` historical packet cohort
  - rejected framings are policy rollback, cap expansion, new owner issue creation, hidden rolling debt, or non-docs child-lane scope drift

## Milestones & Sequencing
1. Refresh the PRD, TECH_SPEC, ACTION_PLAN, task spec, checklist, `.agent` mirror, `tasks/index.json`, and `docs/TASKS.md` for the Apr 18 reopen state.
2. Parent reproduces and saves current baseline reports on `origin/main` `b678ce4`:
   - `npm run docs:freshness`
   - `npm run docs:freshness:maintain`
3. Parent records the March 18 cohort classification for lineage `1289-1298`:
   - Task Packet `50`
   - Task Mirror `10`
   - Report Only `10`
   - seven path families with `10` rows each
4. Parent chooses the smallest truthful owner action for the March 18 cohort:
   - declare the second explicit baseline cohort `co-175-apr-18-march-18-cli-1289-1298` because `291` candidate rows and `2` cohorts remain within the existing policy budget
   - keep refresh/archive/reclassify as the required next action before the new cohort expires on `2026-04-24`
5. Parent updates only the necessary freshness registry and guide surfaces while preserving:
   - owner issue `CO-175`
   - existing rolling cohort `co-175-apr-14-march-14-tasks-1164-1195`
   - fail-closed behavior for undeclared or expired cohorts
6. Parent reruns focused docs checks and records the target after-state:
   - `0` blocking stale docs
   - `291` rolling entries still visible
   - `pass_with_owned_rolling_debt` for clean unrelated diffs

## Dependencies
- Shared source anchor: `ctx:sha256:c4f24ab84edb50fdc98e76b64014ea589485230f2da0aba7746189ae723a9798#chunk:c000001`
- Origin manifest: `.runs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8-co175-docs-reopen/cli/2026-04-18T04-42-20-811Z-4332c1c3/manifest.json`
- Existing rolling-policy guide: `docs/guides/docs-freshness-cohorts.md`
- Existing rolling cohort id: `co-175-apr-14-march-14-tasks-1164-1195`
- Parent-owned report and implementation surfaces:
  - `docs/docs-catalog.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `out/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8/`

## Validation
- Child lane only:
  - `python3 -c "import json, pathlib; json.loads(pathlib.Path('tasks/index.json').read_text()); print('tasks/index.json OK')"`
  - protected-term grep over the refreshed packet and mirrors
  - `git diff --check -- docs/PRD-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md docs/TECH_SPEC-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md docs/ACTION_PLAN-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md tasks/specs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md tasks/tasks-linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md .agent/task/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8.md tasks/index.json docs/TASKS.md`
- Parent implementation lane:
  - before/after `npm run docs:freshness`
  - before/after `npm run docs:freshness:maintain`
  - `node scripts/spec-guard.mjs --dry-run`
  - focused guide and registry updates proving the Apr 18 decision
- Rollback plan:
  - revert March 18 cohort changes only
  - keep the original CO-175 rolling cohort policy and packet evidence intact

## Risks & Mitigations
- Risk: the parent treats the over-budget condition as a cap-expansion request.
  - Mitigation: the packet preserves that the row budget is still within cap and the correct action is owner resolution, not policy widening.
- Risk: the parent hides the original rolling ledger while fixing the March 18 cohort.
  - Mitigation: every packet artifact names the existing rolling cohort id explicitly.
- Risk: the parent resolves the cohort with an unreviewed blanket date bump.
  - Mitigation: the packet requires reviewed owner action and before/after machine-checkable reports.

## Approvals
- Docs packet child lane: `.runs/linear-a0a08e51-f0e9-479a-b45f-6d7be2c0d7a8-co175-docs-reopen/cli/2026-04-18T04-42-20-811Z-4332c1c3/manifest.json`
- Parent docs-review: pending parent acceptance
- Parent implementation / validation / PR lifecycle: pending parent lane
