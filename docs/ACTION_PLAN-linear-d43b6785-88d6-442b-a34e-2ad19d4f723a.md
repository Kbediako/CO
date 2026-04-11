# ACTION_PLAN - CO: add recurring autonomous repo-wide stewardship audit and freshness upkeep beyond markdown docs surfaces

## Traceability
- Linear issue: `CO-124` / `d43b6785-88d6-442b-a34e-2ad19d4f723a`

## Summary
- Goal: land a recurring repo-wide stewardship audit path that inventories tracked files, emits machine-checkable decisions, and publishes reviewable upkeep artifacts without reopening existing one-time cleanup or docs-only ownership lanes.
- Scope: docs-first packet, tracked-file stewardship catalog, audit script and tests, recurring weekly automation, bounded docs/agent guidance updates, one possible follow-up issue for historical residue, and the standard validation/review floor.
- Assumptions:
  - the right implementation is additive and catalog-driven
  - front-door docs remain under the existing docs truth checks

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `recurring autonomous repo-wide stewardship audit`
  - `validate`, `update`, `delete`, `retain_with_rationale`
  - `README.md`
  - `docs/public/**`
  - `reference/**`
  - `archives/**`
- Not done if:
  - the new lane still only inspects markdown/doc roots
  - any tracked-file decision class is missing from the output
  - recurring automation is still markdown-only
  - the lane claims reviewable output without a report or follow-up trail
- Pre-implementation issue-quality review:
  - the issue is correctly scoped to the recurring stewardship contract and should not expand into the actual bulk cleanup of every flagged historical residue surface

## Milestones & Sequencing
1. Bootstrap the `CO-124` docs-first packet, update `tasks/index.json`, `docs/TASKS.md`, the docs-freshness registry, and the single Linear workpad.
2. Implement the repo-stewardship catalog and `npm run repo:stewardship` audit path with focused tests and representative reviewable output.
3. Expand weekly automation from docs-only drift into repo stewardship and capture any required follow-up issue for out-of-scope historical residue.
4. Run docs-review, full validation, standalone review, and explicit elegance review before PR/review handoff.

## Dependencies
- `package.json`
- `.github/workflows/docs-truthfulness-weekly.yml`
- `docs/docs-catalog.json`
- `scripts/lib/docs-helpers.js`
- `scripts/docs-freshness.mjs`
- new repo-stewardship catalog / audit / test surfaces

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --format json`
  - `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run build`
  - `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run test`
  - `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run repo:stewardship`
  - `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-d43b6785-88d6-442b-a34e-2ad19d4f723a npm run pack:smoke`
- Rollback plan:
  - revert the new stewardship catalog/audit wiring if it misclassifies tracked surfaces or weakens fail-closed behavior
  - keep historical residue work split into a follow-up rather than forcing cleanup through this lane

## Risks & Mitigations
- Risk: the new catalog leaves too many tracked surfaces uncatalogued.
  - Mitigation: use explicit directory-class patterns and keep uncatalogued drift fail-closed in tests.
- Risk: historical reference/archive surfaces produce a large action set.
  - Mitigation: treat the audit as the bounded contract and split the residue cluster into a follow-up issue.
- Risk: the workflow expansion still reads as docs-only stewardship.
  - Mitigation: publish separate repo-stewardship JSON and markdown artifacts and update maintainer guidance.

## Approvals
- Reviewer: pending
- Date: 2026-04-09
