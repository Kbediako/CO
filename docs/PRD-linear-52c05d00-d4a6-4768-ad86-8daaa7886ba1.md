# PRD - CO: Restore unrelated eval:test baseline failing TypeScript smoke harness

## Added by Bootstrap 2026-04-02

## Traceability
- Linear issue: `CO-58` / `52c05d00-d4a6-4768-ad86-8daaa7886ba1`
- Linear URL: https://linear.app/asabeko/issue/CO-58/co-restore-unrelated-evaltest-baseline-failing-typescript-smoke
- Related source issue: `CO-46`

## Summary
- Problem Statement: `CO-46` exposed an unrelated evaluation-harness baseline regression on 2026-04-01. `MCP_RUNNER_TASK_ID=linear-56067b9f-2aef-4033-8e12-08ac89bd9834 npm run eval:test` failed in `evaluation/tests/harness.test.ts` because the TypeScript smoke scenario returned at least one goal status that was not `passed`.
- Desired Outcome: reproduce the current failure in this workspace, capture the exact failing goal statuses and owning seam, then restore `npm run eval:test` to green or record a precise blocker owner if the failure proves out of scope for this lane.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-58` as a separate provider-worker lane for the unrelated `eval:test` regression uncovered during `CO-46`, keep the issue in the repo's docs-first and Linear-workpad workflow, and leave audit-ready evidence about the actual failing statuses, root cause layer, and final baseline state.
- Success criteria / acceptance:
  - reproduce the current `evaluation/tests/harness.test.ts` failure for the TypeScript smoke scenario in this workspace
  - capture the exact goal statuses returned by the failing TypeScript smoke scenario
  - determine whether the regression sits in the evaluation harness, the scenario fixture, or some unrelated runtime dependency surface
  - restore `npm run eval:test` to green, or record explicit blocker ownership if it cannot be repaired in this lane
- Constraints / non-goals:
  - keep this lane separate from `CO-46` and any unrelated repo-wide validation seams
  - keep the patch bounded to the TypeScript smoke scenario, its harness plumbing, and direct dependency surfaces required to make the baseline truthful
  - do not silently downgrade or skip the TypeScript smoke assertions just to make the suite pass

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `Restore unrelated eval:test baseline failing TypeScript smoke harness`
  - `npm run eval:test`
  - `evaluation/tests/harness.test.ts`
  - `TypeScript smoke scenario`
  - `expected false to be true`
- Protected terms / exact artifact and surface names:
  - evaluation harness
  - scenario fixture
  - runtime dependency surface
  - goal statuses
  - TypeScript smoke
- Nearby wrong interpretations to reject:
  - "fix `CO-46` by waiving `eval:test`"
  - "skip the TypeScript smoke test because `eval:test` is optional in unrelated lanes"
  - "rewrite the evaluation system broadly instead of reproducing and repairing the concrete TypeScript smoke seam"

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth: the issue description records a failing `evaluation/tests/harness.test.ts` TypeScript smoke run from 2026-04-01, but this workspace has not yet refreshed the live reproduction or captured the exact current goal statuses.
- Reference truth: the TypeScript smoke fixture should return all TypeScript smoke goals as `passed` under `npm run eval:test`.
- Target truth / intended delta: the current workspace reproduces the live failure precisely, identifies its owner layer, and lands the smallest truthful repair so `npm run eval:test` returns green again.
- Explicitly out-of-scope differences: unrelated evaluation scenarios, broad rewarder redesign, and unrelated `npm run test` or review-wrapper issues not required to restore the TypeScript smoke baseline.

## Not Done If
- the exact failing goal statuses for the TypeScript smoke scenario are still unknown
- the lane claims success without determining whether the regression lives in the harness, the fixture, or another dependency surface
- `npm run eval:test` remains red without an explicit blocker owner and rationale recorded

## Goals
- Reproduce the TypeScript smoke harness failure in the current workspace.
- Capture the exact goal-by-goal status output driving the `expected false to be true` assertion failure.
- Identify the narrowest owning seam and apply the smallest truthful repair.
- Leave docs, workpad, and validation evidence clear enough that future lanes can distinguish this repaired evaluation seam from `CO-46`.

## Non-Goals
- Expanding into unrelated evaluation scenarios or benchmark coverage.
- Treating an optional validation lane as a reason to leave the baseline ambiguous.
- Refactoring the evaluation harness beyond what the TypeScript smoke baseline requires.

## Stakeholders
- Product: CO operators and reviewers who need a truthful evaluation baseline during handoff work
- Engineering: evaluation harness maintainers, provider-worker owners, and future lanes that rely on `npm run eval:test`
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - the TypeScript smoke scenario returns all goals with `passed` status
  - `npm run eval:test` exits cleanly in the current workspace
  - the repaired seam is clearly attributed to the right owner layer
- Guardrails / Error Budgets:
  - keep the patch reviewable and bounded to the TypeScript smoke seam
  - preserve truthful scenario semantics and fixture behavior
  - create a follow-up issue instead of widening scope when a new unrelated defect is discovered

## User Experience
- Personas: provider-worker owner, evaluation-harness maintainer, reviewer auditing repo validation status
- User Journeys:
  - a worker reruns `npm run eval:test`, sees the exact failing TypeScript smoke goal statuses, and can map them to a concrete seam
  - the smallest truthful fix lands and the full evaluation harness suite returns green
  - a later handoff lane can cite `CO-58` directly instead of carrying unresolved evaluation-baseline ambiguity

## Technical Considerations
- Architectural Notes:
  - `evaluation/tests/harness.test.ts` currently expects every TypeScript smoke goal status to be `passed`
  - the TypeScript smoke scenario is configured in `evaluation/scenarios/typescript-smoke.json`
  - the fixture itself lives under `evaluation/fixtures/typescript-smoke`
  - the run path and goal execution semantics live in `evaluation/harness/index.ts`
- Dependencies / Integrations:
  - `evaluation/tests/harness.test.ts`
  - `evaluation/scenarios/typescript-smoke.json`
  - `evaluation/fixtures/typescript-smoke/**`
  - `evaluation/harness/index.ts`

## Open Questions
- Which TypeScript smoke goal or dependency surface is failing right now in this workspace?
- Does the regression come from the harness runner, the fixture scripts, or another runtime assumption that changed after the last known green baseline?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: Pending docs-review, live reproduction, repair, and review/elegance gates
- Design: N/A
