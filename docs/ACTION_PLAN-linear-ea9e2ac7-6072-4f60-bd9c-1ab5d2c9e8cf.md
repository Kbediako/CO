# ACTION_PLAN - CO workflow: add a truthful non-repro path for forced child-lane validation issues

## Added by Bootstrap 2026-04-12

## Summary
- Goal: encode the missing provider-worker workflow branch for forced child-lane validation issues that become clean non-repros on current main.
- Scope:
  - register the `CO-157` docs-first packet, registry mirrors, and staged workpad source
  - run an audited `docs-review` child stream before implementation
  - update the provider-worker prompt guidance with the invalidated forced-split non-repro rule
  - add focused regression coverage preserving the exact `clean-main-baseline-failures` and `cli-orchestrator-cleanup-fallout` example
- Assumptions:
  - the generic decision matrix from `CO-101` is already correct and should stay unchanged
  - the `CO-133` closeout already proves the missing decision/state/follow-up branch the prompt should describe, but this lane should make the reason selection itself more truthful for future workers

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `parallelize_now`
  - `forbid_parallel`
  - `blocked_by_dependency`
  - `clean-main-baseline-failures`
  - `cli-orchestrator-cleanup-fallout`
- Not done if:
  - workers still lack a standing contract for invalidated forced-split non-repros
  - the prompt still leaves room for fabricated child lanes or misleading `stay_serial` closeout
  - the change reopens already-green validation work
- Pre-implementation issue-quality review:
  - approved as a narrow workflow-contract lane only: docs packet, prompt guidance, and focused regression coverage; no child-lane runtime or validation-fix redesign.

## Milestones & Sequencing
1. Register the `CO-157` docs-first packet, update `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, mirror the checklist, and stage the single workpad source.
2. Run `linear child-stream --pipeline docs-review --stream co-157-docs-review --format json` and record the manifest or truthful fallback before source edits.
3. Update `buildParallelizationGuidance(...)` so the prompt explicitly covers the forced invalid-split non-repro case.
4. Add focused prompt regressions proving both first-turn and continuation prompts include the new rule.
5. Run the relevant validation floor, update the workpad/checklists, and only then decide on PR/review handoff.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- docs/task registries and the staged workpad source

## Validation
- Checks / tests:
  - `linear child-stream --pipeline docs-review`
  - focused `ProviderLinearWorkerRunner` regression run
  - repo validation floor if the final diff remains non-trivial
- Rollback plan:
  - revert the bounded prompt/test/docs updates if they blur the generic decision contract or introduce contradictory guidance

## Risks & Mitigations
- Risk: the lane drifts into validation implementation instead of workflow clarification.
  - Mitigation: keep the exact `CO-133` closeout behavior as reference truth and reject code changes outside the prompt/test/doc seam.
- Risk: the new guidance could look like a new reason code or new enforcement branch.
  - Mitigation: keep the generic matrix unchanged and describe the rule as a special-case use of existing `forbid_parallel`, `parent_only_mutation`, and `blocked_by_dependency`.
- Risk: the example loses the exact motivating cluster names and becomes vague.
  - Mitigation: preserve `clean-main-baseline-failures` and `cli-orchestrator-cleanup-fallout` verbatim in the prompt/test example.

## Approvals
- Reviewer: pending audited docs-review
- Date: 2026-04-12
