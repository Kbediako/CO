# ACTION_PLAN - CO STATUS: tighten post-CO-107 live EVENT truth and operator telemetry freshness

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: close the remaining post-`CO-107` STATUS gap by improving authoritative running-event truth and surfacing explicit operator freshness.
- Scope:
  - bootstrap the docs packet, registry mirrors, and single Linear workpad
  - run audited docs-review before implementation
  - land the smallest upstream projection fix for `display_event` truth and telemetry freshness
  - add focused tests, full validation, and proof-backed closeout
- Assumptions:
  - current 1-second ticking, 5-second throughput, and remaining-based complexity semantics are already correct and should remain unchanged

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO STATUS`, post-`CO-107`, live `EVENT` richness, operator telemetry freshness, `display_event`, `Provider worker turn is active.`, `providerPollingHealth.ts`, `compatibilityIssuePresenter.ts`, `controlStatusDashboard.ts`, `controlRuntime.ts`
- Not done if:
  - richer authoritative event truth still loses to generic worker-progress text
  - operators still cannot tell whether rate-limit or progress data is fresh
  - runtime, throughput, or complexity semantics drift
- Pre-implementation issue-quality review:
  - The current lane is narrower than the original complaint set. Current live runtime ticking, throughput decay to `0 tps`, and remaining-based Linear complexity truth are already correct on the audited `2026-04-08` baseline, so this implementation stays bounded to event-truth and freshness seams.

## Milestones & Sequencing
1) Register the `linear-bb472787-be60-44e3-ac83-a3c297dab470` docs packet, task mirrors, and single workpad source, then run the audited `docs-review` child stream and fold back any packet-only fixes.
2) Audit the current projection path across `compatibilityIssuePresenter.ts`, `providerPollingHealth.ts`, `controlRuntime.ts`, and `controlStatusDashboard.ts` against live `.runs` artifacts and the Symphony reference so the implementation stays source-first, not renderer-first.
3) Implement the smallest truthful change set for richer authoritative `display_event` selection and explicit freshness surfacing while preserving runtime, throughput, and complexity semantics.
4) Add focused regressions, run the required validation floor, perform standalone review plus an elegance pass, and refresh the workpad with final proof and verdicts on which original complaints remained valid.

## Dependencies
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/src/cli/control/providerPollingHealth.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/controlStatusDashboard.ts`
- `orchestrator/src/cli/control/providerIssueObservability.ts`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused compatibility presenter, control runtime, and dashboard regressions
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - keep the change bounded to projection and dashboard truth surfaces so reversion is a straightforward revert of the event/freshness slice

## Risks & Mitigations
- `docs/TASKS.md` was already at the line cap when this lane opened.
  - Mitigation: use the repo-supported archive fallback after registering the new snapshot.
- Generic event text may be coming from a thinner upstream proof surface rather than the dashboard.
  - Mitigation: prefer authoritative projection changes over renderer-only fixes and validate against real `.runs` artifacts.
- Freshness surfacing could accidentally imply local rerender freshness instead of source freshness.
  - Mitigation: derive freshness from authoritative timestamps only and lock the contract with focused tests.

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream failed only on the repo-wide `docs:freshness` stale-doc baseline after `spec-guard` and `docs:check` passed; manual fallback accepted
- Date: 2026-04-08
