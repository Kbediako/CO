# ACTION_PLAN - CO: Make shared-root reconciliation deterministic after merged closeout, including resumed Merging active-run recovery

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-100` / `179fd570-c493-49a7-9eaf-9222beca114a`
- Linear URL: https://linear.app/asabeko/issue/CO-100/co-make-shared-root-reconciliation-deterministic-after-merged-closeout

## Summary
- Goal: make merged closeout leave `/Users/kbediako/Code/CO` reconciled or explicitly pending reconciliation, and prevent resumed `Merging` `activeRun` recovery from bypassing deterministic merge closeout.
- Scope: docs-first packet, one workpad, audited docs-review child stream, closeout/rehydrate/observability implementation, focused regressions, full validation, standalone review, elegance review, and review handoff.
- Assumptions:
  - `CO-80` already introduced deterministic merge closeout and shared-root reconciliation recording
  - the remaining gap is recovery ordering plus authoritative operator-facing shared-root truth
  - the workspace starts from a detached `origin/main` snapshot and now uses branch `linear/co-100-shared-root-reconciliation-closeout`

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `shared-root reconciliation`
  - `deterministic merge closeout`
  - `provider_issue_rehydrated_active_run`
  - `merge_closeout`
  - `Merging`
  - `origin/main`
  - `--ff-only`
  - `/Users/kbediako/Code/CO`
- Not done if:
  - a merged lane can still leave the shared root stale without an explicit machine-readable reason
  - resumed `Merging` active-run recovery can still bypass merge closeout
  - the authoritative operator surface still marks merged+skipped reconciliation as simply complete
- Pre-implementation issue-quality review:
  - completed during bootstrap. The current tree already contains the `CO-80` deterministic merge-closeout scaffolding, but the live seam review shows two remaining gaps that match `CO-100` exactly: refresh/rehydrate can still preserve `provider_issue_rehydrated_active_run` before invoking merge closeout, and provider observability still treats merged+skipped shared-root reconciliation as fully complete with `no_action`.

## Milestones & Sequencing
1. Register the docs-first packet for `linear-179fd570-c493-49a7-9eaf-9222beca114a`, update `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, mirror the checklist, create the required single workpad, and keep the issue in the actual started state.
2. Run `MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-100-docs-review --format json` to capture audited pre-implementation approval evidence.
3. Patch `providerIssueHandoff.ts` so `Merging` refresh/rehydrate recovery runs deterministic merge closeout before preserving a resumed active-run claim when closeout is authoritative.
4. Patch `providerMergeCloseout.ts` and `providerIssueObservability.ts` so shared-root reconciliation skips become durable pending outcomes with explicit operator-visible reason and progress status.
5. Add focused regressions for the `CO-98` bypass shape and pending shared-root reconciliation visibility.
6. Run the validation floor, execute manifest-backed standalone review, run an explicit elegance pass, refresh the workpad, and only then proceed to PR/review handoff.

## Dependencies
- `orchestrator/src/cli/control/providerMergeCloseout.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerIssueObservability.ts`
- `orchestrator/tests/ProviderMergeCloseout.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ProviderIssueObservability.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-100-docs-review --format json`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a node scripts/delegation-guard.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a node scripts/spec-guard.mjs --dry-run`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a npm run build`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a npm run lint`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a npm run test`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a npm run docs:check`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a npm run docs:freshness`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a node scripts/diff-budget.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a TASK=linear-179fd570-c493-49a7-9eaf-9222beca114a NOTES="Goal: CO-100 shared-root reconciliation and Merging recovery review handoff | Summary: make merged closeout leave the shared root reconciled or explicitly pending, and prevent rehydrated active-run Merging recovery from bypassing deterministic merge closeout | Risks: merge-closeout claim semantics drift, pending-vs-complete observability regression, refresh ordering gaps | Questions (optional): none" FORCE_CODEX_REVIEW=1 npm run review -- --manifest \"$CODEX_ORCHESTRATOR_MANIFEST_PATH\"`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-179fd570-c493-49a7-9eaf-9222beca114a npm run pack:smoke`
- Required manual proof:
  - merged closeout can distinguish reconciled shared root from pending/skipped shared-root reconciliation with explicit reason
  - `Merging` refresh/rehydrate recovery runs deterministic merge closeout before preserving a resumed active run
  - the operator-visible debug/progress surface no longer reports merged+skipped shared-root closeout as fully complete
- Rollback plan:
  - revert the recovery-ordering and observability changes together if they misclassify live `Merging` claims or overstate pending reconciliation, then record the blocker as a follow-up rather than weakening shared-root truth silently

## Risks & Mitigations
- Risk: changing refresh ordering could disturb legitimate active `Merging` ownership paths.
  - Mitigation: keep the change scoped to live `Merging` issues where deterministic merge closeout is authoritative, and test the exact resumed-active-run recovery shape.
- Risk: operator-facing status could overcorrect and mark reconciled merges as pending.
  - Mitigation: derive pending only from explicit `shared_root.status === skipped` or failure states, and cover reconciled vs skipped in observability tests.
- Risk: machine consumers still infer intent from summaries instead of structured reasons.
  - Mitigation: encode shared-root-specific reason/status in the merge-closeout record and project it directly into the debug surface.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-06
