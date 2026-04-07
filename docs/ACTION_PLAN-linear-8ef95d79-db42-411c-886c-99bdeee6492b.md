# ACTION_PLAN - CO: Disambiguate historical attached PRs during deterministic merge closeout for reopened issues

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-104` / `8ef95d79-db42-411c-886c-99bdeee6492b`
- Linear URL: https://linear.app/asabeko/issue/CO-104/co-disambiguate-historical-attached-prs-during-deterministic-merge

## Summary
- Goal: make reopened `Merging` merge closeout safely ignore historical merged PR attachments, auto-select the one remaining current candidate, and preserve explicit ambiguity truth in persisted artifacts.
- Scope: docs-first packet, one workpad, audited docs-review child stream, merge-closeout disambiguation, focused handoff persistence regressions, full validation, standalone review, elegance review, and review handoff.
- Assumptions:
  - the workspace started detached at `685dd2ebc` from `origin/main` and now uses branch `linear/co-104-pr-attachment-disambiguation`
  - `CO-81` already covered stale-proof recovery and only left the historical attached-PR merge-closeout seam unresolved
  - the minimal correct artifact contract is the persisted `merge_closeout` record in provider/control-host state

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `providerMergeCloseout.ts`
  - `providerIssueHandoff.ts`
  - `issue.attachments`
  - `multiple_attached_prs`
  - `Merging`
  - `provider-intake-state.json`
  - `merge_closeout`
  - historical merged PR attachment
  - replacement PR attachment
- Not done if:
  - a `CO-81`-style reopened issue still requires manual stale attachment cleanup
  - conflicting PR URLs are still not explicit in action-required merge-closeout truth
  - the persisted record still cannot show selected versus ignored historical PR URLs
- Pre-implementation issue-quality review:
  - completed during bootstrap. The issue is already properly scoped to deterministic merge-closeout candidate selection and artifact truth. The current repo audit shows the seam is real and narrow: `providerMergeCloseout.ts` hard-stops on multiple same-repo attachments, while `providerIssueHandoff.ts` already persists the merge-closeout record and therefore only needs regression coverage proving the enriched record flows through.

## Milestones & Sequencing
1. Register the `linear-8ef95d79-db42-411c-886c-99bdeee6492b` packet, update `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, mirror the checklist, create the required single workpad, and keep the issue in the real started state.
2. Run `MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-104-docs-review --format json` to capture audited delegation evidence before implementation.
3. Patch `providerMergeCloseout.ts` to resolve attached PR candidates deterministically, ignore historical merged PR attachments safely, and persist selected / ignored / conflicting PR URL evidence.
4. Add focused regressions in `ProviderMergeCloseout.test.ts` and `ProviderIssueHandoff.test.ts` for the reopened historical-plus-current seam, true ambiguity, and unchanged no-PR / repo-mismatch behavior.
5. Run the validation floor, execute manifest-backed standalone review, record an explicit elegance pass, refresh the workpad, and only then proceed to PR and review-state handoff.

## Dependencies
- `orchestrator/src/cli/control/providerMergeCloseout.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/tests/ProviderMergeCloseout.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-104-docs-review --format json`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b node scripts/delegation-guard.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b node scripts/spec-guard.mjs --dry-run`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b npm run build`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b npm run lint`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b npm run test`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b npm run docs:check`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b npm run docs:freshness`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b node scripts/diff-budget.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b TASK=linear-8ef95d79-db42-411c-886c-99bdeee6492b NOTES="Goal: CO-104 merge-closeout PR attachment disambiguation review handoff | Summary: ignore historical merged attachments safely, select one current replacement PR when unambiguous, and persist explicit conflicting URL truth when ambiguous | Risks: over-broad historical filtering, persisted artifact drift, repo-mismatch regression | Questions (optional): none" FORCE_CODEX_REVIEW=1 npm run review -- --manifest \"$CODEX_ORCHESTRATOR_MANIFEST_PATH\"`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-8ef95d79-db42-411c-886c-99bdeee6492b npm run pack:smoke`
- Required manual proof:
  - the `CO-81` reopened historical `#360` plus replacement `#372` shape chooses `#372` and records `#360` as ignored historical
  - true ambiguity records explicit conflicting PR URLs
  - no-attached-PR and repo-mismatch behavior stay unchanged
- Rollback plan:
  - revert the disambiguation helper and record-shape additions together if they misclassify candidates or drop persisted artifact truth, then reopen the remainder as a follow-up rather than weakening fail-closed semantics

## Risks & Mitigations
- Risk: historical filtering accidentally hides a still-relevant PR.
  - Mitigation: ignore only PRs that GitHub reports as merged historical attachments; keep all non-merged PRs in the candidate set.
- Risk: additive record fields are not persisted consistently through handoff updates.
  - Mitigation: add a handoff regression that proves the enriched record survives claim persistence.
- Risk: ambiguity remains machine-opaque even after the fix.
  - Mitigation: persist explicit conflicting PR URL arrays and keep `multiple_attached_prs` as the top-level action-required reason.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-08
