# Task Checklist - linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d

- Linear Issue: `CO-193` / `9b1440f0-a3af-4863-8bb5-2f8ea78bd02d`
- MCP Task ID: `linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d`
- Primary PRD: `docs/PRD-linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`
- TECH_SPEC: `tasks/specs/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`
- Source anchor: `ctx:sha256:497972dcd0d65946049eb88b42d9e1b5799ac2393f6d2a00ff032fa98ea2313c#chunk:c000001`

## Docs-First
- [x] PRD drafted for Ready released-pending-reopen reclaim after blockers clear. Evidence: `docs/PRD-linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`.
- [x] TECH_SPEC drafted with reclaim/fresh-discovery scope and dirty-workspace/live-worker safety constraints. Evidence: `tasks/specs/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation. Evidence: `docs/ACTION_PLAN-linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`.
- [x] First child docs patch rejected for intent drift. Evidence: `.runs/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d-docs-packet/cli/2026-04-15T15-16-50-425Z-60b069ba/manifest.json`.
- [x] Registry and mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `.agent/task/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d.md` readiness gate.

## Implementation Acceptance
- [x] Ready/unstarted released pending-reopen claim with terminal blockers is reclaimed/requeued or marked eligible-for-reclaim. Evidence: `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts -t "reclaims a Ready released pending-reopen claim through fresh discovery after blockers clear"`.
- [x] Dirty workspace contents are preserved during reclaim. Evidence: focused CO-191 regression asserts the dirty workspace file remains unchanged after reclaim launch.
- [x] Dead/no worker PID evidence does not suppress reclaim. Evidence: focused CO-191 regression seeds an `in_progress` manifest with dead PID proof and `isProcessAlive: () => false`.
- [x] Live same-issue worker evidence still blocks duplicate launch/resume. Evidence: `npx vitest run orchestrator/tests/ControlRuntime.test.ts -t "keeps released pending-reopen started provider workers visible while intake rehydrates"` and full `npm run test`.
- [x] Provider-intake/CO STATUS reason text distinguishes blocker wait, live-worker wait, and eligible/reclaim states. Evidence: blocker reasons remain covered by full provider handoff tests; CO-191 regression lands `provider_issue_start_launched`; CO-189 projection remains covered.
- [x] CO-189 live-worker rehydration behavior remains green. Evidence: full `npm run test` includes `ProviderIssueHandoffRefreshSerialization.test.ts` and `ControlRuntime.test.ts`.

## Validation
- [x] `jq empty tasks/index.json docs/docs-freshness-registry.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`.
- [x] Docs-review child stream passed after the `docs/TASKS.md` line-budget fix. Evidence: `.runs/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d-docs-review/cli/2026-04-15T15-33-50-178Z-e7664739/manifest.json`.
- [x] Focused `ProviderIssueHandoff` regression for the CO-191 shape. Evidence: `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts -t "reclaims a Ready released pending-reopen claim through fresh discovery after blockers clear"`.
- [x] Existing pending-reopen provider handoff coverage. Evidence: `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Existing `ControlRuntime` CO-189 live-worker projection coverage. Evidence: `npx vitest run orchestrator/tests/ControlRuntime.test.ts -t "keeps released pending-reopen started provider workers visible while intake rehydrates"`.
- [x] `npm run build`.
- [x] Full validation floor passed: `node scripts/delegation-guard.mjs`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke`.
- [x] Required standalone review/elegance gates before PR handoff. Evidence: standalone review telemetry `../../.runs/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d/cli/2026-04-15T15-14-04-331Z-0bebe30c/review/telemetry.json` reported `status: succeeded` / `review_outcome: bounded-success`; manual elegance pass kept the localized helper/gate/test shape unchanged.

## Progress Log
- 2026-04-15: Provider worker moved CO-193 Ready -> In Progress, recorded `parallelize_now`, launched docs child lane, rejected the resulting patch for intent drift, and authored a corrected parent-owned docs-first packet preserving reclaim/requeue as the primary behavior.
- 2026-04-15: Parent implemented the narrow provider handoff fix: released pending-reopen claims with inactive/null-status run evidence no longer cancel-block or self-exclude from fresh-discovery reclaim. The CO-191 regression, focused provider/control-runtime slices, full test suite, docs gates, stewardship, diff budget, and pack smoke are green.
- 2026-04-15: Standalone review completed with bounded-success telemetry after two earlier P2 findings were addressed; final elegance pass found no smaller safe implementation without weakening the proof gate or losing explicit regressions.
