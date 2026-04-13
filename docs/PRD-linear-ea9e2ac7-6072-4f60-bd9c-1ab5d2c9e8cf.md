# PRD - CO workflow: add a truthful non-repro path for forced child-lane validation issues

## Added by Bootstrap 2026-04-12

## Traceability
- Linear issue: `CO-157` / `ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf`
- Linear URL: https://linear.app/asabeko/issue/CO-157/co-workflow-add-a-truthful-non-repro-path-for-forced-child-lane
- Source issue: `CO-133` / `42b8cf7e-8c1c-4ff7-a479-96e15ad5f6b5`
- Prior workflow contract lane:
  - `CO-101` / `6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd`
- Source closeout evidence:
  - `CO-133` final Linear workpad records a fresh April 12, 2026 non-repro on the originally named `clean-main-baseline-failures` and `cli-orchestrator-cleanup-fallout` clusters, a `forbid_parallel` / `blocked_by_dependency` closeout, and a follow-up for the workflow-contract gap that this lane now needs to clarify more truthfully for future workers.

## Summary
- Problem Statement: `CO-101` already made same-issue child-lane decisioning explicit for ordinary provider-worker turns, but `CO-133` exposed one missing branch in that contract. The source issue required a forced non-serial validation split and explicitly forbade silently finishing as `stay_serial` if the split collapsed. Fresh April 12, 2026 evidence showed the named `clean-main-baseline-failures` and `cli-orchestrator-cleanup-fallout` clusters were both clean non-repros, so the parent closed `CO-133` with `forbid_parallel` and no child lanes, plus a follow-up for the workflow-contract gap. This lane turns that issue-local behavior into standing workflow guidance and makes the closeout reason truthful: direct clean non-repro closeout should use `parent_only_mutation`, while `blocked_by_dependency` remains available only for real remaining dependencies.
- Desired Outcome: add an explicit workflow-contract path for forced child-lane validation follow-ups that become clean non-repros on current main, so a provider worker can close or redirect the issue truthfully without inventing child lanes, without silently downgrading to `stay_serial`, and without reopening the already-green validation seams.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): preserve the existing provider-worker child-lane contract, but add the missing truthful branch for stale validation follow-ups whose originally independent reproduction clusters disappear on fresh current-main evidence.
- Success criteria / acceptance:
  - the workflow/docs explicitly describe the valid decision when a forced validation split disappears
  - the contract explains when to close the issue directly versus move it to `Blocked` or create a same-project follow-up
  - at least one provider-worker example, doc packet, or test preserves the exact `clean-main-baseline-failures` and `cli-orchestrator-cleanup-fallout` case
  - the lane stays scoped to workflow-contract clarification rather than validation-fix revival
- Constraints / non-goals:
  - do not reopen the `CO-133` validation surfaces if they remain green
  - do not redesign the general child-lane runtime or parallelization reason matrix
  - do not treat this as permission to fabricate child lanes for bookkeeping

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `parallelize_now`
  - `forbid_parallel`
  - `blocked_by_dependency`
  - `clean-main-baseline-failures`
  - `cli-orchestrator-cleanup-fallout`
  - `forced child-lane validation`
  - `clean non-repro`
- Protected terms / exact artifact and surface names:
  - `buildProviderWorkerPrompt(...)`
  - `provider-linear-worker-proof.json`
  - `child_lanes`
  - `linear child-lane --action launch`
  - `linear parallelization`
  - `Blocked`
  - `create-follow-up`
- Nearby wrong interpretations to reject:
  - fabricate child lanes for failures that no longer reproduce
  - silently complete a forced child-lane issue as ordinary `stay_serial`
  - reopen `CO-133` test-fix scope when current-main evidence is already green
  - treat a prior issue-local closeout comment as sufficient standing workflow guidance

## Parity / Alignment Matrix
- Current truth:
  - `CO-101` already defines the generic decision matrix for `parallelize_now`, `stay_serial`, and `forbid_parallel`
  - `CO-133` closeout proved the missing non-repro branch in practice: no child lanes launched, the parent closed out the stale split, and a workflow-contract follow-up was required
  - `buildProviderWorkerPrompt(...)` still lacks an explicit forced-validation invalid-split branch, so future workers must infer it from issue-local history
- Reference truth:
  - forced child-lane validation follow-ups should fail closed against fabricated splits and misleading serial completion
  - provider workers should use standing repo-local workflow guidance instead of rediscovering the rule from older issue workpads
- Target truth / intended delta:
  - the provider-worker workflow guidance explicitly names the invalid-split non-repro case
  - the standing contract tells the worker to record `forbid_parallel` instead of `stay_serial`
  - the standing contract tells the worker to use `parent_only_mutation` and close directly when no live dependent work remains
  - the standing contract tells the worker to reserve `blocked_by_dependency` for real remaining dependencies that should move the issue to `Blocked`
  - the standing contract tells the worker to file a same-project follow-up when the clean non-repro exposes a separate workflow gap instead of pretending the current issue is dependency-blocked
- Explicitly out-of-scope differences:
  - changing the generic reason-code matrix
  - changing child-lane runtime enforcement
  - reopening the `clean-main-baseline-failures` or `cli-orchestrator-cleanup-fallout` validation seams themselves

## Not Done If
- The provider-worker workflow still lacks a truthful path for forced child-lane validation issues that become clean non-repros on current main.
- Operators still cannot tell whether to close the issue, move it to `Blocked`, or create a follow-up when the expected split disappears.
- The workflow still leaves room for fabricated child lanes or misleading serial decisions in this state.

## Goals
- Preserve the generic `CO-101` decision contract while adding the missing forced-validation non-repro branch.
- Make `CO-133`'s truthful closeout behavior reusable as standing workflow guidance rather than one-off issue lore.
- Keep the implementation bounded to workflow/prompt/docs truthfulness plus focused regression coverage.
- Preserve the exact named clusters that motivated the issue so the example stays auditable.

## Non-Goals
- Reopening or fixing `CO-133` validation surfaces that are already green on current main.
- Redesigning parent-owned child-lane runtime, accept/reject/invalidate semantics, or proof hydration.
- Broad Linear/provider-worker workflow changes beyond the forced invalid-split non-repro case.

## Stakeholders
- Product: CO operators and reviewers depending on truthful workflow decisions and closeout artifacts
- Engineering: provider-worker workflow, runner prompt, and child-lane contract maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - provider-worker workflow guidance explicitly encodes the forced invalid-split non-repro path
  - the prompt/test/docs example preserves `clean-main-baseline-failures` and `cli-orchestrator-cleanup-fallout`
  - future workers no longer need to infer this rule from `CO-133` workpad history
- Guardrails / Error Budgets:
  - keep the generic decision matrix unchanged
  - keep the change scoped to workflow truthfulness rather than revived validation implementation
  - preserve the repo's fail-closed stance against fabricated child-lane evidence

## User Experience
- Personas:
  - provider worker deciding how to close a forced child-lane validation follow-up
  - reviewer auditing whether `child_lanes: []` is truthful in a stale non-repro lane
  - operator deciding whether the next action is close, `Blocked`, or follow-up
- User Journeys:
  - a worker reproduces no live independent clusters, records `forbid_parallel` / `parent_only_mutation`, and closes the issue directly
  - a worker closes the stale non-repro issue directly when no live dependent work remains
  - a worker uses `Blocked` or `create-follow-up` only when a real remaining dependency or workflow-contract gap still exists

## Technical Considerations
- Architectural Notes:
  - the missing behavior is prompt/workflow guidance, not runner-side enforcement
  - the source-of-truth example already exists in `CO-133`; this lane makes it standing contract text
  - the exact cluster names belong in the prompt/test example so future workers see the intended scope boundary concretely
- Dependencies / Integrations:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - docs/task registry mirrors for `CO-157`

## Open Questions
- Whether the final closeout should also mention `CO-158` explicitly in the standing prompt text, or keep the guidance issue-agnostic while still citing the exact cluster names. Current plan: keep the standing guidance generic except for the preserved cluster names and the explicit decision/state/follow-up behavior.

## Approvals
- Product: pending
- Engineering: pending audited `docs-review` child stream for the `CO-157` packet
- Design: N/A
