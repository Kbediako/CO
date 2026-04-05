# ACTION_PLAN - CO: Make Merging-stage merge closeout deterministic and watchdog-backed

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-80` / `7bb1895e-cda2-4173-86ec-c6794ccb1ce7`
- Linear URL: https://linear.app/asabeko/issue/CO-80/co-make-merging-stage-merge-closeout-deterministic-and-watchdog-backed

## Summary
- Goal: move `Merging` closeout from prompt guidance to a deterministic provider/control-host contract with watchdog-backed recovery and explicit merge-closeout evidence.
- Scope: docs-first packet, workpad, child docs-review, merge-closeout proof + handoff/watchdog implementation, focused regressions, full validation, standalone review, elegance review, and review handoff.
- Assumptions:
  - `CO-25` already closed the shared-root reconciliation command contract after successful merge
  - `CO-51` already addressed interrupted merge-drain retry classification
  - the remaining gap is the missing first-class merge-closeout contract and recovery path

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `Merging-stage merge closeout`
  - `deterministic`
  - `watchdog-backed`
  - `Merging -> merge -> Done`
  - `machine-checkable closeout evidence`
  - `provider-linear-worker-proof.json`
  - `scripts/lib/pr-watch-merge.js`
- Not done if:
  - a clean merge-ready issue can still idle in `Merging`
  - restart recovery still depends on another operator nudge
  - merge-closeout truth still depends on generic end reasons or prompt text
- Pre-implementation issue-quality review:
  - completed during bootstrap. The repo already contains the narrower `CO-25` and `CO-51` slices, so this lane is explicitly limited to the remaining deterministic merge-closeout contract rather than reopening those predecessor fixes.

## Milestones & Sequencing
1. Register the docs-first packet for `linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7`, update `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, mirror the checklist, create the required single workpad, and keep the issue in the actual started state.
2. Run `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-80-docs-review --format json` to capture audited pre-implementation approval evidence.
3. Inspect the current merge-closeout seam across provider worker proof, handoff/relaunch, and PR readiness helpers; define the smallest shared readiness and proof contract that satisfies the acceptance criteria.
4. Implement structured merge-closeout proof and deterministic handoff/watchdog behavior for merge-ready `Merging` issues, preserving existing shared-root closeout semantics.
5. Add focused regressions for restart/recovery, merge-closeout arming/result evidence, and explicit action-required outcomes.
6. Run the full validation floor, execute manifest-backed standalone review, run an explicit elegance pass, refresh the workpad, and only then proceed to PR/review handoff.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
- `scripts/lib/pr-watch-merge.js`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- any focused PR readiness helper tests introduced by the final seam

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-80-docs-review --format json`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7 node scripts/delegation-guard.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7 node scripts/spec-guard.mjs --dry-run`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7 npm run build`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7 npm run lint`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7 npm run test`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7 npm run docs:check`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7 npm run docs:freshness`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7 node scripts/diff-budget.mjs`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7 TASK=linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7 NOTES="Goal: CO-80 merge-closeout review handoff | Summary: make Merging closeout deterministic and watchdog-backed with explicit provider/control-host artifacts | Risks: merge-ready detection drift, over-broad relaunch policy, proof/read-model mismatch | Questions (optional): none" FORCE_CODEX_REVIEW=1 npm run review -- --manifest \"$CODEX_ORCHESTRATOR_MANIFEST_PATH\"`
  - `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-7bb1895e-cda2-4173-86ec-c6794ccb1ce7 npm run pack:smoke`
- Required manual proof:
  - merge-closeout artifacts show arming, attempt, result, shared-root reconciliation, and final Linear transition truthfully
  - restart/recovery of a clean merge-ready `Merging` issue is deterministic
  - non-mergeable cases end in explicit action-required evidence rather than silent idle `Merging`
- Rollback plan:
  - revert the merge-closeout proof and watchdog changes together if they misclassify readiness or over-launch retries, then record the exact blocker as a follow-up instead of weakening the contract silently

## Risks & Mitigations
- Risk: duplicating PR readiness logic across worker and control-host paths creates drift.
  - Mitigation: extract or reuse the existing readiness snapshot logic instead of re-encoding mergeability by hand.
- Risk: merge-closeout watchdog retries could over-launch when the PR is not truly stable.
  - Mitigation: keep explicit arming rules tied to the same required checks, merge state, unresolved threads, and quiet-window truth used by the merge shepherd.
- Risk: richer proof fields diverge from selected-run/runtime projections.
  - Mitigation: keep the new proof contract additive and cover it with projection-facing tests where necessary.

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-05
