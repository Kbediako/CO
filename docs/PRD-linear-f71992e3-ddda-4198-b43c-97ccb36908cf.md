# PRD - CO STATUS: finish post-CO-97 rate-limit reset truth and Symphony-parity event/stage text

## Added by Bootstrap 2026-04-07

## Traceability
- Linear issue: `CO-103` / `f71992e3-ddda-4198-b43c-97ccb36908cf`
- Linear URL: https://linear.app/asabeko/issue/CO-103/co-status-finish-post-co-97-rate-limit-reset-truth-and-symphony-parity
- Source issue: `CO-97` / `bd8f3cc3-0871-470b-8c86-2f3815b326f2`

## Summary
- Problem Statement: current `main` already combines authoritative Codex and shared Linear budget data upstream, but the operator-facing `CO STATUS` surface still projects and renders several truths incorrectly. The combined rate-limit row still uses `% / window` formatting for non-exhausted buckets, the live surface still advertises `Dashboard:`, controls are still visually lumped into `Backoff queue`, the running `STAGE` column still collapses active Linear workflow state to generic `running`, and the running `EVENT` column still depends on renderer-side fallback logic that leaves generic text like `turn running` and `Provider worker turn is active.` on the live operator surface.
- Desired Outcome: finish the post-`CO-97` STATUS parity/rendering remainder without reopening adjacent lanes. `CO STATUS` should stay snapshot/projection-first, render the steady-state compact `Codex ... || Linear ...` rate-limit row, preserve the current Linear state verbatim in `STAGE`, surface richer truthful `EVENT` text for shared and CO-specific operator semantics, remove the default `Dashboard:` line, and render a separate `Status controls` section below `Backoff queue`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete the remaining STATUS truth gap after `CO-97` by using Symphony as the handling-model reference, but keep the implementation bounded to operator-facing projection/rendering seams that already sit on top of the real Codex and Linear budget substrate. The work should preserve what is already correct on current `main`, avoid reopening `CO-98/99/100/81/101/17`, and prove the new output against current repo truth instead of layering new fallback-heavy renderer logic.
- Success criteria / acceptance:
  - steady-state `Rate Limits` renders as one compact row with `Codex ... || Linear ...`
  - non-exhausted buckets show percent remaining, while exhausted buckets switch to `resets Xm`
  - the rendered Linear row fields are exactly `requests` and `complexity`
  - running `STAGE` shows the current Linear state instead of generic runtime/provider phase
  - running `EVENT` becomes truthful and specific for shared concepts like session/turn/token/rate-limit activity and for CO-specific budget/backoff/review-drain semantics
  - the live `CO STATUS` surface no longer renders `Dashboard:`
  - controls render in a separate `Status controls` section below `Backoff queue`
  - proof includes renderer output plus a live payload cross-check against authoritative projected values
- Constraints / non-goals:
  - do not rebuild `linearBudgetState.ts` / `linearDispatchSource.ts` / `controlServerPublicLifecycle.ts` shared-budget mechanics
  - do not reopen `CO-98`, `CO-99`, `CO-100`, `CO-81`, `CO-101`, or `CO-17`
  - do not broaden into unrelated dashboard redesign or `/ui` work
  - do not claim target budget/backoff strings already shipped on validated `main` unless that changes during this lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO STATUS`
  - `Symphony handling model: authoritative snapshot/projection first, formatter second`
  - `STAGE must show current Linear stage/state`
  - `EVENT must reach Symphony-level specificity for shared concepts plus truthful CO-specific operational events`
  - `compact one-line rate-limit row with Codex ... || Linear ...`
  - `no HTTP dashboard line in CO STATUS`
  - `separate Status controls section below Backoff queue`
  - `controlStatusDashboard.ts`
  - `compatibilityIssuePresenter.ts`
  - `selectedRunProjection.ts`
  - `controlRuntime.ts`
  - `linearBudgetState.ts`
  - `linearDispatchSource.ts`
- Protected terms / exact artifact and surface names:
  - `CO STATUS`
  - `Rate Limits`
  - `STAGE`
  - `EVENT`
  - `Dashboard:`
  - `Status controls`
  - `Backoff queue`
  - `In Progress`
  - `requests`
  - `complexity`
  - `5-hour`
  - `weekly`
- Nearby wrong interpretations to reject:
  - “rebuild the shared Linear budget subsystem”
  - “fix only the renderer and leave projection truth generic”
  - “keep `running` in `STAGE` because it is close enough to `In Progress`”
  - “the old `% / window` rate-limit text is an acceptable steady-state operator row”
  - “budget exhaustion/backoff examples are optional wording rather than display targets”
  - “finish the lane by reviving the unfinished HTTP dashboard”

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth:
  - `controlRuntime.ts` already combines authoritative Codex and Linear budget data upstream
  - `linearBudgetState.ts` already persists shared Linear budget state and feeds polling/backoff
  - `controlStatusDashboard.ts` still formats combined buckets as `% remaining / window`, still inserts `Dashboard:` on the live surface, and still renders controls under the backoff section
  - `selectedRunProjection.ts` still collapses active `In Progress` / started states to generic `running`
  - `compatibilityIssuePresenter.ts` and `controlStatusDashboard.ts` still leave too much operator event truth to renderer-side fallback logic
  - the exact target budget/backoff event strings in this issue do not ship on validated current `main`
- Reference truth:
  - Symphony treats snapshot/projection as authoritative and keeps the dashboard formatter secondary
  - Symphony running rows use projected workflow state for `STAGE`
  - Symphony humanizes session/turn/token/rate-limit/approval/tool/command activity to operator-useful text instead of generic runtime fallbacks
- Target truth / intended delta:
  - authoritative operator-facing `STAGE` and `EVENT` truth is computed upstream first, with the dashboard acting mainly as a formatter
  - `STAGE` preserves the current Linear state for active work
  - `EVENT` carries richer truthful shared semantics plus CO-specific budget/backoff/review-drain text
  - the main rate-limit row renders as `Codex ... || Linear ...`, percent-remaining until exhaustion, and `resets Xm` only for the exhausted bucket
  - the live surface contains no `Dashboard:` line and renders a separate `Status controls` section
- Explicitly out-of-scope differences:
  - `CO-98` root-host telemetry restoration and proof/session-log hydration work
  - `CO-100` merged closeout/shared-root reconciliation logic
  - `CO-81` intake/cooldown recovery
  - `CO-101` provider-worker leverage policy
  - `CO-17` provider-worker reasoning selection
  - unrelated UI/dashboard redesign beyond the bounded STATUS surface contract

## Not Done If
- A bucket with remaining budget does not show percent remaining.
- An exhausted bucket does not show `resets Xm`.
- Codex and Linear do not render on the same row with a visible divider.
- Linear `requests` and `complexity` are not both present on that row.
- `STAGE` does not map to the current Linear state.
- `EVENT` still falls back to generic `turn running` / `Provider worker turn is active.` text where richer truthful detail is available.
- Explicit operator-facing budget exhaustion/backoff text is still missing.
- The HTTP dashboard line still appears in `CO STATUS`.
- Controls are still visually lumped into `Backoff queue` instead of a separate `Status controls` section.
- Closeout does not state clearly what was already correct on current `main` versus what this lane changed.

## Goals
- Preserve the already-correct upstream Codex + Linear budget aggregation path.
- Move operator-facing `STAGE` and `EVENT` truth toward a projection-first Symphony handling model.
- Render the compact steady-state `Codex ... || Linear ...` rate-limit row with truthful percent/reset semantics.
- Remove default `Dashboard:` advertisement from the live surface.
- Render a separate segmented `Status controls` block below `Backoff queue`.
- Add focused automated coverage for projection truth and dashboard output.

## Non-Goals
- Rebuilding the underlying shared Linear budget substrate.
- Reopening adjacent lanes (`CO-98`, `CO-99`, `CO-100`, `CO-81`, `CO-101`, `CO-17`).
- Broad control-host or `/ui` redesign work unrelated to the STATUS surface.
- Treating renderer-only fallback layering as an acceptable replacement for upstream operator truth.

## Stakeholders
- Product: CO operators relying on `CO STATUS` during active provider-worker monitoring
- Engineering: control-runtime, selected-run projection, compatibility presenter, and terminal STATUS maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - combined `Rate Limits` row matches the required compact `Codex ... || Linear ...` contract
  - active `STAGE` surfaces the current Linear state
  - active `EVENT` shows truthful richer shared/CO-specific semantics instead of generic fallbacks
  - the live frame no longer advertises the HTTP dashboard and clearly separates `Status controls`
  - focused tests prove the changed output against authoritative projection inputs
- Guardrails / Error Budgets:
  - preserve truthful `n/a` or existing values when richer upstream evidence is not available
  - keep budget aggregation authoritative in existing runtime seams instead of duplicating it in the renderer
  - use small bounded changes in projection/presenter/dashboard paths and file a follow-up rather than broadening scope

## User Experience
- Personas: operator monitoring a live provider-worker; reviewer checking STATUS parity against current repo truth and Symphony handling semantics
- User Journeys:
  - operator opens `CO STATUS` during active work and immediately sees truthful stage/event/budget semantics without raw formatter artifacts
  - operator can distinguish steady-state remaining budget from actual exhausted/reset conditions
  - reviewer can compare focused tests and projection payloads to confirm `STAGE` and `EVENT` are computed upstream and rendered faithfully

## Technical Considerations
- Architectural Notes:
  - keep `controlRuntime.ts` and `linearBudgetState.ts` as the authoritative budget-composition seam
  - preserve `linearDispatchSource.ts` and shared Linear budget handling as context, not implementation scope
  - make `selectedRunProjection.ts` preserve active Linear workflow state instead of collapsing to generic `running`
  - move operator-facing event synthesis into `compatibilityIssuePresenter.ts` or adjacent projection logic so `controlStatusDashboard.ts` stops deciding event meaning from shallow fallbacks
  - keep `controlStatusDashboard.ts` focused on bounded presentation changes: compact row formatting, `Status controls` segmentation, and no `Dashboard:` line
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
  - `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/linearBudgetState.ts`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/ControlStatusDashboard.test.ts`

## Open Questions
- Should the authoritative running payload expose a dedicated operator-facing `display_event` field, or is enriching the existing event/message payload sufficient to keep renderer inference minimal?
- Which current merge-closeout/review-drain summaries are already authoritative enough to surface directly in the `EVENT` column without extra synthesis?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: `codex-orchestrator docs-review` child stream failed on the repo-wide `docs:freshness` stale-doc baseline after `docs:check`; manual fallback accepted for `linear-f71992e3-ddda-4198-b43c-97ccb36908cf`
- Design: N/A
