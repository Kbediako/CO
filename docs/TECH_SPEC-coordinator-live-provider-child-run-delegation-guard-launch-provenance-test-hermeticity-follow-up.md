# TECH_SPEC: Coordinator Live Provider Child-Run Delegation-Guard Launch-Provenance Test Hermeticity Follow-Up

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Validate that the current tree already fixes the live-only delegation-guard test-stage failure under ambient provider launch provenance, then rerun the local floor and live provider replay until the next exact blocker is known.
- Scope:
  - docs-first registration for `1309`
  - delegated read-only analysis and docs-review
  - validation of the existing test hermeticity helper and any tightly coupled assertion checks
  - required validation plus a fresh live `CO-2` replay
- Constraints:
  - preserve real provider control-host launch provenance for actual runs
  - do not weaken runtime delegation-guard behavior repo-wide
  - prefer a test-harness fix over production-path edits unless evidence forces otherwise

## Technical Requirements
- Functional requirements:
  - nested `tests/delegation-guard.spec.ts` child invocations must not inherit ambient provider launch provenance unless a specific test explicitly opts in
  - explicit test overrides for provider launch source/token must remain deterministic even when the parent process already carries provider launch env
  - targeted delegation-guard coverage must pass under both ordinary local shells and provider-started parent env conditions
  - if the direct `npm run test` command still fails to return cleanly, the lane must capture the exact post-suite blocker instead of claiming a pass
  - the live `CO-2` replay must either get beyond `stage:test` or record the next exact blocker
- Non-functional requirements:
  - keep the diff minimal and localized
  - preserve current provider-intake and launch-provenance contracts for live runs
  - keep docs/checklists/evidence aligned with the actual blocker
- Interfaces / contracts:
  - delegation-guard child test env builder in [`tests/delegation-guard.spec.ts`](../tests/delegation-guard.spec.ts)
  - provider launch provenance validation in [`scripts/delegation-guard.mjs`](../scripts/delegation-guard.mjs)
  - control-host resume launch env injection in [`orchestrator/src/cli/controlHostCliShell.ts`](../orchestrator/src/cli/controlHostCliShell.ts)

## Architecture & Data
- Architecture / design adjustments:
  - validate the current-tree `cleanGuardOverrideEnv(...)` helper in `tests/delegation-guard.spec.ts`, which strips inherited orchestration/provider env before applying explicit test overrides
  - keep targeted regression coverage that simulates an ambient provider-started parent env
  - do not change production launch provenance validation unless new evidence proves the blocker exists outside the test harness
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - live provider replay against the existing control host
  - nested `node scripts/delegation-guard.mjs` dry-run invocations from Vitest

## Validation Plan
- Tests / checks:
  - docs-review for `1309`
  - targeted `npx vitest run tests/delegation-guard.spec.ts`
  - targeted delegation-guard coverage with ambient provider launch env injected
  - full validation floor:
    - `node scripts/delegation-guard.mjs`
    - `node scripts/spec-guard.mjs --dry-run`
    - `npm run build`
    - `npm run lint`
    - `npm run test`
    - `npm run docs:check`
    - `npm run docs:freshness`
    - `node scripts/diff-budget.mjs`
    - `npm run review`
    - `npm run pack:smoke`
  - explicit elegance review pass
- Rollout verification:
  - verify the control-host still accepts a signed `CO-2` replay
  - confirm provider-intake claim still maps the run correctly
  - confirm the child run gets beyond the prior `stage:test:failed` boundary or capture the next exact blocker
- Monitoring / alerts:
  - monitor the reused child-run manifest plus `commands/04-test.ndjson`
  - distinguish local targeted hermeticity regressions from live provider-state transitions

## Open Questions
- What keeps direct `npm run test` and the live reused `04-test` stage from returning after the final visible Vitest success line.
- Whether the next corrective lane belongs in CLI test/process handling rather than delegation-guard coverage.

## Approvals
- Reviewer: Waiver granted by the top-level orchestrator on 2026-03-20; the stacked docs-review wrapper remained non-terminal at the final review step. Evidence: `out/1309-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up/manual/20260320T011421Z-live-provider-test-hermeticity-closeout/14-review-waiver.md`
- Date: 2026-03-20
