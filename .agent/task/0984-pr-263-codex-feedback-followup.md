# Task Checklist - PR 263 Codex Feedback Follow-up (0984)

- MCP Task ID: `0984-pr-263-codex-feedback-followup`
- Primary PRD: `docs/PRD-pr-263-codex-feedback-followup.md`
- TECH_SPEC: `tasks/specs/0984-pr-263-codex-feedback-followup.md`
- ACTION_PLAN: `docs/ACTION_PLAN-pr-263-codex-feedback-followup.md`
- Summary of scope: resolve missed actionable Codex feedback from PR #263, implement minimal runtime fixes, and document root cause + prevention controls.

> Set `MCP_RUNNER_TASK_ID=0984-pr-263-codex-feedback-followup` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`; include `npm run pack:smoke` for downstream-facing validation.

## Checklist

### Foundation and docs-first
- [x] Task scaffolding + mirrors + index/spec registration created. - Evidence: `docs/PRD-pr-263-codex-feedback-followup.md`, `docs/TECH_SPEC-pr-263-codex-feedback-followup.md`, `docs/ACTION_PLAN-pr-263-codex-feedback-followup.md`, `tasks/specs/0984-pr-263-codex-feedback-followup.md`, `tasks/tasks-0984-pr-263-codex-feedback-followup.md`, `.agent/task/0984-pr-263-codex-feedback-followup.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated analysis/implementation/validation streams captured with evidence. - Evidence: `.runs/0984-pr-263-codex-feedback-followup-research/cli/2026-02-27T05-40-03-591Z-108b8e4c/manifest.json`, `.runs/0984-pr-263-codex-feedback-followup-implementation/cli/2026-02-27T05-46-35-120Z-a5dae268/manifest.json`, `.runs/0984-pr-263-codex-feedback-followup-validation/cli/2026-02-27T05-54-40-347Z-7d1da7d8/manifest.json`, `out/0984-pr-263-codex-feedback-followup/manual/delegated-research.log`, `out/0984-pr-263-codex-feedback-followup/manual/delegated-implementation.log`, `out/0984-pr-263-codex-feedback-followup/manual/delegated-validation.log`.
- [x] Docs-review manifest captured before code edits. - Evidence: failed attempt `.runs/0984-pr-263-codex-feedback-followup/cli/2026-02-27T06-01-39-257Z-f51a6cf8/manifest.json` (`docs/TASKS.md` over line budget), rerun pass `.runs/0984-pr-263-codex-feedback-followup/cli/2026-02-27T06-03-10-274Z-c519009a/manifest.json`, logs `out/0984-pr-263-codex-feedback-followup/manual/docs-review-pre-implementation.log`, `out/0984-pr-263-codex-feedback-followup/manual/docs-review-pre-implementation-rerun.log`.

### Implementation
- [x] Cloud mode remains compatible when runtime mode is implicit default. - Evidence: `orchestrator/src/cli/runtime/provider.ts`, `orchestrator/src/cli/orchestrator.ts`, `orchestrator/tests/RuntimeProvider.test.ts`, `orchestrator/tests/OrchestratorCloudAutoScout.test.ts`, `tests/cli-command-surface.spec.ts`, `out/0984-pr-263-codex-feedback-followup/manual/fix-09a-targeted-rerun.log`.
- [x] Explicit unsupported combo (`executionMode=cloud + runtimeMode=appserver`) still fails fast. - Evidence: `orchestrator/tests/RuntimeProvider.test.ts` (source `flag` assertion), `out/0984-pr-263-codex-feedback-followup/manual/fix-09a-targeted-rerun.log`.
- [x] Runtime canary baseline clears runtime override env vars. - Evidence: `scripts/runtime-mode-canary.mjs`, `tests/runtime-mode-canary.spec.ts`, `out/0984-pr-263-codex-feedback-followup/manual/targeted-tests.log`.
- [x] Root-cause analysis and prevention controls documented. - Evidence: `out/0984-pr-263-codex-feedback-followup/manual/pr-263-root-cause.md`, `AGENTS.md`, `docs/AGENTS.md`.

### Validation chain
- [x] 01 `node scripts/delegation-guard.mjs` - Evidence: `out/0984-pr-263-codex-feedback-followup/manual/final-01-delegation-guard.log`, `final2-01-delegation-guard.log`.
- [x] 02 `node scripts/spec-guard.mjs --dry-run` - Evidence: `out/0984-pr-263-codex-feedback-followup/manual/final-02-spec-guard.log`, `final2-02-spec-guard.log`.
- [x] 03 `npm run build` - Evidence: `out/0984-pr-263-codex-feedback-followup/manual/final-03-build.log`, `final2-03-build.log`.
- [x] 04 `npm run lint` - Evidence: `out/0984-pr-263-codex-feedback-followup/manual/final-04-lint.log`, `final2-04-lint.log`.
- [x] 05 `npm run test` - Evidence: fail `out/0984-pr-263-codex-feedback-followup/manual/final-05-test.log`, `final-05-test-rerun2.log`, `final-05-test-rerun4.log`, `final-05-test-rerun5.log`, `final2-05-test.log`, `final2-05-test-rerun.log`; fixes `fix-05a-update-instruction-stamp.log`, `fix-05b-targeted-rerun.log`, `fix-05c-cli-surface-timeout-rerun.log`, `fix-05d-cloud-sync-worker-rerun.log`; pass `final-05-test-rerun6.log` (latest code+test pass before docs-only refresh).
- [x] 06 `npm run docs:check` - Evidence: `out/0984-pr-263-codex-feedback-followup/manual/final-06-docs-check.log`, `final-06-docs-check-rerun.log`, `final-06-docs-check-rerun2.log`, `final2-06-docs-check.log`.
- [x] 07 `npm run docs:freshness` - Evidence: `out/0984-pr-263-codex-feedback-followup/manual/final-07-docs-freshness.log`, `final-07-docs-freshness-rerun.log`, `final-07-docs-freshness-rerun2.log`, `final2-07-docs-freshness.log`.
- [x] 08 `node scripts/diff-budget.mjs` - Evidence: `out/0984-pr-263-codex-feedback-followup/manual/final-08-diff-budget.log`, `final-08-diff-budget-rerun.log`, `final-08-diff-budget-rerun2.log`, `final2-08-diff-budget.log`.
- [x] 09 `npm run review` - Evidence: handoff-only `out/0984-pr-263-codex-feedback-followup/manual/final-09-review.log`, fail `final-09-review-rerun.log`, `final-09-review-rerun2.log`, pass `final-09-review-rerun3.log`, final integration pass `final2-09-review.log`.
- [x] 10 `npm run pack:smoke` - Evidence: `out/0984-pr-263-codex-feedback-followup/manual/final-10-pack-smoke.log`, `final2-10-pack-smoke.log`.

### Review, merge, and handoff
- [x] PR opened with scope/decisions/validation evidence. - Evidence: `https://github.com/Kbediako/CO/pull/264`, `out/0984-pr-263-codex-feedback-followup/manual/pr-create.log`, `out/0984-pr-263-codex-feedback-followup/manual/pr-create-api.log`, `out/0984-pr-263-codex-feedback-followup/manual/pr-body.md`.
- [x] PR #263 unresolved actionable threads explicitly replied-to and resolved after audit. - Evidence: reply links `https://github.com/Kbediako/CO/pull/263#discussion_r2863212606`, `https://github.com/Kbediako/CO/pull/263#discussion_r2863212601`, `https://github.com/Kbediako/CO/pull/263#discussion_r2863212602`; GraphQL resolve mutations `PRRT_kwDOQE1BPc5xGDor`, `PRRT_kwDOQE1BPc5xGDos`, `PRRT_kwDOQE1BPc5xGLCr`, `PRRT_kwDOQE1BPc5xGS-6`, `PRRT_kwDOQE1BPc5xGbNy`.
- [ ] Review feedback addressed in-thread with reruns. - Evidence: `<discussion-links>`, rerun logs.
- [ ] Quiet-window monitoring completed after green checks. - Evidence: `out/0984-pr-263-codex-feedback-followup/manual/pr-watch.log`.
- [ ] Merge complete and branch cleaned up (if unblocked). - Evidence: `<merge-commit-sha>`, watch/cleanup logs.
