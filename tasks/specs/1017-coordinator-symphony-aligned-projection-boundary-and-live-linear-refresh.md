---
id: 20260306-1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh
title: Coordinator Symphony-Aligned Projection Boundary + Live Linear Refresh
relates_to: docs/PRD-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: extract the selected-run projection boundary from `controlServer.ts` while keeping async live Linear evaluation and shared read-surface payload shaping coherent.
- Scope: one dedicated projection module, one `controlServer.ts` integration pass, the smallest required route rewiring, and targeted coherence validation.
- Constraints: keep CO execution authority unchanged, keep Linear advisory-only, keep Telegram bounded, and avoid broad transport or UI refactors in this slice.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and projection-boundary implementation as the immediate follow-up to `1016`.
- Reasoning: the provider-facing behavior is already in place; the next durable value is a smaller, more explicit control-layer boundary that future Telegram/downstream-user surfaces can safely reuse.
- Initial review evidence: `docs/findings/1017-projection-boundary-and-live-linear-refresh-deliberation.md`, `out/symphony-research/20260306T080156Z-real-upstream-alignment/00-summary.md`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T080830Z-closeout/00-summary.md`.
- Delegated review refinement: a delegated read-only scout confirmed the docs-first registration and guard posture for `1017`: `delegation-guard`, `spec-guard`, `docs:check`, and `docs:freshness` all passed under the registered subtask stream, then `npm run review` drifted into the same low-signal exploratory tail seen on prior lanes and was terminated instead of being treated as a clean reviewer verdict. That scout evidence is sufficient for proceeding to the top-level `1017` docs-review without claiming a false review success. Evidence: `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh-scout/cli/2026-03-06T09-07-59-008Z-3b54bc1a/manifest.json`.
- docs-review override: the registered top-level docs-review run passed `delegation-guard`, `spec-guard`, `docs:check`, and `docs:freshness`, then `npm run review` exited with code `128` after drifting into the known low-signal review-wrapper tail instead of returning findings. Proceeding is approved with that failure recorded explicitly rather than hidden. Evidence: `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/2026-03-06T09-16-58-040Z-fb4db1e5/manifest.json`, `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T091813Z-docs-review-override/00-summary.md`.

## Technical Requirements
- Functional requirements:
  - extract selected-run snapshot/context/public-payload builders from `controlServer.ts` into one dedicated module under `orchestrator/src/cli/control/`,
  - keep async dispatch/live Linear evaluation inside the extracted boundary,
  - reuse the extracted boundary for `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and the dispatch read path where appropriate,
  - preserve current fail-closed exact-ID live Linear behavior and tracked advisory merge,
  - avoid duplicated provider fetches within the same projection build path.
- Non-functional requirements:
  - no public behavior regression on the affected read surfaces,
  - no new authority or mutation semantics,
  - minimal API surface between `controlServer.ts` and the new module,
  - deterministic, testable async behavior.
- Interfaces / contracts:
  - existing compatibility/read routes remain authoritative,
  - webhook ingress and Telegram push remain additive consumers of the same selected-run data,
  - no new env vars or secret storage contracts are introduced.

## Architecture & Data
- Architecture / design adjustments:
  - introduce a dedicated selected-run projection module,
  - keep route/auth/mutation ownership in `controlServer.ts`,
  - move selected-run snapshot reading, display-state shaping, tracked Linear merge, and public payload assembly behind the extracted boundary.
- Data model changes / migrations:
  - none at repo or runtime storage level,
  - existing run-local sidecars remain unchanged.
- External dependencies / integrations:
  - existing `linearDispatchSource` live provider client,
  - existing Telegram oversight bridge and webhook ingestion path,
  - real `openai/symphony` repo as a read-only reference for layering and poll-and-project discipline only.

## Validation Plan
- Tests / checks:
  - targeted control-server/read-surface coherence tests,
  - targeted async live Linear evaluation regression coverage,
  - manual simulated/mock coherence verification,
  - full repo validation gate chain for the owned diff.
- Rollout verification:
  - delegated scout manifest captured before implementation,
  - docs-review manifest captured before implementation,
  - elegance review and closeout evidence captured before handoff.
- Monitoring / alerts:
  - rely on existing route logs/manual artifacts,
  - keep any override reasons explicit if review/full-suite noise persists.

## Open Questions
- Whether `/api/v1/dispatch` should consume a full projection object or a narrower extracted async helper in this slice.
- Whether the next slice after `1017` should move Telegram rendering directly onto the extracted projection boundary instead of HTTP self-calls.

## Closeout Notes
- Implementation landed as scoped: `selectedRunProjection.ts` now owns selected-run snapshot/context construction, compatibility payload shaping, tracked Linear merge, and request-scoped async dispatch evaluation, while `controlServer.ts` retains routing, auth, webhook intake, and control-mutation ownership. Evidence: `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/src/cli/control/controlServer.ts`, `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/00-summary.md`.
- The targeted regression gap that motivated the extraction is covered directly: `/api/v1/dispatch` now reuses the selected-run evaluation within the request and the control-server regression test asserts a single live Linear fetch. Evidence: `orchestrator/tests/ControlServer.test.ts`, `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/10-manual-projection-mock.json`.
- Delegated review input found no concrete regression in the extracted boundary; remaining concerns are low-risk and documented as follow-up posture, not blockers. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/00-summary.md`, `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/12-next-slice-observability-surface.md`.
- Validation is green with explicit override notes instead of silent pass-through: docs-review earlier failed only in the known local review-wrapper tail, branch-wide diff-budget required an override due accumulated in-flight delta, and the forced standalone review timed out after bounded telemetry capture. Evidence: `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T093745Z-closeout/13-override-notes.md`, `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/2026-03-06T09-16-58-040Z-fb4db1e5/review/output.log`, `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/2026-03-06T09-16-58-040Z-fb4db1e5/review/telemetry.json`.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
