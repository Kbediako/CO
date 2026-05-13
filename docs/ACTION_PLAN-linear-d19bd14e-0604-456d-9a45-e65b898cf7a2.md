# ACTION_PLAN - CO: clear stale merge-closeout action-required claims when issues leave Merging and return to active work

## Added by Bootstrap 2026-04-10

## Traceability
- Linear issue: `CO-138` / `d19bd14e-0604-456d-9a45-e65b898cf7a2`
- Linear URL: https://linear.app/asabeko/issue/CO-138/co-clear-stale-merge-closeout-action-required-claims-when-issues-leave

## Summary
- Goal: finish `CO-138` by making stale merge-closeout failure residue stop blocking pickup once newer tracked issue truth has left `Merging`.
- Scope: docs-first packet, audited child docs-review, bounded `providerIssueHandoff.ts` rehydrate / refresh repair, focused regressions using the `CO-120` shape, required validation, standalone review, elegance review, and review-handoff prep.
- Assumptions:
  - the reproduced stale shape is already present in local `CO-120` artifacts and current control-plane code
  - the smallest safe fix lives in completed-run rehydrate truth plus explicit cleaned-claim persistence, not in broader workflow orchestration
  - current live `Merging` merge-closeout behavior is already correct and must remain unchanged

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `merge_closeout`, `handoff_failed`, `provider_issue_merge_closeout_action_required`, `Merging`, `In Progress`, `provider-intake-state.json`, and `providerIssueHandoff.ts`
  - reject "clear all `action_required` outcomes" and "reopen adjacent merge-closeout or review-promotion lanes"
- Not done if:
  - a reproduced stale merge-closeout still blocks pickup
  - manual state-file edits remain necessary
  - truly current `Merging` issues stop honoring their merge-closeout result
- Pre-implementation issue-quality review:
  - the live issue plus current code and artifact audit narrow the seam to stale merge-closeout freshness / invalidation in completed-run rehydrate, with explicit null persistence from the same handoff path

## Milestones & Sequencing
1. Register the `CO-138` docs-first packet, task registry entry, docs freshness registry entries, task mirror, and initial workpad source file.
2. Run `linear child-stream --pipeline docs-review --stream co-138-docs-review --format json` and record the manifest-backed result or truthful fallback if only repo-baseline docs freshness blocks.
3. Reproduce the `CO-120` stale shape from current artifacts and isolate the exact stale-record decision point in `providerIssueHandoff.ts`.
4. Implement the smallest stale merge-closeout invalidation / supersession seam that preserves current live `Merging` behavior.
5. Add or update focused regressions for stale completed-run rehydrate, preserved current `Merging` behavior, and poll / rehydrate recovery.
6. Run required validation, standalone review, and elegance review, then refresh the workpad for PR / review handoff.

## Dependencies
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-138-docs-review --format json`
  - focused stale merge-closeout regressions for completed-run rehydrate and preserved current `Merging` behavior
  - focused poll / rehydrate recovery coverage for the cleaned claim state
  - `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 FORCE_CODEX_REVIEW=1 npm run review`
- Rollback plan:
  - revert the stale-merge-closeout invalidation seam if live `Merging` behavior regresses
  - keep the issue active until both stale-record cleanup and preserved live `Merging` semantics are proven together

## Risks & Mitigations
- Risk: clearing merge-closeout too broadly could retire genuinely current `Merging` closeout state.
  - Mitigation: key cleanup to newer non-`Merging` tracked issue truth and add a preserved-live-`Merging` regression.
- Risk: resolver-only cleanup still allows persisted stale records to reappear on later recovery.
  - Mitigation: inspect both resolver and persistence seams and add a poll / rehydrate recovery regression.
- Risk: the reproduced incident shape depends on more than one adjacent lane.
  - Mitigation: constrain the repair to the exact stale-record seam and keep named adjacent lanes explicitly out of scope.

## Approvals
- Reviewer: audited `docs-review` child stream for `CO-138` passed (evidence: `.runs/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2-co-138-docs-review/cli/2026-04-10T07-04-13-496Z-80cbb02d/manifest.json`)
- Date: 2026-04-10
