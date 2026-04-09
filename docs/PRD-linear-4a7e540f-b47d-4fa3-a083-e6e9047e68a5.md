# PRD - CO STATUS: preserve canonical provider-worker activity truth and EVENT provenance end to end

## Added by Bootstrap 2026-04-09

## Traceability
- Linear issue: `CO-112` / `4a7e540f-b47d-4fa3-a083-e6e9047e68a5`
- Linear URL: https://linear.app/asabeko/issue/CO-112/co-status-preserve-canonical-provider-worker-activity-truth-and-event
- Source issue: `CO-109` / `bb472787-be60-44e3-ac83-a3c297dab470`

## Summary
- Problem Statement: post-`CO-109`, current `main` still loses truthful current-turn provider-worker activity before STATUS rendering. `selectedRunProjection.ts` can still promote derived progress text into `latestEvent`, `providerIssueObservability.ts` still falls back from thin proof truth into generic worker-progress summaries, and `providerLinearWorkerRunner.ts` still persists only narrowed `last_event` / `last_message` without a canonical current-turn activity object that survives proof persistence and later hydration.
- Desired Outcome: preserve raw current-turn activity truth centrally and late-humanize it, Symphony-style. STATUS should keep the most truthful running `EVENT` text whenever richer current-turn activity exists in stdout JSONL, session-log hydration, or child-stream / child-lane summaries, while exposing provenance and freshness so operators can see why a candidate won.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): implement the post-`CO-109` source-truth seam instead of adding more renderer heuristics. Canonical provider-worker current-turn activity should survive persistence and hydration, derived summaries should become explicit candidates instead of silent replacements, and STATUS/debug surfaces should show both the chosen message and why it was chosen.
- Success criteria / acceptance:
  - running provider-worker issues show the most truthful current-turn `EVENT` instead of generic fallback text whenever richer activity exists
  - canonical current-turn activity survives proof persistence and session-log hydration across refreshes
  - generic phase text such as `turn running` or `Provider worker turn is active.` appears only as terminal fallback
  - STATUS/debug surfaces expose chosen source, candidate set, rejection reasons, and freshness timestamps
  - the implementation stays message-first and Symphony-aligned, with raw truth upstream and humanization late
  - focused regressions cover the null-`last_message` plus rich-child-summary failure shape and repeated hydration
- Constraints / non-goals:
  - do not reopen rate-limit formatting, stage mapping, attach scrolling, merge closeout, or unrelated Linear cooldown lanes
  - do not broaden this into a dashboard redesign
  - do not solve the issue only by changing `controlStatusDashboard.ts`

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO STATUS`
  - `preserve canonical provider-worker activity truth`
  - `EVENT provenance`
  - `canonical current-turn activity`
  - `{ event, message_or_payload, recorded_at, source, turn_id, session_id }`
  - `stdout JSONL first`
  - `session-log hydration second`
  - `child-stream / child-lane summaries as explicit derived candidates`
  - `selectedRunProjection`
  - `providerIssueObservability`
  - `providerLinearWorkerRunner`
  - `compatibilityIssuePresenter`
  - `controlStatusDashboard.ts`
- Protected terms / exact artifact and surface names:
  - `EVENT`
  - `current-turn activity`
  - `last_event`
  - `last_message`
  - `display_event`
  - `turn running`
  - `Provider worker turn is active.`
  - `source_updated_at`
  - `message_recorded_at`
  - `summary_recorded_at`
- Nearby wrong interpretations to reject:
  - “fix the symptom only in the dashboard”
  - “treat child summaries as silent replacements instead of explicit derived candidates”
  - “persist only narrowed `last_event` / `last_message` and rely on later heuristics”
  - “reopen adjacent rate-limit or merge-closeout lanes because proof is being touched”

## Parity / Alignment Matrix
- Current truth:
  - `controlRuntime.ts` already stays projection-first and is not inventing the generic text itself
  - `selectedRunProjection.ts` can still replace raw current-turn activity with derived `providerDebugSnapshot.progress`
  - `providerIssueObservability.ts` still ranks thin proof truth, child summaries, and generic phase text without a canonical activity object or explicit provenance set
  - `providerLinearWorkerRunner.ts` persists narrowed proof fields and session-log hydration restores tokens and ids but not richer activity provenance
  - `compatibilityIssuePresenter.ts` and `controlStatusDashboard.ts` reject some generic text, but they cannot recover truth that was already collapsed upstream
- Reference truth:
  - Symphony keeps raw last-message / last-event truth in orchestrator state and humanizes later in presenter/dashboard layers
  - derived summaries remain explicit candidates rather than silently replacing canonical source truth
- Target truth / intended delta:
  - a canonical current-turn activity object is persisted and rehydrated end to end
  - candidate ranking becomes explicit, provenance-bearing, and freshness-aware
  - dashboard rendering remains formatter-oriented over authoritative fields
- Explicitly out-of-scope differences:
  - rate-limit semantics
  - runtime ticking or throughput redesign
  - attach scrolling and viewer behavior
  - merge closeout or shared-root reconciliation changes

## Not Done If
- `EVENT` still shows `turn running` or `Provider worker turn is active.` while richer activity exists elsewhere in live artifacts.
- winning `EVENT` text still depends on lossy progress summaries because raw current-turn activity is not persisted canonically.
- operators still cannot inspect why a particular `EVENT` won or which richer candidates were rejected.

## Goals
- Add a canonical current-turn activity contract that survives proof persistence and later hydration.
- Refactor STATUS selection to use ranked candidates with explicit provenance and freshness.
- Keep the renderer thin and preserve message-first upstream truth.
- Add focused regression coverage for the known null-`last_message` and hydration-refresh failure shapes.

## Non-Goals
- Reopening `CO-103`, `CO-107`, or `CO-109` presentation-only fixes.
- Solving the issue by adding more string suppression to `controlStatusDashboard.ts`.
- Changing unrelated provider-worker retry, merge, or rate-limit behavior.

## Stakeholders
- Product: CO operators depending on truthful running `EVENT` output during active provider-worker turns
- Engineering: provider-worker proof persistence, selected-run projection, observability, and STATUS presenter maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - authoritative running `EVENT` remains specific when richer current-turn activity exists
  - refreshes and hydration preserve the same winner instead of collapsing back to generic worker-progress text
  - debug output exposes candidate source, rejection reasoning, and freshness timestamps without ad hoc artifact spelunking
- Guardrails / Error Budgets:
  - keep `controlStatusDashboard.ts` thin and formatter-oriented
  - prefer canonical current-turn activity over derived progress summaries
  - preserve current runtime, throughput, and unrelated STATUS semantics

## User Experience
- Personas:
  - operator watching live `CO STATUS`
  - reviewer comparing output against proof and session-log truth
- User Journeys:
  - the operator sees the actual current work message instead of a generic heartbeat
  - the operator can inspect why that message won and how fresh it is
  - the reviewer can validate persistence and hydration against known failure fixtures

## Technical Considerations
- Architectural Notes:
  - canonical activity should be sourced from stdout JSONL first and session-log hydration second
  - child-stream and child-lane summaries remain explicit derived candidates, not silent overrides
  - provenance and freshness should travel through projection and compatibility surfaces, not be reconstructed only in the dashboard
- Dependencies / Integrations:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts`
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `orchestrator/tests/CompatibilityIssuePresenter.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`

## Open Questions
- Should the canonical activity payload carry a structured `payload` field in addition to the surfaced human message, or is `message_or_payload` best represented as a string plus provenance metadata in this lane?
- Which debug surface should own candidate rejection reasons so both STATUS and observability APIs stay aligned without duplicating ranking logic?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: Approved via `codex-orchestrator docs-review` child stream `co-112-docs-review` (`clean-success`) with manifest `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5-co-112-docs-review/cli/2026-04-09T05-39-47-373Z-741ea904/manifest.json` and executed review telemetry at `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5-co-112-docs-review/cli/2026-04-09T05-39-47-373Z-741ea904/review/telemetry.json`
- Design: N/A
