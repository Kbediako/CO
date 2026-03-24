# Task Checklist - 1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback

- MCP Task ID: `1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback`
- Primary PRD: `docs/PRD-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md`
- TECH_SPEC: `tasks/specs/1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md`

## Docs-first
- [x] PRD drafted for the snapshot-only retry assignee-identity fallback lane. Evidence: `docs/PRD-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md`, `docs/TECH_SPEC-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md`.
- [x] `tasks/index.json` registers the `1322` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `1322` snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` registers the `1322` packet. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md`. Evidence: `.agent/task/1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback.md`.
- [x] docs-review approved the `1322` packet for implementation. Evidence: `.runs/1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback/cli/2026-03-24T04-26-45-333Z-744249da/manifest.json`.

## Investigation
- [x] Symphony baseline rechecked before implementation. Evidence: `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`.
- [x] Current CO live-resolver and snapshot-only ownership paths compared before code changes. Evidence: `orchestrator/src/cli/control/linearDispatchSource.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Current code-path audit identified the fallback seam: persisted snapshot preserves assignee identity but drops viewer identity. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`.

## Implementation
- [x] Persist viewer identity in provider intake claim state for tracked-issue writes without widening unrelated provider behavior. Evidence: `orchestrator/src/cli/control/providerIntakeState.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/linearGraphqlClient.ts`.
- [x] Rebuild snapshot-only queued-retry tracked issues with persisted viewer identity while keeping explicit foreign-assignee release behavior intact. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Add focused regressions for same-worker snapshot-only continuation, mismatched-auth conservative release, foreign-assignee release, and backward compatibility when persisted viewer identity is absent. Evidence: `orchestrator/tests/ProviderIntakeState.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: override accepted for this bounded worker run with `DELEGATION_GUARD_OVERRIDE_REASON='Subagent delegation is unavailable in this worker run under the current tool constraints; proceeding with a recorded override for the bounded CO-9 implementation lane.'`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: dry-run exits successfully; only unrelated stale specs remain at `tasks/specs/0909-orchestrator-run-reporting-consistency.md` and `tasks/specs/0977-shipped-feature-adoption-guidance.md`.
- [x] `npm run build`. Evidence: passed on 2026-03-24 from the current `1322-live-linear-snapshot-only-retry-assignee-identity-fallback` branch.
- [x] `npm run lint`. Evidence: passed on 2026-03-24 from the current branch.
- [ ] `npm run test`. Evidence: focused sanitized coverage passed for `orchestrator/tests/ControlHostCliShell.test.ts`, `orchestrator/tests/ProviderIntakeState.test.ts`, and `orchestrator/tests/ProviderIssueHandoff.test.ts` (`165/165` tests), and the sanitized full suite advanced well past the prior env-sensitive `RuntimeProvider.test` failure mode, but the local process again tailed into a non-terminal lingering-handle state instead of returning a clean terminal exit.
- [x] `npm run docs:check`. Evidence: passed on 2026-03-24 after the auth-fingerprint docs packet refresh.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 2907 docs, 2917 registry entries`.
- [x] `node scripts/diff-budget.mjs`. Evidence: override accepted with `DIFF_BUDGET_OVERRIDE_REASON='CO-9 requires the mandatory docs-first packet plus focused snapshot-only retry regressions in the existing ProviderIssueHandoff suite; the auth-fingerprint safeguard is the smallest correct way to keep same-worker retries eligible without trusting stale viewer identity under a different Linear token.'`.
- [ ] `npm run review`. Evidence: manifest-backed review launched against `.runs/1322-coordinator-live-linear-snapshot-only-retry-assignee-identity-fallback/cli/2026-03-24T04-26-45-333Z-744249da/manifest.json`, but the bounded reviewer drifted for 5+ minutes without surfacing a concrete finding or returning a clean terminal verdict, so the run was stopped and recorded as no-new-finding review drift.
- [x] `npm run pack:smoke` if downstream-facing surfaces are touched. Evidence: passed on 2026-03-24.

## Delivery
- [ ] Open PR for `1322`, handle feedback, and wait for required checks to reach terminal green.
- [ ] Attach the PR to Linear and refresh the workpad before handing off to `In Review`.
