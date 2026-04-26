# ACTION_PLAN - CO: recreate live owner for remaining Mar 23 docs-freshness task-checklist cohort

## Summary
- Goal: recreate the live same-project owner for the remaining Mar 23 historical task-packet docs-freshness cohort and register that owner path in the current issue packet/mirrors.
- Scope: CO-319 workpad/state/parallelization, canonical owner recreation, packet docs, task/registry mirrors, docs-review, and truthful validation for a docs-only diff.
- Assumptions:
  - the preserved CO-318 maintenance report is authoritative for the exact cohort key and evidence values
  - `CO-320` is the newly created live owner issue for this cohort
  - no runtime/code change is required

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness:maintain`
  - `block_unowned_repo_debt`
  - `owner_issue=CO-300`
  - `configured_owner_terminal`
  - `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`
  - `codex-orchestrator:canonical-owner-key=docs_freshness_candidate|doc_class:task_packet|path_family:tasks/tasks-*|last_review:2026-03-23|cadence_days:30`
  - `CO-320`
- Not done if:
  - the packet loses the exact key/marker or maintenance evidence
  - `CO-320` is missing or not clearly the live owner
  - current mirrors are not updated
  - the lane broadens into refreshing the historical task-packet cohort itself
- Pre-implementation issue-quality review:
  - 2026-04-23: live issue context confirmed the team states and required `Ready -> In Progress` transition.
  - 2026-04-23: `linear create-follow-up --canonical-owner-key ...` created `CO-320` via the `Backlog` path; a later live `issue-context` check shows `CO-320` now in `In Progress`.
  - 2026-04-23: first docs child lane completed but was invalidated because it used the wrong evidence set; parent will draft the final packet directly.

## Milestones & Sequencing
1. Inspect live issue context, move `Ready -> In Progress`, create the single workpad, and record the pre-turn matrix plus `parallelize_now`.
2. Launch the bounded same-issue docs child lane and let it complete for audit coverage.
3. Create or reuse the exact canonical owner follow-up issue for the cohort. Outcome: `CO-320` created via the `Backlog` path and now observed live in `In Progress`.
4. Invalidate the first child-lane patch because it preserved the wrong fallback evidence.
5. Draft the authoritative packet docs directly from the issue brief and preserved maintenance report.
6. Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
7. Run docs-review and the truthful docs-only validation/review floor.
8. Refresh the workpad before any handoff or closeout.

## Dependencies
- Preserved CO-318 maintenance report
- `linear issue-context`
- `linear upsert-workpad`
- `linear parallelization`
- `linear child-lane`
- `linear create-follow-up`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Validation
- Checks / tests:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - docs-review child stream or truthful fallback
  - manifest-backed standalone review and explicit elegance pass if the final diff remains non-trivial
- Rollback plan:
  - revert only the CO-319 docs/mirror edits; `CO-320` remains the correct owner issue and should not be deleted as part of packet rollback

## Risks & Mitigations
- Risk: the packet reuses the wrong evidence family.
  - Mitigation: anchor all docs on the exact cohort key, `CO-300` terminal owner state, lineage `1319-1321`, and sample task-packet paths from the preserved report.
- Risk: future workers mistake CO-319 for the historical refresh issue.
  - Mitigation: repeatedly state that `CO-320` is the live owner and the actual historical refresh is out of scope for CO-319.
- Risk: docs-only validation is underspecified.
  - Mitigation: run docs-review plus the truthful docs-only floor and record any narrower validation rationale explicitly.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-23
