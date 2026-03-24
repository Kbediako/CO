# PRD - CO Reduce Review Long Tails and Make Review Evidence Accounting Truthful

## Added by Bootstrap 2026-03-24

## Traceability
- Linear issue: `CO-16` / `1ea6b7f9-ff6f-42b6-af83-a77dce870514`
- Linear URL: https://linear.app/asabeko/issue/CO-16/co-reduce-review-long-tails-and-make-review-evidence-accounting

## Summary
- Problem Statement: CO review flows intentionally allow deep reviews, but current bounded diff-review runs can drift into low-yield reread tails after the startup anchor, and review evidence accounting is currently optimistic. Recent audit evidence shows a review telemetry artifact can end in a bounded termination state while the manifest and run summary still claim success, which breaks operator trust and makes review gates non-truthful.
- Desired Outcome: Bounded diff reviews stop early once post-startup concrete progress stays near zero, docs-review and implementation-gate only succeed when terminal review evidence is fresh and internally consistent unless a waiver is recorded, large uncommitted review scope requires explicit operator intent, and the resulting truthfulness is visible to pipeline and run-summary consumers rather than only to telemetry writers.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Complete Linear issue `CO-16` in this workspace by tightening standalone review runtime behavior and evidence accounting without harming legitimate deep reviews, then hand the issue off only after the PR, validation, and review-state workflow are ready.
- Success criteria / acceptance:
  - bounded diff reviews no longer spend long periods rereading with near-zero concrete progress after startup anchor
  - docs-review and implementation-gate require truthful terminal review evidence, not stale or inconsistent manifest state
  - truthfulness fixes reach manifest and run-summary consumers
  - large-scope uncommitted review behavior is explicit and auditable
  - forced execution paths in docs-review and implementation-gate keep working
  - focused regressions cover the wrapper/runtime and telemetry seams
- Constraints / non-goals:
  - preserve genuine deep reviews and avoid blanket shortening of all review runs
  - keep the patch bounded to review runtime, evidence accounting, scope gating, docs, and focused tests
  - delegation must be recorded as an explicit override in this worker run because subagent spawning is unavailable in-session

## Goals
- Add a bounded success-side low-yield stop for diff reviews after startup anchor when concrete progress remains near zero.
- Make review-gate success depend on terminal evidence consistency between review telemetry, stage/manifests, and run-summary surfaces unless an explicit waiver is recorded.
- Tighten large uncommitted review scope so `--base` or `--commit` or an explicit override is required once thresholds trip.
- Prove the behavior with focused regressions in the existing standalone-review test seams.

## Non-Goals
- Rewriting the broader standalone-review architecture beyond the bounded seams in this issue.
- Removing deep review capability for non-diff or high-signal review flows.
- Changing Linear workflow semantics beyond the normal worker handoff requirements for this issue.

## Stakeholders
- Product: CO operator / review gate owner
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - bounded diff reviews terminate promptly on post-startup low-yield conditions
  - review gate success is blocked when telemetry/manifests/run summaries disagree about terminal review state
  - large-scope uncommitted reviews require explicit narrowing or an auditable override
- Guardrails / Error Budgets:
  - preserve forced execution in docs-review and implementation-gate
  - keep the implementation minimal and auditable
  - stop coding once the issue reaches the live review handoff state

## User Experience
- Personas: CO operator relying on review gates and review evidence for release and merge decisions
- User Journeys:
  - operator launches a review gate on a bounded diff and expects the run to stop once it becomes low-yield rather than drifting
  - operator reads manifest/run-summary output and expects it to match the terminal telemetry truth
  - operator hits a large uncommitted review scope and gets an explicit, auditable narrowing or override decision

## Technical Considerations
- Architectural Notes:
  - the low-yield boundary and telemetry truthfulness seams are in `scripts/lib/review-execution-state.ts`, `scripts/lib/review-execution-runtime.ts`, `scripts/lib/review-execution-telemetry.ts`, and `scripts/run-review.ts`
  - pipeline/run-summary truthfulness depends on orchestrator review command consumers such as `orchestrator/src/cli/services/commandRunner.ts`, `orchestrator/src/cli/services/orchestratorLocalPipelineExecutor.ts`, `orchestrator/src/cli/adapters/CommandReviewer.ts`, and run-summary writers
  - large-scope preflight behavior is currently routed through `scripts/lib/review-scope-advisory.ts` and `scripts/run-review.ts`
- Dependencies / Integrations:
  - `codex.orchestrator.json`
  - `docs/standalone-review-guide.md`
  - `tests/run-review.spec.ts`
  - `tests/review-execution-state.spec.ts`
  - `tests/review-execution-telemetry.spec.ts`

## Open Questions
- Whether the truthfulness gate should also persist a structured review-evidence assessment into run-summary output or rely on terminal status plus summary text. The implementation should choose the smallest truthful contract that reaches downstream consumers.

## Approvals
- Product: Self-approved from Linear issue scope and acceptance criteria
- Engineering: Pending docs-review + implementation validation
- Design: N/A

## Manifest Evidence
- Docs-review manifest: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T08-11-34-245Z-b218e257/manifest.json`
- Baseline audit: `out/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/manual/20260324T080455Z-baseline-audit.md`
