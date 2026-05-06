# Task Checklist - 1314-coordinator-symphony-authoritative-retry-state-and-attempts

- MCP Task ID: `1314-coordinator-symphony-authoritative-retry-state-and-attempts`
- Primary PRD: `docs/PRD-coordinator-symphony-authoritative-retry-state-and-attempts.md`
- TECH_SPEC: `tasks/specs/1314-coordinator-symphony-authoritative-retry-state-and-attempts.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-authoritative-retry-state-and-attempts.md`

## Docs-first
- [x] PRD drafted for the authoritative retry-state parity slice after `1313`. Evidence: `docs/PRD-coordinator-symphony-authoritative-retry-state-and-attempts.md`.
- [x] TECH_SPEC drafted for the authoritative retry-state parity slice. Evidence: `tasks/specs/1314-coordinator-symphony-authoritative-retry-state-and-attempts.md`, `docs/TECH_SPEC-coordinator-symphony-authoritative-retry-state-and-attempts.md`.
- [x] ACTION_PLAN drafted for the authoritative retry-state parity slice. Evidence: `docs/ACTION_PLAN-coordinator-symphony-authoritative-retry-state-and-attempts.md`.
- [x] `tasks/index.json` registers the `1314` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `1314` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1314-coordinator-symphony-authoritative-retry-state-and-attempts.md`. Evidence: `.agent/task/1314-coordinator-symphony-authoritative-retry-state-and-attempts.md`.
- [x] docs-review manifest recorded for `1314`. Evidence: `.runs/1314-coordinator-symphony-authoritative-retry-state-and-attempts/cli/2026-03-21T11-38-19-443Z-469bf7c8/manifest.json`, `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T114934Z-docs-first/00-summary.md`.
- [x] Historical versus current publication posture is explicit: the `1314` closeout pack records the earlier `1312`/`1313`/`1314` implemented-on-branch tranche when `1315` was still next, while current branch truth for PR `#283` is that `1315` and `1316` are also landed on branch and publication remains open only until the current-head closeout at `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T211653Z-current-head-closeout/` clears review-thread closure, required GitHub checks, and merge. Evidence: `docs/TASKS.md`, `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`, `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T211653Z-current-head-closeout/`, `gh pr view 283 --repo Kbediako/CO`.

## Implementation
- [x] Provider-intake/handoff state exposes authoritative retry metadata instead of inferred-or-null placeholders. Evidence: `orchestrator/src/cli/control/providerIntakeState.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] `/api/v1/state.retrying` stops inferring retry rows from failed manifests. Evidence: `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ObservabilityApiController.test.ts`.
- [x] `/api/v1/<issue>.retry` exposes truthful retry metadata. Evidence: `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/tests/ObservabilityApiController.test.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] `/api/v1/<issue>.attempts` exposes truthful restart and current retry counts. Evidence: `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] Strict post-worker-exit scheduler ownership/cadence parity remains explicitly out of scope unless this slice proves a hard coupling. Evidence: `docs/PRD-coordinator-symphony-authoritative-retry-state-and-attempts.md`, `docs/TECH_SPEC-coordinator-symphony-authoritative-retry-state-and-attempts.md`.

## Validation
- [x] Focused provider-intake/handoff/runtime/API regressions proving authoritative retry fields. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ObservabilityApiController.test.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`, `orchestrator/tests/SelectedRunPresenter.test.ts`, `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `npm run build`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `npm run lint`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `npm run test`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `npm run docs:check`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `npm run docs:freshness`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] Current-head review outcome is recorded truthfully: `codex-orchestrator review` produced no concrete findings on this publication-closeout diff but terminated at the bounded `active-closeout-bundle-reread` boundary, so publication uses an explicit review-tool waiver instead of claiming a clean rerun. Evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T211653Z-current-head-closeout/10-review.log`, `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T211653Z-current-head-closeout/00-summary.md`.
- [x] `npm run pack:smoke` if required by touched downstream-facing surfaces. Evidence: `out/1314-coordinator-symphony-authoritative-retry-state-and-attempts/manual/20260321T133006Z-stacked-closeout-refresh/00-summary.md`.
- [x] Live authoritative retry publication posture is recorded truthfully: this head did not rerun a fresh control-host `/api/v1/state.retrying` or `/api/v1/<issue>` proof, so publication relies on focused runtime/API regressions plus an explicit waiver rather than claiming new live proof. Evidence: `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T211653Z-current-head-closeout/00-summary.md`.
