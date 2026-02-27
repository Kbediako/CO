# Task Checklist - Runtime Default Flip Readiness Automation (0983)

- MCP Task ID: `0983-runtime-default-flip-readiness-automation`
- Primary PRD: `docs/PRD-runtime-default-flip-readiness-automation.md`
- TECH_SPEC: `tasks/specs/0983-runtime-default-flip-readiness-automation.md`
- ACTION_PLAN: `docs/ACTION_PLAN-runtime-default-flip-readiness-automation.md`
- Summary of scope: automate runtime canary simulations in dummy repos, harden failed-start exit semantics, and finalize appserver default-flip decision.

> Set `MCP_RUNNER_TASK_ID=0983-runtime-default-flip-readiness-automation` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`; include `npm run pack:smoke` for downstream-facing validation.

## Checklist

### Foundation and docs-first
- [x] Task scaffolding + mirrors + index/spec registration created. - Evidence: `docs/PRD-runtime-default-flip-readiness-automation.md`, `docs/TECH_SPEC-runtime-default-flip-readiness-automation.md`, `docs/ACTION_PLAN-runtime-default-flip-readiness-automation.md`, `tasks/specs/0983-runtime-default-flip-readiness-automation.md`, `tasks/tasks-0983-runtime-default-flip-readiness-automation.md`, `.agent/task/0983-runtime-default-flip-readiness-automation.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] Delegated planning/release/canary-design streams captured with evidence. - Evidence: `.runs/0983-runtime-default-flip-readiness-automation-planning/cli/2026-02-27T03-13-30-097Z-0c84b474/manifest.json`, `.runs/0983-runtime-default-flip-readiness-automation-implementation/cli/2026-02-27T03-13-31-145Z-d123a621/manifest.json`, `.runs/0983-runtime-default-flip-readiness-automation-validation/cli/2026-02-27T03-13-32-343Z-9336b654/manifest.json`, `out/0983-runtime-default-flip-readiness-automation/manual/delegated-planning.log`, `out/0983-runtime-default-flip-readiness-automation/manual/delegated-implementation.log`, `out/0983-runtime-default-flip-readiness-automation/manual/delegated-validation.log`.
- [x] Docs-review manifest captured before code edits. - Evidence: `.runs/0983-runtime-default-flip-readiness-automation/cli/2026-02-27T03-15-26-074Z-611a30d0/manifest.json`, `out/0983-runtime-default-flip-readiness-automation/manual/docs-review-pre-implementation-final.log`.

### Implementation
- [x] Runtime canary automation script added and documented. - Evidence: `scripts/runtime-mode-canary.mjs`, `package.json`, `out/0983-runtime-default-flip-readiness-automation/manual/runtime-canary-summary.json`.
- [x] Failed-start exit semantics hardened for deterministic automation assertions. - Evidence: `bin/codex-orchestrator.ts`, `tests/cli-command-surface.spec.ts`, `out/0983-runtime-default-flip-readiness-automation/manual/final-05-test.log`.
- [x] Gate `10` cadence policy documented (task trigger + time backstop). - Evidence: `.github/workflows/pack-smoke-backstop.yml`, `AGENTS.md`, `docs/AGENTS.md`, `README.md`, `docs/README.md`.
- [x] Default-flip decision executed with evidence (flip or hold). - Evidence: `orchestrator/src/cli/runtime/mode.ts`, `orchestrator/src/cli/run/manifest.ts`, `orchestrator/tests/RuntimeProvider.test.ts`, `out/0983-runtime-default-flip-readiness-automation/manual/runtime-canary-summary.json`.

### Dummy/simulated runtime canary evidence
- [x] Appserver-success lane evidence captured. - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/canary-appserver-success-r1-i1.json`, `out/0983-runtime-default-flip-readiness-automation/manual/canary-appserver-success-r5-i4.json`.
- [x] Forced-fallback lane evidence captured. - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/canary-fallback-r1-i1.json`, `out/0983-runtime-default-flip-readiness-automation/manual/canary-fallback-r5-i4.json`.
- [x] Unsupported-combo fail-fast lane evidence captured. - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/canary-unsupported-combo-r1-i1.json`, `out/0983-runtime-default-flip-readiness-automation/manual/canary-unsupported-combo-r5-i4.json`.
- [x] Combined threshold summary captured. - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/runtime-canary-summary.json`.

### Validation chain
- [x] 01 `node scripts/delegation-guard.mjs` - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/final-01-delegation-guard.log`.
- [x] 02 `node scripts/spec-guard.mjs --dry-run` - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/final-02-spec-guard.log`.
- [x] 03 `npm run build` - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/final-03-build.log`.
- [x] 04 `npm run lint` - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/final-04-lint.log`.
- [x] 05 `npm run test` - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/final-05-test.log`, `out/0983-runtime-default-flip-readiness-automation/manual/fixcheck-targeted-tests.log`.
- [x] 06 `npm run docs:check` - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/final-06-docs-check.log`.
- [x] 07 `npm run docs:freshness` - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/final-07-docs-freshness.log`.
- [x] 08 `node scripts/diff-budget.mjs` - Evidence: fail `out/0983-runtime-default-flip-readiness-automation/manual/final-08-diff-budget.log`; pass `out/0983-runtime-default-flip-readiness-automation/manual/final-08-diff-budget-rerun.log`.
- [x] 09 `npm run review` - Evidence: fail `out/0983-runtime-default-flip-readiness-automation/manual/final-09-review.log`; pass `out/0983-runtime-default-flip-readiness-automation/manual/final-09-review-rerun.log`.
- [x] 10 `npm run pack:smoke` - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/final-10-pack-smoke.log`.
- [x] Docs relevance advisory executed post-validation. - Evidence: `.runs/0983-runtime-default-flip-readiness-automation-docs-relevance/cli/2026-02-27T04-05-57-925Z-606debe1/manifest.json`, `out/0983-runtime-default-flip-readiness-automation/manual/docs-relevance-advisory.log`.

### Review, merge, and handoff
- [x] PR opened with scope/decisions/validation evidence. - Evidence: `https://github.com/Kbediako/CO/pull/263`, `out/0983-runtime-default-flip-readiness-automation/manual/pr-create.log`, `out/0983-runtime-default-flip-readiness-automation/manual/pr-create-api.log`, `out/0983-runtime-default-flip-readiness-automation/manual/pr-body.md`.
- [x] Review feedback addressed in-thread with reruns. - Evidence: in-thread replies `https://github.com/Kbediako/CO/pull/263#discussion_r2862493720`, `https://github.com/Kbediako/CO/pull/263#discussion_r2862493716`, `https://github.com/Kbediako/CO/pull/263#discussion_r2862493718`, `https://github.com/Kbediako/CO/pull/263#discussion_r2862493717`; fix commits `dd619818814f229c8ec4c5cad4e895023a4ee734`, `7260d3de989c590af6915616248b8d7b7b401503`, `7ebb95d33736f88fb00792209bc588f1120c24d2`; rerun evidence `out/0983-runtime-default-flip-readiness-automation/manual/pr-263-checks-watch-2.log`, `out/0983-runtime-default-flip-readiness-automation/manual/pr-263-checks-watch-3.log`, `out/0983-runtime-default-flip-readiness-automation/manual/pr-263-checks-watch-4.log`.
- [x] Post-merge audit recorded missed actionable Codex threads and follow-up ownership. - Evidence: `out/0984-pr-263-codex-feedback-followup/manual/pr-263-root-cause.md`, `tasks/tasks-0984-pr-263-codex-feedback-followup.md`.
- [x] Quiet-window monitoring completed after green checks. - Evidence: `out/0983-runtime-default-flip-readiness-automation/manual/pr-263-quiet-window.log`.
- [x] Merge complete and branch cleaned up (if unblocked). - Evidence: merged PR `https://github.com/Kbediako/CO/pull/263`, merge commit `b5af63f43634d1febb1a0e440716694cbeebcc36`, metadata `out/0983-runtime-default-flip-readiness-automation/manual/pr-263-merge-metadata.json`, local cleanup `out/0983-runtime-default-flip-readiness-automation/manual/pr-263-branch-cleanup.log`.
