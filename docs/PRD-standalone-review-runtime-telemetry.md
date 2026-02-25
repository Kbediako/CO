# PRD - Standalone Review Runtime Bounding + Telemetry (0979)

## Summary
- Problem Statement: Forced `npm run review` executions can look hung or hit operator-defined timeouts because `codex review` may run broad validation commands (for example `npm run test`) during a review pass.
- Desired Outcome: keep standalone reviews fast, predictable, and observable by default while preserving an opt-in path for deeper/full validation behavior.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): investigate why reviews failed, add telemetry/observability, and implement a concrete fix so review reliability improves.
- Success criteria / acceptance:
  - Root cause is evidenced from real review output logs.
  - `scripts/run-review.ts` adds bounded default guidance that discourages heavy full-suite command execution during review.
  - Timeout/failure paths emit actionable telemetry (what commands were attempted, what likely consumed runtime).
  - Tests cover new prompt constraints and telemetry diagnostics behavior.
- Constraints / non-goals:
  - Do not remove autonomy; keep an explicit opt-in to allow heavy validation commands.
  - Do not force a specific agent role/model.
  - Keep the patch scoped to standalone review wrapper behavior and docs updates.

## Goals
- Reduce false "hang" perception for forced review runs.
- Improve post-failure diagnosability from wrapper artifacts/logs.
- Keep review output artifact compatibility under `.runs/<task>/.../review/`.

## Non-Goals
- Rewriting Codex CLI internals.
- Replacing `codex review` with a custom reviewer engine.
- Changing orchestration approval policy behavior.

## Stakeholders
- Product: repo maintainers and downstream users relying on `npm run review`.
- Engineering: agents/operators running long-lived docs/implementation gates.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - Forced review runs show clearer diagnostics on timeout/failure.
  - Wrapper tests pass for bounded-mode prompt + telemetry summary.
- Guardrails / Error Budgets:
  - No regression to existing non-interactive handoff behavior.
  - Delegation MCP default remains enabled unless explicitly disabled.

## User Experience
- Personas: top-level agents, downstream users, maintainers auditing run artifacts.
- User Journeys:
  - Run `npm run review` (forced mode) -> wrapper prompts bounded review behavior -> runtime remains focused on diff review.
  - On timeout/failure, operator gets concise telemetry summary and a persisted telemetry artifact path.

## Technical Considerations
- Architectural Notes: changes stay in `scripts/run-review.ts` and `tests/run-review.spec.ts`.
- Dependencies / Integrations: uses existing review artifact directory and issue-log fallback; no new external dependency.

## Open Questions
- Should the wrapper eventually expose a first-class `--review-profile` flag (`bounded` vs `thorough`) instead of env-only control?

## Approvals
- Product: self-approved (task owner)
- Engineering: self-approved (task owner)
- Design: n/a
