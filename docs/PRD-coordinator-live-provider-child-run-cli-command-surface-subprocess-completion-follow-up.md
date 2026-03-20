# PRD - Coordinator Live Provider Child-Run CLI Command-Surface Subprocess Completion Follow-Up

## Added by Bootstrap 2026-03-19

## Summary
- Problem Statement: `1307` already pinned the shared CLI command-surface test helper to deterministic `cli` runtime env values unless an individual test overrides them. Fresh remeasurement on the current tree shows the previously suspicious focus surface is long but terminal, not stuck: [`tests/cli-command-surface.spec.ts`](../tests/cli-command-surface.spec.ts) passes `100/100` tests in about `297.91s`. That invalidates the earlier assumption that help-path subprocesses such as `resume --help` were the concrete blocker. The remaining truthful work is to rerun the full local validation floor and the live provider-started child run with patience-first monitoring, then capture the next exact blocker if one still exists.
- Desired Outcome: Keep the new follow-up lane truthful by recording that the focused command-surface suite is terminal after a long runtime, avoid an unjustified code change, and rerun the full local and live provider validation chain until the next exact boundary is known.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Continue the provider follow-up work end to end as the orchestrator, use docs-first planning plus delegated read-only analysis, fix the next real blocker only if fresh evidence justifies it, and revalidate the live provider-started child run truthfully.
- Success criteria / acceptance:
  - a new truthful follow-up lane exists as `1308`
  - the lane explicitly states that `1307` already addressed runtime-env isolation in the shared command-surface helper
  - the lane records that focused command-surface coverage is long but terminal rather than treating it as a proven hang
  - full `npm run test` is rerun with patience-first monitoring on the implementation tree
  - the live provider-started child run still clears `delegation-guard`, `build`, `lint`, and `test`, or the next downstream blocker is captured exactly
- Constraints / non-goals:
  - do not reopen provider setup, provider-intake authority, or the `1305`/`1306` provider contract fixes unless fresh evidence forces that
  - do not invent a CLI/import-time fix without a fresh reproduction of an actual non-terminal subprocess bug
  - do not claim a green lane without a fresh live rerun or exact blocker evidence

## Goals
- Record the corrected conclusion that the focused CLI command-surface suite is terminal after a long runtime.
- Rerun the full local validation floor with patience-first monitoring instead of inventing a fix without evidence.
- Push the live provider-started child run beyond the current `test`-stage boundary.

## Non-Goals
- Redesigning production runtime selection or appserver fallback semantics.
- Reopening the provider-intake claim contract or delegation-guard proof model.
- Broad CLI refactors without a fresh reproduction of a real completion bug.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - focused `tests/cli-command-surface.spec.ts` returns terminally on the implementation tree
  - full `npm run test` returns terminally on the implementation tree
  - the live provider child run progresses beyond the prior `test` boundary
- Guardrails / Error Budgets:
  - keep the `1307` runtime-env helper contract intact unless fresh contradictory evidence appears
  - avoid code changes unless a new concrete blocker is reproduced
  - stop at the first new downstream blocker after the current `test` stage

## User Experience
- Personas: CO operator validating the real provider-driven autonomous run path
- User Journeys:
  - the focused CLI command-surface suite finishes after a long but bounded runtime
  - the local repo validation floor finishes without a manual kill after `npm run test`
  - the real provider-started child run either gets beyond `test` or records the exact next blocker

## Technical Considerations
- Architectural Notes:
  - the strongest fresh evidence is the completed focused rerun of [`tests/cli-command-surface.spec.ts`](../tests/cli-command-surface.spec.ts), which passed `100/100` tests in about `297.91s`
  - `1307` already added deterministic `cli` runtime env defaults to the shared `runCli(...)` helper, and the focused rerun did not justify reopening that contract
  - the remaining uncertainty is whether full `npm run test` and the live provider child run also terminate cleanly when monitored with enough patience
  - if the full suite or live rerun still exposes a concrete blocker after this remeasurement, stop there and carry that exact blocker into the next slice rather than speculating
- Dependencies / Integrations:
  - current `1307` branch state
  - [`tests/cli-command-surface.spec.ts`](../tests/cli-command-surface.spec.ts)
  - live provider state under `.runs/local-mcp/cli/control-host/` and the reused provider child-run manifests under `.runs/linear-*/`

## Open Questions
- Whether full `npm run test` is also long-but-terminal on the current tree, or whether it still exposes a separate concrete blocker after the focused command-surface proof?
- Which downstream stage becomes the next live provider child-run blocker once the local validation floor is rerun with patience-first monitoring?

## Approvals
- Product: Self-approved from operator directive and fresh focused command-surface remeasurement
- Engineering: Waiver granted by the top-level orchestrator on 2026-03-20; the stacked docs-review wrapper remained non-terminal at the final review step. Evidence: `out/1309-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up/manual/20260320T011421Z-live-provider-test-hermeticity-closeout/14-review-waiver.md`
- Design: N/A
