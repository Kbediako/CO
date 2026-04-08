# PRD - CO STATUS: tighten post-CO-107 live EVENT truth and operator telemetry freshness

## Added by Bootstrap 2026-04-08

## Traceability
- Linear issue: `CO-109` / `bb472787-be60-44e3-ac83-a3c297dab470`
- Linear URL: https://linear.app/asabeko/issue/CO-109/co-status-tighten-post-co-107-live-event-truth-and-operator-telemetry
- Source issue: `CO-107` / `0001b15c-e8cc-4ce9-ad45-c898e326420e`

## Summary
- Problem Statement: post-`CO-107`, the remaining current-`main` STATUS gap is narrower and more specific. Live `EVENT` can still degrade to generic authoritative summaries such as `Provider worker turn is active.` even when richer worker or debug truth exists nearby, and operator-facing rate-limit or progress freshness is still cadence-bound because the dashboard rerenders every second while shared polling truth still updates on the `15000ms` provider interval.
- Desired Outcome: preserve the already-correct `Runtime`, `AGE / TURN`, 5-second rolling throughput, and remaining-based Linear complexity behavior, while tightening authoritative running-event truth and making telemetry freshness explicit enough that operators can tell the difference between local rerender cadence and actual source freshness.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish the bounded post-`CO-107` STATUS remainder without reopening already-correct runtime, throughput, or complexity semantics. The operator-facing running `EVENT` surface should usually show specific current work when proof, debug, or child-stream data already carries it, and the STATUS surface should expose how fresh rate-limit or progress data really is instead of letting a 1-second local redraw imply 1-second source truth.
- Success criteria / acceptance:
  - current live worker rows prefer richer authoritative `display_event` text from proof, debug, or child-stream state when it exists
  - generic text such as `Provider worker turn is active.` appears only when no richer authoritative message is available
  - operators can see explicit freshness or staleness age for rate-limit or progress telemetry, or the underlying source cadence is safely improved
  - current 1-second runtime ticking, 5-second rolling throughput, and remaining-based complexity semantics are preserved and regression-tested
  - closeout records which original complaints were still valid on `2026-04-08` versus already-correct behavior
- Constraints / non-goals:
  - do not reopen `CO-103`, `CO-107`, or `CO-108`
  - do not change the current 1-second local runtime ticking contract
  - do not change the current 5-second rolling throughput contract unless a separate approved lane does so
  - do not treat current Linear complexity as always `100%` exhausted without matching source truth
  - do not broaden into HTTP dashboard or attach-viewer redesign work

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO STATUS`
  - post-`CO-107`
  - live `EVENT` richness
  - operator telemetry freshness
  - Symphony parity for authoritative event/message handling
  - preserve current 1-second local runtime ticking
  - preserve current 5-second rolling throughput semantics
  - do not treat current Linear complexity as always-`100%`
  - `controlStatusDashboard.ts`
  - `compatibilityIssuePresenter.ts`
  - `controlRuntime.ts`
  - `providerPollingHealth.ts`
  - `controlServerPublicLifecycle.ts`
  - `status_dashboard.ex`
  - `orchestrator.ex`
- Protected terms / exact artifact and surface names:
  - `CO STATUS`
  - `EVENT`
  - `Runtime`
  - `AGE / TURN`
  - `display_event`
  - `Provider worker turn is active.`
  - `15000ms`
  - `5-second rolling throughput`
  - `remaining-based Linear complexity`
- Nearby wrong interpretations to reject:
  - “reopen the already-fixed live runtime ticking work”
  - “change throughput smoothing or window semantics in this lane”
  - “claim Linear complexity is always exhausted because an older complaint said so”
  - “fix this purely in the renderer without improving the authoritative projection path”
  - “broaden into general dashboard redesign or unrelated proof-refresh work”

## Parity / Alignment Matrix
- Current truth:
  - `controlStatusDashboard.ts` rerenders every second and already advances header `Runtime`, row `AGE / TURN`, and relative fallback event age locally
  - throughput is already a 5-second rolling token-delta window matching Symphony
  - current live source truth does not default Linear complexity to exhausted; the cited current artifact still shows remaining budget
  - `compatibilityIssuePresenter.ts` already filters some generic strings, but live `display_event` can still land on generic worker-progress summaries because the authoritative source path stays too thin
  - shared polling health exposes cadence and next-refresh countdown, but not explicit operator-facing source freshness age
- Reference truth:
  - Symphony terminal uses a 1-second rerender floor and a 5-second rolling TPS window
  - Symphony `EVENT` usefulness depends on specific authoritative message or progress text, with the renderer staying secondary
  - Symphony-style operator surfaces make timing semantics explicit instead of letting local redraw cadence stand in for source freshness
- Target truth / intended delta:
  - `display_event` becomes specific whenever richer authoritative worker, debug, or child-stream truth exists
  - operator-facing freshness becomes explicit for rate-limit or progress telemetry so local rerender cadence cannot masquerade as source freshness
  - already-correct runtime ticking, throughput, and complexity semantics stay intact
- Explicitly out-of-scope differences:
  - any new throughput smoothing or graphing
  - reopening `CO-103`, `CO-107`, or `CO-108`
  - attach-viewer or HTTP dashboard redesign

## Not Done If
- Live `EVENT` still usually degrades to generic text like `Provider worker turn is active.` when richer authoritative worker or progress text exists.
- Operators still cannot tell whether rate-limit or progress data is fresh versus merely rerendered locally.
- The implementation silently changes already-correct runtime ticking, throughput, or complexity semantics.
- The lane closes based only on renderer tweaks without proving the upstream source or projection path improved.

## Goals
- Tighten the authoritative running-event source path that feeds `display_event`.
- Surface explicit telemetry freshness or staleness age for rate-limit and progress truth.
- Preserve and document the already-correct 1-second runtime ticking, 5-second throughput window, and remaining-based complexity behavior.
- Add focused regression coverage and close with artifact-backed proof.

## Non-Goals
- Reopening the `CO-107` runtime-ticking fix without a new live repro.
- Redesigning throughput presentation beyond the existing rolling-window contract.
- Reopening `CO-103` rate-limit row work or `CO-108` next-refresh truth work.
- Treating current Linear complexity as exhausted without matching payload evidence.
- Broad HTTP dashboard or attach-viewer redesign work.

## Stakeholders
- Product: CO operators relying on truthful live `CO STATUS` while provider-worker sessions are active
- Engineering: control runtime, compatibility presenter, polling health, dashboard renderer, and provider-worker observability maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - running rows surface specific `display_event` text when authoritative non-generic worker progress exists
  - STATUS exposes explicit freshness age for rate-limit or progress telemetry
  - focused tests lock the preserved runtime, throughput, and complexity semantics
  - closeout records which original complaints remained valid on the audited `2026-04-08` baseline
- Guardrails / Error Budgets:
  - preserve 1-second local ticking exactly as shipped by `CO-107`
  - preserve 5-second rolling throughput semantics
  - preserve remaining-based complexity display unless new evidence proves a regression
  - prefer upstream or projection truth over new renderer heuristics

## User Experience
- Personas:
  - operator watching `CO STATUS` during an active provider-worker turn
  - reviewer cross-checking live output against payload truth and Symphony semantics
- User Journeys:
  - the operator sees a specific running `EVENT` instead of a generic heartbeat when richer worker truth exists
  - the operator can tell how fresh rate-limit and progress telemetry really is even while the UI rerenders every second
  - the reviewer can verify that runtime, throughput, and complexity behavior did not regress

## Technical Considerations
- Architectural Notes:
  - keep the fix bounded to authoritative projection and operator-facing freshness surfacing
  - prefer explicit freshness metadata over local inferred freshness
  - prefer authoritative running-event synthesis upstream instead of adding more dashboard-local guesswork
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/providerPollingHealth.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/tests/CompatibilityIssuePresenter.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/ControlStatusDashboard.test.ts`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/status_dashboard.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`

## Open Questions
- Is the smallest truthful freshness surface a new explicit projection field, or can the operator contract stay clear with existing authoritative timestamps surfaced directly?
- Should authoritative child-stream or child-lane summaries remain progress-only context, or should they participate directly in `display_event` selection when they are the freshest high-signal activity in the current turn?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: `codex-orchestrator docs-review` child stream passed `spec-guard` and `docs:check`, then failed only on the existing repo-wide `docs:freshness` stale-doc baseline (`stale docs: 282`, including Task Packet stale=`205`, Task Mirror stale=`41`, Report Only stale=`36`); manual fallback accepted for `linear-bb472787-be60-44e3-ac83-a3c297dab470`
- Design: N/A
