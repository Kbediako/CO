# Task Checklist - linear-72286a49-e68b-435a-be72-74d5c28feb09

- Linear Issue: `CO-194` / `72286a49-e68b-435a-be72-74d5c28feb09`
- MCP Task ID: `linear-72286a49-e68b-435a-be72-74d5c28feb09`
- Primary PRD: `docs/PRD-linear-72286a49-e68b-435a-be72-74d5c28feb09.md`
- TECH_SPEC: `tasks/specs/linear-72286a49-e68b-435a-be72-74d5c28feb09.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-72286a49-e68b-435a-be72-74d5c28feb09.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-72286a49-e68b-435a-be72-74d5c28feb09.md`
- Current source anchor: `ctx:sha256:0e14523b60a2448444c404e9aedfe1b599bec10a9ccf5ab97eff4ba10fb72d65#chunk:c000001`
- Current origin manifest: `.runs/linear-72286a49-e68b-435a-be72-74d5c28feb09-docs-packet-current/cli/2026-04-15T17-48-15-133Z-8a3b1602/manifest.json`

## Docs-First
- [x] PRD drafted for stale terminal released-pending-reopen `Merging` refresh-health and restart-loop stabilization. Evidence: `docs/PRD-linear-72286a49-e68b-435a-be72-74d5c28feb09.md`.
- [x] TECH_SPEC drafted with stale terminal claim classification, dead-PID evidence, `provider_refresh_lifecycle_stuck` / `restart_required` guardrails, `CO STATUS` running count semantics, and live-worker preservation. Evidence: `tasks/specs/linear-72286a49-e68b-435a-be72-74d5c28feb09.md`, `docs/TECH_SPEC-linear-72286a49-e68b-435a-be72-74d5c28feb09.md`.
- [x] ACTION_PLAN drafted for parent implementation, focused regressions, validation, and review. Evidence: `docs/ACTION_PLAN-linear-72286a49-e68b-435a-be72-74d5c28feb09.md`.
- [x] `tasks/index.json` updated under canonical `items[]` with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-72286a49-e68b-435a-be72-74d5c28feb09.md`. Evidence: `.agent/task/linear-72286a49-e68b-435a-be72-74d5c28feb09.md`.
- [x] Standalone pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-72286a49-e68b-435a-be72-74d5c28feb09.md` readiness gate.
- [x] `docs/docs-freshness-registry.json` coverage added for all six packet/mirror files. Evidence: `docs/docs-freshness-registry.json`.

## Workflow
- [x] Child lane stayed docs-only and did not mutate Linear state or workpad. Evidence: shared source payload and final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane left changes uncommitted for parent patch export. Evidence: `git status --short`.
- [x] Parent lane accepted the docs patch and owns Linear workpad, implementation, validation, PR lifecycle, and review-state transition. Evidence: final diff and Linear workpad.

## Implementation Acceptance
- [x] Reproduce with a fixture or harness where Linear issue truth is terminal/Done, local intake retains released plus `provider_issue_released_pending_reopen` `Merging` / started claim, the recorded worker PID is dead, and unrelated provider workers are live. Evidence: `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts` regression `reconciles a terminal released pending-reopen merging claim without canceling unrelated live workers`.
- [x] Provider refresh reconciles or quarantines that stale terminal `Merging` claim without entering `provider_refresh_lifecycle_stuck`. Evidence: the focused provider handoff regression releases the stale claim without cancel/start/resume side effects.
- [x] Provider refresh does not set or immediately re-enter `restart_required` from the same retained stale claim. Evidence: the focused provider handoff regression avoids the stale released-cancel/restart path, and `npm run test` preserves existing stuck/restart-required truth tests.
- [x] `CO STATUS` stops counting the dead stale claim as a running slot once terminal truth and dead-PID evidence are available. Evidence: `orchestrator/tests/ControlRuntime.test.ts` regression `does not count a selected stale terminal provider claim as a running CO STATUS row`.
- [x] Supervisor restart/recovery preserves live unrelated provider workers. Evidence: the provider handoff regression keeps the unrelated live `CO-195` claim running.
- [x] Supervisor restart/recovery does not immediately re-enter `restart_required` from the same retained stale claim. Evidence: provider handoff stale-proof handling plus full `npm run test`.
- [x] Tests cover the terminal/stale `Merging` refresh-health path separately from `CO-192` projection-only pruning and `CO-193` Ready reclaim. Evidence: new provider handoff and control runtime regressions target the terminal/dead-PID `Merging` path directly.
- [x] Genuine refresh-health failures still surface `provider_refresh_lifecycle_stuck` / `restart_required` truth. Evidence: `npm run test` includes `ControlServerPublicLifecycle` and `ProviderPollingHealth` stuck/restart-required coverage.

## Not Done If
- [ ] Stale merged/Done issue truth can still leave a retained `Merging` claim that drives `provider_refresh_lifecycle_stuck` or `restart_required`.
- [ ] `co-status` can still fail because this stale claim triggers a restart loop.
- [ ] Recovery drops or kills unrelated live provider workers such as `CO-192` or `CO-193`.
- [ ] The fix only hides the `CO STATUS` row without stabilizing refresh lifecycle health.
- [ ] Tests do not distinguish this terminal/stale `Merging` refresh-health path from `CO-192` projection pruning and `CO-193` Ready reclaim.

## Validation
- [x] Child scoped JSON parse and registry/path consistency checks. Evidence: `jq empty tasks/index.json`, `jq empty docs/docs-freshness-registry.json`, and local scoped registry check returned `scoped registry check ok`.
- [x] Child scoped `git diff --check` and whitespace checks over touched files. Evidence: `git diff --check -- <touched tracked files>` returned clean and local scoped whitespace scan returned `scoped whitespace check ok`.
- [x] Parent focused stale terminal `Merging` provider refresh test. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`.
- [x] Parent focused `CO STATUS` running count test. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ControlRuntime.test.ts`.
- [x] Parent focused supervisor/recovery live-worker preservation test. Evidence: `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`.
- [x] Parent genuine-refresh-stuck guard test. Evidence: `npm run test`.
- [x] `node scripts/spec-guard.mjs --dry-run` after docs patch acceptance. Evidence: guard returned OK.
- [x] Parent required validation/review/elegance gates before PR handoff. Evidence: focused vitest suites, full `npm run build`, `npm run lint`, `npm run test`, docs/spec/stewardship/diff-budget gates, bounded-success standalone review, manual elegance pass, and `npm run pack:smoke` all passed after the proof-freshness fixes.

## Progress Log
- 2026-04-16: Bounded same-issue child lane created the current `CO-194` docs-first packet and registry mirrors against source anchor `ctx:sha256:0e14523b60a2448444c404e9aedfe1b599bec10a9ccf5ab97eff4ba10fb72d65#chunk:c000001` and issue `updated_at=2026-04-15T16:38:07.274Z`. The packet preserves the issue checksum: `provider_refresh_lifecycle_stuck`, `restart_required`, `released-pending-reopen`, `Merging`, `stale terminal claim`, `dead worker PID`, `CO STATUS running row`, no replacement of `CO-192` projection pruning, no replacement of `CO-193` Ready reclaim, no hidden health errors, and no killing unrelated live provider workers.
- 2026-04-16: Parent implementation added stale in-progress proof classification for provider handoff, selected-provider CO STATUS suppression for terminal truth plus dead-PID proof, and focused regressions for refresh reconciliation, live-worker preservation, release-cancel suppression, and selected running-row removal.
