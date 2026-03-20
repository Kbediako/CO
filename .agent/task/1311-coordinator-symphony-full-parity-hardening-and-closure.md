# Task Checklist - 1311-coordinator-symphony-full-parity-hardening-and-closure

- MCP Task ID: `1311-coordinator-symphony-full-parity-hardening-and-closure`
- Primary PRD: `docs/PRD-coordinator-symphony-full-parity-hardening-and-closure.md`
- TECH_SPEC: `tasks/specs/1311-coordinator-symphony-full-parity-hardening-and-closure.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-full-parity-hardening-and-closure.md`

## Docs-first
- [x] PRD drafted for the full parity hardening and closure lane. Evidence: `docs/PRD-coordinator-symphony-full-parity-hardening-and-closure.md`.
- [x] TECH_SPEC drafted with the closure scope, phase ordering, and parity authority posture. Evidence: `tasks/specs/1311-coordinator-symphony-full-parity-hardening-and-closure.md`.
- [x] ACTION_PLAN drafted with the docs, workspace, lifecycle, and observability sequencing. Evidence: `docs/ACTION_PLAN-coordinator-symphony-full-parity-hardening-and-closure.md`.
- [x] Deliberation/findings captured for the new closure lane. Evidence: `docs/findings/1311-symphony-full-parity-hardening-and-closure-deliberation.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new closure-lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1311-coordinator-symphony-full-parity-hardening-and-closure.md`. Evidence: `.agent/task/1311-coordinator-symphony-full-parity-hardening-and-closure.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Delegation scout evidence preserved for the closure lane. Evidence: subagent streams `019d0ab1-0fab-72f1-a321-7322cbc16734`, `019d0ab1-0aed-7c70-8ac2-4cf5f395df62`, `019d0ab0-fd2f-7182-b17f-41c74a5ee170`.
- [x] docs-review approval captured for `1311`. Evidence: `.runs/1311-coordinator-symphony-full-parity-hardening-and-closure/cli/2026-03-20T10-25-11-174Z-514b632e/manifest.json`.

## Implementation
- [x] Deterministic per-issue workspace identity and child-run execution confinement landed. Evidence: `orchestrator/src/cli/run/workspacePath.ts`, `orchestrator/src/cli/controlHostCliShell.ts`, `orchestrator/src/cli/run/manifest.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/tests/WorkspacePath.test.ts`, `orchestrator/tests/ControlHostCliShell.test.ts`, `orchestrator/tests/Manifest.test.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] Provider lifecycle state is authoritative across claim, running, retry, completion, and release. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/providerIntakeState.ts`, `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ControlServerPublicLifecycle.test.ts`.
- [x] Running-issue reconcile and stop/release behavior landed for provider state transitions. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/authenticatedRouteComposition.ts`, `orchestrator/src/cli/control/controlAuthenticatedRouteHandoff.ts`, `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] Continuation behavior landed while the issue remains active without depending on a fresh provider event. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Truthful observability/read-model hardening landed for workspace/status surfaces without fabricating unsupported counters. Evidence: `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/src/cli/control/selectedRunPresenter.ts`, `orchestrator/tests/ObservabilityApiController.test.ts`, `orchestrator/tests/UiDataController.test.ts`.
- [ ] Issue eligibility breadth is aligned enough to support a truthful full-parity closure claim.
- [ ] Full authoritative observability parity landed for live turn/token/rate-limit/retry counters.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: `node scripts/delegation-guard.mjs --task 1311-coordinator-symphony-full-parity-hardening-and-closure`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `node scripts/spec-guard.mjs --dry-run`.
- [x] `npm run build`. Evidence: `npm run build`.
- [x] `npm run lint`. Evidence: `npm run lint`.
- [x] `npm run test`. Evidence: full suite passed `282/282` files and `1974/1974` tests.
- [x] `npm run docs:check`. Evidence: `npm run docs:check`.
- [x] `npm run docs:freshness`. Evidence: `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run docs:freshness`.
- [x] `node scripts/diff-budget.mjs`. Evidence: override recorded in `out/1311-coordinator-symphony-full-parity-hardening-and-closure/manual/20260320T114326Z-closeout/09-diff-budget-override.md`.
- [x] `npm run review`. Evidence: review executed, no concrete findings emitted, and the bounded wrapper waiver is recorded in `out/1311-coordinator-symphony-full-parity-hardening-and-closure/manual/20260320T114326Z-closeout/14-review-waiver.md`.
- [x] `npm run pack:smoke` if required by touched surfaces. Evidence: `npm run pack:smoke`.
- [ ] Live provider parity proof against the existing control host captured.
- [x] Explicit elegance review pass recorded. Evidence: `out/1311-coordinator-symphony-full-parity-hardening-and-closure/manual/20260320T114326Z-closeout/12-elegance-review.md`.
