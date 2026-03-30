# PRD - CO: Clarify bounded-success vs failed review-wrapper outcomes for operators

## Added by Bootstrap 2025-10-16

## Summary
- Problem Statement: CO's current standalone-review runtime can now finish successfully with a preserved `termination_boundary` when bounded rereads end in a truthful low-yield stop, but the operator-facing surfaces still leave too much interpretation work. A succeeded review with a non-null boundary can look too similar to a real review-wrapper failure or to the older generic "quiet-tail" blocker story.
- Desired Outcome: review telemetry, wrapper closeout output, downstream review-stage summaries, and worker guidance explicitly distinguish bounded successful review completion from actual wrapper failure without reopening the broader CO-16 runtime-policy work.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete Linear issue `CO-28` in the current CO workspace by tightening the operator-facing interpretation seam for standalone review outcomes, keeping the change narrow, actionable, and backed by focused tests plus docs.
- Success criteria / acceptance:
  - bounded-success review runs remain successful and say so explicitly
  - real review-wrapper failures still expose their failure family clearly and machine-checkably
  - worker-facing handoff/workpad guidance stops treating bounded-success review telemetry like a blocker or generic quiet-tail failure
  - the repo docs for `npm run review` / `codex-orchestrator review` explain how to read the new success-versus-failure distinction
- Constraints / non-goals:
  - do not reopen the broader CO-16 review-runtime policy lane
  - do not widen into the cancelled CO-24 repo-test blocker
  - keep the patch focused on presentation, interpretation, and operator truthfulness surfaces

## Goals
- Add an explicit machine-checkable review terminal-outcome classification that separates `bounded-success` from actual wrapper failure.
- Surface that distinction in wrapper closeout logs and downstream review-stage summaries used in manifests or validation packets.
- Sync worker-facing instructions so workpads and review closeout notes report bounded-success reviews as successful review completion rather than as blockers.
- Cover the seam with focused regressions instead of reopening broader review-runtime behavior.

## Non-Goals
- Changing the bounded-review guard families or their detection thresholds.
- Reworking full-suite `npm run test` quiet-tail behavior.
- Broad provider-worker lifecycle changes unrelated to review outcome interpretation.

## Stakeholders
- Product: CO operators and reviewers interpreting standalone-review outcomes during handoff.
- Engineering: standalone-review wrapper, orchestrator command-runner, and provider-worker workflow maintainers.
- Design: n/a

## Metrics & Guardrails
- Primary Success Metrics:
  - `review/telemetry.json` exposes an explicit terminal-outcome classification for successful bounded completion versus wrapper failure
  - wrapper stderr/stdout and downstream review-stage summaries present bounded-success truth without implying blocker status
  - focused tests cover the new outcome-classification seam
- Guardrails / Error Budgets:
  - preserve existing boundary family kind/provenance records for failed review-wrapper outcomes
  - avoid widening the diff into unrelated review-runtime policy or provider workflow behavior

## User Experience
- Personas:
  - provider worker author refreshing the Linear workpad and review closeout
  - operator or reviewer reading run manifests / validation packets
- User Journeys:
  - operator reads a succeeded review artifact with a preserved boundary and can immediately tell it was a bounded successful completion
  - operator reads a failed review artifact and can still identify the concrete failure family
  - worker refreshes the workpad or handoff notes and records review outcome truth without calling bounded-success a blocker

## Technical Considerations
- Architectural Notes:
  - the narrow seam spans review telemetry persistence, wrapper log summary, downstream review-stage summary shaping, and worker-facing docs/prompt text
  - the existing `termination_boundary` family contract remains the right place for failure-family truth; this lane adds the missing outcome/disposition axis
- Dependencies / Integrations:
  - `scripts/lib/review-execution-telemetry.ts`
  - `scripts/lib/review-launch-attempt.ts`
  - `orchestrator/src/cli/services/commandRunner.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `skills/linear/SKILL.md`
  - `docs/standalone-review-guide.md`

## Open Questions
- Resolved in planning: the smallest truthful addition is a compact terminal-outcome classification layered on top of the existing `termination_boundary` contract, not a new boundary taxonomy.

## Approvals
- Product: Pending
- Engineering: Pending docs-review
- Design: n/a
