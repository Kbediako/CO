# PRD - CO STATUS: make Next refresh truthful under Linear cooldown and shared-budget poll suppression

## Added by Bootstrap 2026-04-07

## Traceability
- Linear issue: `CO-108` / `e09ce1db-e2f8-4fe7-9509-9f61a02f4844`
- Linear URL: https://linear.app/asabeko/issue/CO-108/co-status-make-next-refresh-truthful-under-linear-cooldown-and-shared
- Related lanes: `CO-103`, `CO-106`, `CO-81`, `CO-107`

## Summary
- Problem Statement: under shared Linear cooldown, `CO STATUS` can still render `Next refresh` from stale `polling.next_poll_in_ms` or from renderer-local `checking` heuristics, even when the same payload already carries a stricter shared-budget cooldown window. This makes the summary line untrustworthy during the exact operator state where the rate-limit row and running event are warning about deferred polling.
- Desired Outcome: the authoritative next tracked-issue refresh projection comes from the shared-budget plus polling layer. `Next refresh` must show the real next eligible attempt during budget cooldown, must stop showing `checking now...` while suppression is still active, and must preserve a clear operator distinction between cooldown suppression, a real in-flight poll attempt, and an ordinary scheduled countdown.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): land the smallest truthful fix for `CO STATUS` so the operator-facing `Next refresh` line agrees with the same shared Linear cooldown/reset state that already drives rate-limit exhaustion and deferred-polling behavior. Keep the work in the polling/projection path, not a broader STATUS redesign, and cover both requests-exhausted and complexity-exhausted suppression.
- Success criteria / acceptance:
  - under active shared-budget cooldown, `Next refresh` matches the projected next eligible refresh time and does not overstate beyond the authoritative cooldown or reset window
  - if the active operator state says polling is deferred until reset, the `Next refresh` line is consistent with that same suppression window
  - `checking now...` only appears for a real in-flight poll attempt, not during cooldown suppression
  - requests-exhausted and complexity-exhausted paths are both covered
  - restart or rehydrate preserves truthful `Next refresh` output from persisted shared-budget state
  - focused tests cover projection inputs plus dashboard output, including cooldown countdown, cooldown-to-checking transition, and stale mismatch regression
- Constraints / non-goals:
  - do not reopen broader `CO STATUS` parity or dashboard redesign work from `CO-103` or `CO-107`
  - do not broaden into `CO-106` user-scoped budget identity, endpoint-aware buckets, reservations, or smoothing
  - do not reopen `CO-81` stale-cooldown recovery beyond preserving truthful persisted output
  - keep the fix centered on summary-line and polling truth, not unrelated renderer sections

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO STATUS`
  - `Next refresh`
  - `linear requests exhausted; polling deferred until reset`
  - `linear complexity budget exhausted; polling deferred until reset`
  - `checking now...`
  - `shared-budget poll suppression`
  - `linearBudgetState.ts`
  - `providerPollingHealth.ts`
  - `controlServerPublicLifecycle.ts`
  - `controlStatusDashboard.ts`
- Protected terms / exact artifact and surface names:
  - `Next refresh`
  - `Rate Limits`
  - `checking now...`
  - `cooldown_until`
  - `next_poll_in_ms`
  - `ControlPollingHealthPayload`
  - `CO STATUS`
- Nearby wrong interpretations to reject:
  - "fix only the dashboard text and leave the projected polling contract inconsistent"
  - "treat any `checking: true` state as stronger than an active cooldown"
  - "solve this by reopening broader rate-limit or event-parity work"
  - "accept a next-refresh countdown that can outlive the authoritative cooldown window"

## Parity / Alignment Matrix
- Current truth:
  - `linearBudgetState.ts` already computes shared-budget cooldown state and the next scheduled polling interval
  - `providerPollingHealth.ts` currently exposes raw `checking`, `next_poll_at`, and `next_poll_in_ms`, but not an authoritative operator-facing next-refresh mode
  - `controlRuntime.ts` persists and rehydrates the raw polling snapshot
  - `controlStatusDashboard.ts` renders `Next refresh` from `polling.checking` or `polling.next_poll_in_ms`, so cooldown suppression can be masked or overstated
  - `compatibilityIssuePresenter.ts` already synthesizes budget exhaustion event text from polling plus budget state, but still keys its countdown off raw `next_poll_in_ms`
- Reference truth:
  - the shared Linear budget cooldown or reset window is the authoritative upper bound for the next eligible tracked-issue refresh attempt
  - operator surfaces should distinguish suppression, active checking, and ordinary scheduling without renderer-local guesswork
- Target truth / intended delta:
  - polling projection exposes an authoritative next-refresh state and countdown derived from shared-budget cooldown before renderer decisions
  - `CO STATUS` summary lines and budget exhaustion event text reuse that projected truth
  - restart or rehydrate preserves the same truthful next-refresh output from persisted polling plus budget state
- Explicitly out-of-scope differences:
  - `CO-107` agents/runtime or broader event-parity work
  - `CO-103` remaining STATUS layout or stage/event wording beyond this next-refresh truth gap
  - `CO-106` broader shared-budget hardening
  - unrelated dashboard or `/ui` redesign

## Not Done If
- `Next refresh` can still exceed the authoritative cooldown or reset window while shared-budget cooldown is active.
- `checking now...` still appears while the same payload says cooldown suppression is active.
- requests-exhausted and complexity-exhausted suppression do not both render truthful next-refresh output.
- restart or rehydrate drops back to stale `next_poll_in_ms` truth when persisted shared-budget state still shows cooldown.
- tests do not lock the cooldown countdown, cooldown-to-checking transition, and stale mismatch regression.

## Goals
- Project authoritative next-refresh truth from shared-budget plus polling state before formatting.
- Keep operator-visible distinctions between cooldown suppression, real in-flight polling, and ordinary scheduled polling.
- Preserve truthful next-refresh output across persisted polling snapshots and rehydrate.
- Add focused regressions without broadening the lane.

## Non-Goals
- Reworking general STATUS parity, rate-limit formatting, or workflow-stage rendering.
- Changing shared-budget identity, endpoint bucket semantics, or reservation policy.
- Reopening stale-cooldown recovery beyond truthful display preservation.

## Stakeholders
- Product: CO operators relying on `CO STATUS` during Linear budget exhaustion
- Engineering: control polling, shared-budget, control-runtime, and STATUS renderer maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - `Next refresh` countdown matches the actual next eligible refresh attempt under active cooldown
  - `checking now...` appears only during real in-flight polling
  - persisted polling state reproduces the same truthful output after restart or rehydrate
  - focused tests prove requests and complexity suppression plus the cooldown-to-checking boundary
- Guardrails / Error Budgets:
  - preserve existing shared-budget and scheduling behavior unless a narrower truth bug requires a projection change
  - keep renderer logic thin and projection-first
  - prefer additive payload fields over changing unrelated polling semantics

## User Experience
- Personas: operator watching `CO STATUS` during shared Linear cooldown; reviewer verifying rate-limit and polling truth from snapshot data
- User Journeys:
  - operator sees exhausted Linear requests or complexity and `Next refresh` immediately reflects the same cooldown or reset window
  - operator sees `checking now...` only when a real polling attempt starts after cooldown expires
  - reviewer can confirm persisted polling snapshots reproduce the same truthful display after restart

## Technical Considerations
- Architectural Notes:
  - keep `linearBudgetState.ts` authoritative for shared-budget cooldown or reset truth
  - extend `providerPollingHealth.ts` to project an operator-facing next-refresh mode and countdown from budget cooldown, scheduled next poll, and real in-flight activity
  - update `controlRuntime.ts` to normalize and preserve the projected fields through persisted polling snapshots
  - update `compatibilityIssuePresenter.ts` and `controlStatusDashboard.ts` to consume projected next-refresh truth instead of raw renderer heuristics
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/linearBudgetState.ts`
  - `orchestrator/src/cli/control/providerPollingHealth.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - `orchestrator/tests/LinearBudgetState.test.ts`
  - `orchestrator/tests/ControlServerPublicLifecycle.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/CompatibilityIssuePresenter.test.ts`
  - `orchestrator/tests/ControlStatusDashboard.test.ts`

## Open Questions
- Is a small `next_refresh_state` plus `next_refresh_in_ms` projection enough, or does the operator surface also need an explicit projected timestamp field?
- Should complexity exhaustion adopt the same explicit `next tracked-issue refresh at ...` wording when the projected countdown is known, or is summary-line truth alone sufficient for this lane?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: pending `codex-orchestrator linear child-stream --pipeline docs-review`
- Design: N/A
