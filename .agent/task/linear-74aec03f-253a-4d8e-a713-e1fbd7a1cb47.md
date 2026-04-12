# Task Checklist - linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47

- Linear Issue: `CO-159` / `74aec03f-253a-4d8e-a713-e1fbd7a1cb47`
- MCP Task ID: `linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47`
- Primary PRD: `docs/PRD-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`
- TECH_SPEC: `tasks/specs/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`

## Docs-First
- [x] PRD drafted for the stale review and dead-claim request-burn lane. Evidence: `docs/PRD-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`.
- [x] TECH_SPEC drafted with the bounded stale-claim, review-wait, and bounded-recovery seam. Evidence: `tasks/specs/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`, `docs/TECH_SPEC-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, regressions, and handoff. Evidence: `docs/ACTION_PLAN-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/docs-freshness-registry.json` updated with the six `linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47` artifact entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `tasks/tasks-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`. Evidence: `tasks/tasks-linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`, `.agent/task/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47.md`.
- [x] Audited docs-review child stream captured for `linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47`. Evidence: `.runs/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47-docs-review-rerun/cli/2026-04-12T07-08-01-681Z-4cda95a4/manifest.json`, `.runs/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47-docs-review-rerun/cli/2026-04-12T07-08-01-681Z-4cda95a4/review/telemetry.json`.

## Implementation
- [x] Make dead active claims fail closed from local proof or manifest evidence before repeated live issue-by-id refresh. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts` (`discoverProviderIssueRuns`, `isProviderLinearWorkerInProgressProofLive`, `resolveProviderIssueRunStatus`), `orchestrator/tests/ProviderIssueHandoff.test.ts` dead-PID regression coverage.
- [x] Make completed review-handoff wait claims stay local-only without provider retry or repeated helper refresh churn. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts` (`resolveProviderIssuePollFailClosedReason`, `isProviderIssuePollFailClosedReason`, `dispatchQueuedProviderRetry`), `orchestrator/tests/ProviderIssueHandoff.test.ts` review-wait and retry-suppression coverage.
- [x] Bound startup and recovery to one live refresh before cached fail-closed behavior when no runnable work exists or reserve is low. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts` (`resolveTrackedIssuePollResolutionWithFallback`, `resolveRefreshTrackedIssueResolution`, `runRefreshCycle`), `orchestrator/tests/ProviderIssueHandoff.test.ts` first-pass poll and cached-fallback coverage.
- [x] Attribute stale-claim and review-wait reconciliation burn distinctly from useful runnable work. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts` fail-closed reason routing and queued-retry suppression, `orchestrator/tests/ProviderIssueHandoff.test.ts` targeted stale-claim and review-wait regressions.
- [x] Preserve paused stale workspaces and child-lane artifacts as resumable state. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts` accepted-claim cached revalidation path and local-only wait handling, `orchestrator/tests/ProviderIssueHandoff.test.ts` remote worker-host proof and cached-review-wait coverage.

## Validation
- [x] Focused regressions cover the `CO-139` dead active claim path and the `CO-96` review-wait path. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts` dead-PID, review-wait, first-pass handoff, retry-suppression, and remote worker-host proof cases.
- [x] `node scripts/delegation-guard.mjs`. Evidence: passed in the final provider-worker run (`Delegation guard: OK (8 subagent manifest(s) found).`).
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed in the final provider-worker run (`Spec guard: OK`).
- [x] `npm run build`. Evidence: passed in the final provider-worker run.
- [x] `npm run lint`. Evidence: passed in the final provider-worker run.
- [x] `npm run test`. Evidence: passed in the final provider-worker run (`333` and `3639` tests passed across the full suite).
- [x] `npm run docs:check`. Evidence: passed in the final provider-worker run (`docs:check: OK`).
- [x] `npm run docs:freshness`. Evidence: passed in the final provider-worker run (`docs:freshness OK - 3683 docs, 3686 registry entries`).
- [x] `npm run repo:stewardship`. Evidence: passed in the final provider-worker run (`repo:stewardship OK - 4662 tracked files, 0 action-required`).
- [x] `node scripts/diff-budget.mjs`. Evidence: passed in the final provider-worker run (`Diff budget: OK (scope=working-tree, files=10/25, lines=1118/1200, +1088/-30)`).
- [x] `npm run review`. Evidence: manifest-backed review was attempted twice via `.runs/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47-implementation-gate/cli/2026-04-12T07-40-57-648Z-8356d297/manifest.json` and `.runs/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47-implementation-gate/cli/2026-04-12T07-53-33-396Z-5266f45d/manifest.json`; both wrapper runs stalled without `review/telemetry.json`, so manual review fallback completed and its fixes are recorded in the Linear workpad.
- [x] `npm run pack:smoke`. Evidence: passed in the final provider-worker run (`pack smoke passed`), with review telemetry at `.runs/pack-smoke/cli/2026-01-01T00-00-00-000Z-packsmoke/review/telemetry.json`.

## Handoff
- [x] Workpad refreshed with docs-review evidence, implementation scope, and current validation truth. Evidence: `out/linear-74aec03f-253a-4d8e-a713-e1fbd7a1cb47/manual/workpad.md`, Linear comment `112fe5a7-e635-4631-a67a-25ac8d02e4b7`.
- [x] PR attached to the Linear issue before review-state transition. Evidence: `https://github.com/Kbediako/CO/pull/451`, Linear attachment `33f849e8-8b13-41eb-aeaf-95f5a20b870b`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: `git merge --no-edit origin/main` returned `Already up to date.` before PR open.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review` or `Human Review`) only after coding stops. Evidence: pending.
