# Task Checklist - linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d

- Linear Issue: `CO-115` / `bf0ba9ec-47f0-45ac-be83-490df0f0b45d`
- MCP Task ID: `linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d`
- Primary PRD: `docs/PRD-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`
- TECH_SPEC: `tasks/specs/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`, `docs/TECH_SPEC-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`, `docs/ACTION_PLAN-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`, `tasks/specs/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`, `tasks/tasks-linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`, `.agent/task/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d.md`.
- [x] docs-review child-stream evidence recorded after the repo-supported `docs/TASKS.md` trim; the child stream passed `spec-guard` and `docs:check` and then failed only on the standing repo-wide `docs:freshness` stale-doc baseline. Evidence: `.runs/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d-co-115-docs-review/cli/2026-04-08T17-32-15-382Z-fc180ff1/manifest.json`, `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T173215Z-docs-review-fallback.md`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/workpad.md`, Linear comment `32d9648c-0697-4f9a-b02e-c20e67b22644`.

## Implementation
- [x] `provider-linear-worker` stage launch no longer depends on ambient bare `node` under launchd-owned PATH and environment. Evidence: `codex.orchestrator.json`, `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/11-stripped-path-launch.log`.
- [x] The parent launch/runtime contract injects the explicit executable resolution needed for child worker entrypoints. Evidence: `orchestrator/src/cli/services/commandRunner.ts`, `orchestrator/tests/CommandRunnerEnvPropagation.test.ts`, `orchestrator/tests/PipelineResolverEnvOverrides.test.ts`.
- [x] Runtime-provider or provider-worker proof classifies missing executable resolution as explicit runtime-parity truth instead of generic shell/fallback churn. Evidence: `orchestrator/src/cli/runtime/provider.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`, `orchestrator/tests/RuntimeProvider.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] The fix stays bounded to launch/runtime parity and does not reopen dispatch/bootstrap or dashboard seams. Evidence: tracked diff is limited to runtime, worker, command-runner, tests, and docs packet files in `git diff --stat`.

## Validation
- [x] Current `CO-87` reproducer artifact captured and cited. Evidence: `/Users/kbediako/Code/CO/.runs/linear-885a6ce9-7766-4296-be19-57e624769d46/cli/2026-04-08T16-41-34-176Z-49e7f08a/manifest.json`, `/Users/kbediako/Code/CO/.runs/linear-885a6ce9-7766-4296-be19-57e624769d46/cli/2026-04-08T16-41-34-176Z-49e7f08a/commands/01-provider-linear-worker.ndjson`, `/Users/kbediako/Code/CO/.runs/linear-885a6ce9-7766-4296-be19-57e624769d46/cli/2026-04-08T16-41-34-176Z-49e7f08a/errors/01-provider-linear-worker.json`.
- [x] Focused regressions cover the non-interactive PATH child-launch contract and truthful runtime-provider failure classification. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/09d-focused-after-provider-fix.log`, `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/09g-provider-runtime-final.log`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/03-build.log`, `09e-build-final.log`, `09h-build-post-final-fix.log`.
- [x] `npm run lint`. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/04-lint.log`, `09f-lint-final.log`, `09i-lint-post-final-fix.log`.
- [x] `npm run test`. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/05-test.log` (`318` files / `3171` tests passed).
- [x] `npm run docs:check`. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/06-docs-check.log`.
- [x] `npm run docs:freshness` documented repo-baseline fallback only. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/07-docs-freshness.log` (`stale docs: 282`; Task Packet `205`; Task Mirror `41`; Report Only `36`).
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/08-diff-budget.log`.
- [x] Standalone review fallback recorded after repeated `FORCE_CODEX_REVIEW=1 npm run review` attempts surfaced and then cleared concrete issues but the final diff stalled without a terminal verdict. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/09-review.log`, `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/09j-manual-review-fallback.md`.
- [x] Explicit elegance pass recorded before review handoff. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/10-elegance-review.md`.
- [x] `npm run pack:smoke` because the final diff touches downstream-facing CLI/runtime surfaces. Evidence: `out/linear-bf0ba9ec-47f0-45ac-be83-490df0f0b45d/manual/20260408T175752Z-validation-rerun/12-pack-smoke.log`.

## Handoff
- [ ] PR attached to the issue.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
