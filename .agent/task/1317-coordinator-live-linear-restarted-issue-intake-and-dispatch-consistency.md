# Task Checklist - 1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency

- MCP Task ID: `1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency`
- Primary PRD: `docs/PRD-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md`
- TECH_SPEC: `tasks/specs/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md`

## Docs-first
- [x] PRD drafted for the post-PR-283 live Linear restarted-issue intake and dispatch consistency follow-up. Evidence: `docs/PRD-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md`.
- [x] TECH_SPEC drafted for the same bounded follow-up. Evidence: `tasks/specs/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md`, `docs/TECH_SPEC-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md`.
- [x] ACTION_PLAN drafted for the same bounded follow-up. Evidence: `docs/ACTION_PLAN-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md`.
- [x] `tasks/index.json` registers the `1317` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `1317` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md`. Evidence: `.agent/task/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md`.
- [x] docs-review recorded for `1317`. Evidence: `.runs/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/cli/2026-03-22T04-14-00-475Z-008b6375/manifest.json`.
- [x] Standalone pre-implementation review approval captured before implementation. Evidence: `.runs/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/cli/2026-03-22T04-14-00-475Z-008b6375/manifest.json`.
- [x] Current-state truth is explicit before implementation: the handoff reported a stale `CO-1` mismatch, but parent recheck on current `main` at `2026-03-22T04:05:10.980Z` no longer reproduces it. Evidence: `.runs/local-mcp/cli/control-host/linear-advisory-state.json`, `.runs/local-mcp/cli/control-host/provider-intake-state.json`, `.runs/linear-8c4a8de9-45b2-40ef-b295-bd37a21d1155/cli/2026-03-22T04-01-03-150Z-d6d1d049/manifest.json`.
- [x] Implementation-docs archive policy reviewed for this active lane; archival stays deferred until archive criteria are met. Evidence: `docs/implementation-docs-archive-policy.json`.

## Investigation
- [x] Persisted advisory/intake files and authenticated `/api/v1/dispatch` queried before any implementation change. Evidence: `.runs/local-mcp/cli/control-host/linear-advisory-state.json`, `.runs/local-mcp/cli/control-host/provider-intake-state.json`, `.runs/local-mcp/cli/control-host/control_endpoint.json`, `.runs/local-mcp/cli/control-host/control_auth.json`, `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T042007Z-live-recheck/00-summary.md`, `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T042007Z-live-recheck/01-dispatch.json`.
- [x] Read-only live evidence/contract audit summarized. Evidence: `.runs/local-mcp/cli/control-host/linear-advisory-state.json`, `.runs/local-mcp/cli/control-host/provider-intake-state.json`, `.runs/local-mcp/cli/control-host/control_endpoint.json`, `.runs/local-mcp/cli/control-host/control_auth.json`, `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T042007Z-live-recheck/00-summary.md`, `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T042007Z-live-recheck/01-dispatch.json`.
- [x] Read-only dispatch response-shaping audit summarized. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/trackerDispatchPilot.ts`, `orchestrator/tests/ControlServer.test.ts`, `orchestrator/tests/TrackerDispatchPilot.test.ts`.
- [x] Root-cause classification recorded truthfully as intake replay, dispatch shaping, single projection bug, or no current bug. Evidence: current live persisted-intake replay not reproduced; remaining repo-side bug confirmed as stale dispatch response shaping via `createControlRuntimeSnapshot().readDispatchEvaluation()` and `evaluateTrackerDispatchPilotAsync()`.

## Implementation
- [x] Smallest correct fix implemented if current code still needs it. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/trackerDispatchPilot.ts`.
- [x] Provider-intake and execution-authority boundaries preserved. Evidence: no provider-intake claim, webhook, or execution-authority code paths changed.
- [x] No `CO-2` identifier leak remains when `CO-1` is the live tracked issue. Evidence: `orchestrator/tests/ControlServer.test.ts`, `orchestrator/tests/TrackerDispatchPilot.test.ts`.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T044750Z-live-restart-proof/02-validation-summary.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T044750Z-live-restart-proof/02-validation-summary.md`.
- [x] `npm run build`. Evidence: `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T044750Z-live-restart-proof/02-validation-summary.md`.
- [x] `npm run lint`. Evidence: `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T044750Z-live-restart-proof/02-validation-summary.md`.
- [x] `npm run test`. Evidence: `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T044750Z-live-restart-proof/02-validation-summary.md`.
- [x] `npm run docs:check`. Evidence: `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T044750Z-live-restart-proof/02-validation-summary.md`.
- [x] `npm run docs:freshness`. Evidence: `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T044750Z-live-restart-proof/02-validation-summary.md`, `docs/docs-freshness-registry.json`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T044750Z-live-restart-proof/02-validation-summary.md`.
- [x] `npm run review`. Evidence: `.runs/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/cli/2026-03-22T04-14-00-475Z-008b6375/review/output.log`, `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T044750Z-live-restart-proof/02-validation-summary.md`.
- [x] `npm run pack:smoke` because `/api/v1/dispatch` is downstream-facing. Evidence: `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T044750Z-live-restart-proof/02-validation-summary.md`.
- [x] Live Linear verification rerun on `CO-1` after the implementation decision is made. Evidence: `.runs/local-mcp/cli/control-host/control_endpoint.json`, `.runs/local-mcp/cli/control-host/control_auth.json`, `.runs/local-mcp/cli/control-host/linear-advisory-state.json`, `.runs/local-mcp/cli/control-host/provider-intake-state.json`, `.runs/local-mcp/cli/control-host-tmux.log`, `.runs/linear-8c4a8de9-45b2-40ef-b295-bd37a21d1155/cli/2026-03-22T04-46-30-471Z-ba4c6122/manifest.json`, `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T044750Z-live-restart-proof/00-summary.md`, `out/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/manual/20260322T044750Z-live-restart-proof/01-dispatch.json`.
- [ ] Unresolved actionable review threads are `0`, or a waiver is recorded with evidence before merge. Evidence: PR `#284` review thread status or waiver artifact.
