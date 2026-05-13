# ACTION_PLAN - CO: clear repo-wide docs:freshness baseline blocking review handoffs

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-63` / `a34ce3f3-8e78-40f7-aabd-9e510572323e`
- Linear URL: https://linear.app/asabeko/issue/CO-63/co-clear-repo-wide-docsfreshness-baseline-blocking-review-handoffs

## Summary
- Goal: finish `CO-63` by restoring a truthful repo-wide `docs:freshness` baseline so worker lanes can hand off without inherited stale-doc debt.
- Scope: docs-first packet registration, audited child docs-review, stale-set reproduction and classification, minimal registry or archive remediation, required validation, and pre-handoff review/elegance passes.
- Assumptions:
  - the current failure is a seeded repo baseline and not a new `CO-62` regression
  - some stale entries will be historical implementation docs that can be archived or reclassified under existing policy
  - the remaining active stale docs can be handled through a bounded review pass without redesigning the docs-freshness system itself
- Current status:
  - issue moved to `In Progress`
  - single workpad comment created
  - dedicated branch created from the current workspace commit
  - seeded stale baseline reproduced (`171` stale docs)
  - corrective split verified against the original `171`-entry stale report: `77` stale docs now remain `archived`, `94` now remain `active`
  - overview-linked archived docs with existing `doc-archives` payloads were converted into explicit stubs
  - `13` docs without matching archive payloads remain `active`
  - `38` docs were restored from an earlier archived intermediate state after task-status review showed their tasks are still non-terminal in `tasks/index.json`
  - the live `0303` autonomy PRD / tech spec / action plan were restored locally and moved back to `active` because the overview docs still treat that `approved` task as current primary guidance
  - active overview docs and examples were trimmed or refreshed so current sources no longer point at newly archived docs
  - parent standalone review finished with `review_outcome: bounded-success`
  - local delegation/spec/build/lint/test/docs validation is green, and `pack:smoke` was skipped intentionally because the final diff is docs-only

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness`
  - `stale docs`
  - `last_review`
  - `cadence_days`
  - `review handoff`
  - `repo-wide baseline`
- Not done if:
  - the final branch still leaves unrelated stale entries active and failing
  - the fix relies on waiving or weakening the gate
  - the closeout cannot explain which docs were kept active versus archived or otherwise reclassified
- Pre-implementation issue-quality review:
  - the issue is already scoped correctly as a repo-wide baseline-repair lane. The implementation should stay on docs freshness truth and file a follow-up if a larger policy or tooling redesign appears necessary.

## Milestones & Sequencing
1. Register the `CO-63` docs-first packet, update `tasks/index.json`, refresh `docs/TASKS.md`, update `docs/docs-freshness-registry.json`, and mirror the checklist under `.agent/task/`.
2. Run the audited child `docs-review` stream and capture the manifest or a truthful fallback note if the wrapper stalls or fails without a classified boundary.
3. Reproduce the stale-doc baseline, inspect the generated report, and classify entries into archive-policy candidates versus still-active guidance.
4. Apply the smallest truthful remediation:
   - archive or reclassify non-active implementation docs using existing policy when appropriate
   - refresh `last_review` only for docs that the lane actually re-reviewed as active guidance
5. Rerun `docs:freshness` until the stale count is `0`.
6. Rerun the audited child `docs-review` stream on the corrected diff so the archive-stub adjustment is reviewed against the actual final branch state.
7. Run the required repo validation floor for the final diff.
8. Run standalone review first and then an explicit elegance/minimality pass before any PR handoff.
9. Refresh the workpad, open and attach the PR, drain `pr ready-review`, and only then consider `In Review`.

## Dependencies
- `scripts/docs-freshness.mjs`
- `scripts/implementation-docs-archive.mjs`
- `docs/docs-freshness-registry.json`
- `docs/implementation-docs-archive-policy.json`
- `skills/linear/SKILL.md`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-63-docs-review --format json`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e node scripts/implementation-docs-archive.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run build`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run test`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-a34ce3f3-8e78-40f7-aabd-9e510572323e npm run pack:smoke` when the final diff is not docs-only (skip it for docs-only closeouts like this lane)
- Rollback plan:
  - revert any registry or archive change that incorrectly downgrades a still-active doc
  - keep the issue active and file a follow-up rather than claiming a truthful green baseline when classification remains ambiguous

## Risks & Mitigations
- Risk: the stale set may include docs that look historical but are still active guidance.
  - Mitigation: only archive or reclassify entries backed by existing policy or explicit lane review notes.
- Risk: registry-only archival can hide docs that still look current in overview docs.
  - Mitigation: when overview docs still point at an archived primary doc, either move the archived file to an explicit stub or trim the active overview so it no longer presents the archived doc as current guidance.
- Risk: the stale set may be larger than can be honestly reviewed in one bounded lane.
  - Mitigation: use the existing archive policy for completed implementation docs first, then focus remaining effort on still-active guidance; file a follow-up only if a truly separate redesign is required.
- Risk: docs-review or standalone review may fail without a concrete wrapper verdict.
  - Mitigation: record the exact manifest and use the repo’s truthful fallback pattern rather than stalling or mislabeling the failure.

## Approvals
- Reviewer: Pending docs-review, implementation validation, and standalone review
- Remaining: stale-set remediation, repo validation floor, PR checks, and review handoff
- Date: 2026-04-01
