# ACTION_PLAN - CO: Refresh tracked issue metadata for active provider claims

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-64` / `88b95054-4f55-4d4d-94be-b491d9896b31`
- Linear URL: https://linear.app/asabeko/issue/CO-64/co-refresh-tracked-issue-metadata-for-active-provider-claims

## Summary
- Goal: finish `CO-64` by making persisted provider claim metadata stay aligned with live Linear while the provider worker is still actively running.
- Scope: docs-first packet registration, audited child docs-review, active-run rehydrate or refresh seam inspection, narrow provider handoff implementation, focused regressions, required validation, and pre-handoff review or elegance passes.
- Assumptions:
  - the schema in `providerIntakeState.ts` is already sufficient and the main seam is in how active-run updates are written
  - the stale drift is about tracked-issue metadata truth, not pickup eligibility or release semantics
  - nearby tests that currently preserve stale `Ready` metadata can be updated without weakening terminal-proof or manifest-authority safeguards
- Current status:
  - issue moved to `In Progress`
  - dedicated branch `linear/co-64-refresh-tracked-issue-metadata` created from detached `2b3fc540b`
  - current worker manifest path identified at `.runs/linear-88b95054-4f55-4d4d-94be-b491d9896b31/cli/2026-04-02T00-58-52-234Z-28f866ee/manifest.json`
  - code inspection narrowed the likely stale-truth seam to the active-run branch in `rehydrateNow()` inside `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - nearby `ProviderIssueHandoff` tests already encode stale `Ready` metadata preservation for active claims even when `resolveTrackedIssue` returns newer `In Progress`

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `provider-intake-state.json`
  - `active run rehydration`
  - `tracked issue metadata`
  - `issue_state`
  - `issue_state_type`
  - `issue_updated_at`
  - `In Progress`
  - `Ready`
- Not done if:
  - active running claims can still preserve stale `Ready` metadata after live Linear moves them to `In Progress`
  - the fix only covers one rehydrate path while another active-run persistence path still preserves stale fields
  - the implementation changes lifecycle ownership, review policy, rate-limit behavior, or poll cadence to hide the bug
- Pre-implementation issue-quality review:
  - the issue is already shaped narrowly enough. The implementation should stay on persisted claim truth during active runs and create a follow-up if a wider control-host truth gap appears.

## Milestones & Sequencing
1. Register the `CO-64` docs-first packet, update `tasks/index.json`, prepend the new `docs/TASKS.md` snapshot, update `docs/docs-freshness-registry.json`, mirror the checklist under `.agent/task/`, and create the single active workpad comment.
2. Launch the audited child `docs-review` stream and capture the manifest or a truthful fallback note if the nested review stage fails without a classified boundary.
3. Inspect all active-run persistence paths in `providerIssueHandoff.ts`, especially `rehydrateNow()` and any later refresh path that can persist `provider_issue_rehydrated_active_run`.
4. Apply the smallest truthful fix:
   - keep the claim `running` while the run is active and eligible
   - merge fresher tracked-issue metadata into the persisted claim when live Linear has newer truth
   - preserve manifest or proof authority for terminal paths
5. Update focused tests so they assert the new active-run metadata truth and preserve lifecycle behavior.
6. Run the required repo validation floor.
7. Run standalone review first and then an explicit elegance or minimality pass before any PR handoff.
8. Refresh the workpad, open and attach the PR, drain `pr ready-review`, and only then consider `In Review`.

## Dependencies
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`
- `skills/linear/SKILL.md`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-88b95054-4f55-4d4d-94be-b491d9896b31 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-64-docs-review --format json`
  - focused provider handoff regressions in `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - focused serialization or persistence checks in `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts` if touched by the final seam
  - `MCP_RUNNER_TASK_ID=linear-88b95054-4f55-4d4d-94be-b491d9896b31 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-88b95054-4f55-4d4d-94be-b491d9896b31 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-88b95054-4f55-4d4d-94be-b491d9896b31 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-88b95054-4f55-4d4d-94be-b491d9896b31 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-88b95054-4f55-4d4d-94be-b491d9896b31 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-88b95054-4f55-4d4d-94be-b491d9896b31 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-88b95054-4f55-4d4d-94be-b491d9896b31 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-88b95054-4f55-4d4d-94be-b491d9896b31 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-88b95054-4f55-4d4d-94be-b491d9896b31 FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-88b95054-4f55-4d4d-94be-b491d9896b31 npm run pack:smoke`
- Rollback plan:
  - revert the active-run metadata merge if it changes claim lifecycle state or breaks manifest-authority behavior
  - keep the issue active and file a follow-up rather than claiming success if another active-run path still persists stale metadata

## Risks & Mitigations
- Risk: active-run metadata refresh could accidentally reopen earlier eligibility or release behavior.
  - Mitigation: keep the fix within existing `running` or `provider_issue_rehydrated_active_run` paths and preserve state or reason transitions.
- Risk: only one persistence path is fixed while another still preserves stale fields.
  - Mitigation: inspect both startup rehydration and later refresh handling before closing the lane.
- Risk: a narrow code patch updates metadata but loses existing proof or manifest authority rules.
  - Mitigation: preserve nearby terminal-path logic and extend focused tests instead of rewriting run classification.

## Approvals
- Reviewer: Pending child docs-review, implementation validation, and standalone review
- Remaining: active-run patch, focused test updates, repo validation floor, PR checks, and review handoff
- Date: 2026-04-02
