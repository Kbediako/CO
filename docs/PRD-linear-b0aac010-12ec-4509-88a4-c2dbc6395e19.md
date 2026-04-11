# PRD - CO: Audit remaining review-launch and compatibility alias seams after CO-88

## Added by Bootstrap 2026-04-11

## Traceability
- Linear issue: `CO-137` / `b0aac010-12ec-4509-88a4-c2dbc6395e19`
- Linear URL: https://linear.app/asabeko/issue/CO-137/co-audit-remaining-review-launch-and-compatibility-alias-seams-after
- Source issue: `CO-88` / `0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0`

## Summary
- Problem Statement: CO-88 deliberately stopped short of deleting the remaining review-launch, collab-env, execution-mode alias, and optional cloud-sync seams because they still had active imports, tests, or documented integration points. The repo now needs an explicit keep-or-delete audit for those surfaces instead of another opportunistic cleanup pass.
- Desired Outcome: land explicit keep/delete decisions for the remaining seams, update repo-facing truth where needed, and prove any retained seam still has a justified current consumer.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish the CO-88 follow-up by auditing the remaining still-live compatibility seams, not by reopening the broad cleanup and not by deleting behavior-heavy code without stronger current-consumer evidence.
- Success criteria / acceptance: `review-launch-attempt`, the `requiresCloud` alias family, the legacy collab env keys in `rlmCodexRuntimeShell`, and `orchestrator/src/sync/**` each end with an explicit keep/delete verdict plus any required truthfulness update and focused validation evidence.
- Constraints / non-goals: stay out of CO-82 and CO-83, do not add new runtime features or new cloud-sync product work, and treat test-runtime slowness alone as insufficient evidence that a seam is dead.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `keep-or-delete audit`
  - `remaining review-launch and compatibility alias seams after CO-88`
  - `active import, runtime, and test evidence`
  - `truthfulness updates`
- Protected terms / exact artifact and surface names:
  - `scripts/lib/review-launch-attempt.ts`
  - `scripts/run-review.ts`
  - `scripts/lib/review-non-interactive-handoff.ts`
  - `tests/review-launch-attempt.spec.ts`
  - `tests/run-review.spec.ts`
  - `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`
  - `orchestrator/src/types.ts`
  - `orchestrator/src/cli/adapters/CommandPlanner.ts`
  - `orchestrator/src/cli/services/orchestratorExecutionModePolicy.ts`
  - `orchestrator/src/sync/**`
  - `requiresCloud`
  - `requires_cloud`
- Nearby wrong interpretations to reject:
  - blindly deleting the remaining aliases because CO-88 already deleted other stale surfaces
  - reopening already-removed CO-88 cleanup targets like the selected-run presenter seam or shared stdio shim
  - folding unrelated provider observability, STATUS telemetry, or new cloud-sync feature work into this lane

## Parity / Alignment Matrix
- Current truth:
  - `review-launch-attempt` is still the live standalone-review launch shell imported by `scripts/run-review.ts`, `scripts/lib/review-execution-boundary-preflight.ts`, and `scripts/lib/review-non-interactive-handoff.ts`, with focused wrapper tests still covering it.
  - legacy collab env aliases in `rlmCodexRuntimeShell.ts` are still read by config-resolution helpers and still exercised in tests while the canonical multi-agent env migration remains in progress.
  - `orchestrator/src/sync/**` is an explicit opt-in integration seam with focused unit coverage, while `docs/README.md` already says the default CLI does not wire cloud uploads.
  - the `requiresCloud` / `requires_cloud` family is still used across planner outputs and execution-mode policy, but it needs a bounded consumer audit before any collapse.
- Reference truth:
  - the repo should say clearly which seams are still intentionally live, which are deprecated compatibility aliases, and which can now be collapsed safely.
- Target truth / intended delta:
  - each remaining seam has an explicit keep/delete decision with current-consumer evidence
  - retained seams get the smallest truthful repo-facing note needed to explain why they remain
  - any seam narrowed or deleted has focused validation proving the remaining runtime path still works
- Explicitly out-of-scope differences:
  - new review features
  - new runtime modes
  - new cloud-sync product wiring
  - unrelated provider-worker and STATUS work

## Not Done If
- `review-launch-attempt` fallback behavior remains ambiguous without a current-consumer verdict.
- retained aliases like `requiresCloud` or the legacy collab env keys stay without explicit rationale.
- `orchestrator/src/sync/**` is still described inconsistently between code and docs.
- behavior-heavy seams are removed without focused validation proving the surviving path still works.

## Goals
- Produce explicit keep/delete decisions for the remaining CO-88 compatibility seams.
- Add only the truthfulness updates required to make retained seams auditable.
- Keep the diff bounded and evidence-backed.

## Non-Goals
- Redoing the high-confidence deletions already completed under CO-88.
- Expanding into new runtime, review, or cloud-sync features.
- Treating broad wrapper or repo cleanup as in scope again.

## Stakeholders
- Product: CO maintainers tracking truthful repo posture after CO-88.
- Engineering: CLI/review/runtime maintainers and provider-worker lanes that rely on these compatibility seams.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics:
  - each target seam has a recorded keep/delete decision with evidence
  - all touched truth surfaces agree on the same current behavior
  - focused validation passes for every changed seam
- Guardrails / Error Budgets:
  - no new behavior outside the audited seams
  - no deletion of behavior-heavy seams without focused proof
  - no stale docs packet or registry drift during the lane

## User Experience
- Personas: maintainers and provider workers relying on truthful review/runtime docs and compatibility contracts.
- User Journeys:
  - a contributor reading the repo can tell which compatibility seams are still intentionally live
  - a worker running review or runtime flows does not lose a still-required compatibility path unexpectedly

## Technical Considerations
- Architectural Notes:
  - this is an audit-and-truthfulness lane, not a feature lane
  - retained seams should prefer explicit rationale over broad code churn
- Dependencies / Integrations:
  - standalone review wrapper behavior in `scripts/run-review.ts`
  - collab / multi-agent runtime compatibility
  - planner and execution-mode policy compatibility
  - optional cloud-sync integration points

## Open Questions
- Can the `requiresCloud` alias family be narrowed safely once the bounded child-lane audit finishes?

## Approvals
- Product: Self-approved against the Linear issue contract.
- Engineering: Pending docs-review and final validation.
- Design: Not applicable.
