# PRD - CO: Restore clean full-suite Vitest exit for provider-worker validation

## Added by Bootstrap 2026-04-02

## Summary
- Problem Statement: provider-worker lanes in CO can misclassify the full Vitest suite as hung when the current tree enters a long quiet tail before the last two slow files finish, which blocks machine-checkable review handoff even though the default suite still exits cleanly when allowed to complete.
- Desired Outcome: preserve a truthful full-suite validation path that exits cleanly on success, still fails cleanly on real failures, and leaves enough evidence for future provider-worker lanes to distinguish a real post-suite linger from the current-tree late-tail duration profile.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): reproduce the current workspace full-suite hang, isolate whether the owner is a leaking test, Vitest shutdown behavior, spawned child processes, or persistent `esbuild --service` state, then land the smallest fix or documented fallback that gives provider-worker validation a clean full-suite exit again.
- Success criteria / acceptance:
  - deterministically reproduce the full-suite shutdown hang with evidence
  - identify the smallest truthful owner or an explicit fallback that keeps full-suite coverage intact
  - restore a clean terminal success exit for the full suite in CO issue workspaces
  - document the root cause or fallback so future provider-worker handoffs do not stall on the same boundary
- Constraints / non-goals:
  - do not close the issue by skipping `npm run test`
  - do not hide failures by force-killing processes without understanding exit truth
  - do not widen into unrelated Vitest or CLI refactors

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `full Vitest suite`
  - `clean terminal success exit`
  - `node (vitest)`
  - `esbuild --service`
  - `validation fallback`
- Protected terms / exact artifact and surface names:
  - `npm run test`
  - `npx vitest run --config vitest.config.core.ts`
  - `provider-worker`
  - `In Review`
- Nearby wrong interpretations to reject:
  - the earlier CO-57 heartbeat fix already solved this exact issue
  - a timeout wrapper or process kill is acceptable even if it could hide a red suite
  - reducing test coverage is an acceptable validation fallback

## Parity / Alignment Matrix
- Not applicable.
- Current truth:
  - CO-57 corrected stale `manifest.json` heartbeat reporting for `implementation-gate`
  - the initial `240000ms` reproduction harness timed out during a quiet tail and falsely looked like a hang
  - a patience-first rerun of `npm run test` in this workspace reached a clean Vitest footer after `272.79s`, with `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts` owning the slow tail
- Reference truth:
  - provider-worker lanes need a truthful machine-checkable full-suite validation path before review handoff
- Target truth / intended delta:
  - the approved full-suite command path is the default `npm run test`
  - the issue packet and workpad record that the current-tree quiet tail is long but terminal
  - future provider-worker lanes do not treat the observed late-tail window as a reproduced hang without stronger evidence
- Explicitly out-of-scope differences:
  - unrelated CLI surface changes
  - unrelated parser or review-wrapper refactors
  - broad repository-wide test harness cleanups without fresh evidence

## Not Done If
- The default full-suite validation path no longer reaches the clean footer observed in this workspace.
- The chosen fallback drops part of the suite or is not machine-checkable.
- The fix relies on force-killing processes in a way that could hide genuine failures.
- The root cause or explicit fallback is not documented for future provider-worker lanes.

## Goals
- Reproduce the apparent shutdown hang in this workspace and classify whether it is a real linger or a false timeout during the quiet tail.
- Narrow the owner to the smallest truthful seam.
- Ship the smallest fix or explicit fallback that preserves full-suite coverage.
- Keep Linear workpad, task packet, and validation evidence synchronized through handoff.

## Non-Goals
- Reopening unrelated CO-50 parser behavior.
- Shipping a broad Vitest configuration overhaul unless no narrower fix works.
- Masking hangs by adding cleanup that weakens exit-truth guarantees.

## Stakeholders
- Product: CO provider-worker issue lane owners who need machine-checkable review handoff.
- Engineering: CO orchestrator and test harness maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics:
  - the approved `npm run test` path reaches the full Vitest footer on green runs in the current workspace
  - red runs still produce non-zero exit status without being reclassified
  - the reproduction and final validation leave auditable evidence under the issue task id
- Guardrails / Error Budgets:
  - no dropped test files
  - no silent process kill after success-looking output without classified ownership
  - no unrelated codepath refactors unless the narrow owner proves insufficient

## User Experience
- Personas:
  - provider-worker agents executing review-gated issue lanes
  - reviewers reading manifests and workpad evidence
- User Journeys:
  - agent runs full validation
  - suite completes and exits cleanly with truthful machine-checkable evidence
  - review handoff proceeds without a hung test tail blocking the issue

## Technical Considerations
- Architectural Notes:
  - start from the current full-suite command surface and work inward only after reproducing the live hang
  - treat prior CO-57 heartbeat work as historical context, not proof that the current root cause is already known
- Dependencies / Integrations:
  - `vitest.config.core.ts`
  - `package.json` test scripts
  - orchestrator/provider-worker validation runners
  - any tests or helpers that keep active handles alive

## Open Questions
- The default `npm run test` path is terminal on the current tree; do any direct fallback shapes still need additional proof for future operator guidance?
- Should future lanes set an explicit patience threshold above `272.79s` before classifying the quiet tail as a hang on this tree?

## Approvals
- Product: pending
- Engineering: pending
- Design: not applicable
