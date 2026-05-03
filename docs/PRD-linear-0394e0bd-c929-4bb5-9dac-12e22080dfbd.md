# PRD - CO-424 prevent provider-worker post-handoff closeout parallelization false failures

## Traceability
- Linear issue: `CO-424` / `0394e0bd-c929-4bb5-9dac-12e22080dfbd`
- Linear URL: https://linear.app/asabeko/issue/CO-424
- Task id: `linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd`
- Canonical spec: `tasks/specs/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- Task checklist: `tasks/tasks-linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- Agent mirror: `.agent/task/linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd.md`
- Related evidence anchor: `CO-423` / `PR #721`

## Summary
- Problem Statement: `provider-linear-worker` can falsely fail post-handoff closeout on active-turn parallelization invariants after the lane has already reached `review handoff`, `merge handoff`, or `post-merge/Done closeout`. The issue report names false failure modes `parallelization_decision_missing` and `parallelization_serial_conflict`, especially where the correct lifecycle path is serial or no-parallel work recorded as `stay_serial` or `forbid_parallel`.
- Desired Outcome: create the CO-424 docs-first traceability packet and registry mirrors only, so a later implementation lane can repair post-handoff closeout classification without weakening ordinary active-turn same-issue child lanes enforcement.

## User Request Translation
- User intent / needs: prepare CO-424 to leave Backlog later by creating the docs packet that preserves the exact provider-worker closeout bug shape, protected terms, non-goals, and validation expectations. This setup lane must not implement the source fix.
- Success criteria / acceptance:
  - PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror exist for `linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd`.
  - `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the CO-424 packet consistently.
  - The packet preserves protected terms: `parallelization_serial_conflict`, `parallelization_decision_missing`, `stay_serial`, `forbid_parallel`, `same-issue child lanes`, `review handoff`, `merge handoff`, `post-merge/Done closeout`, `provider-linear-worker`, `proof lock`, `CO-423`, and `PR #721`.
  - The packet states this lane is setup/traceability only and that parent/future implementation owns source, tests, source-fix Linear/GitHub lifecycle, and final validation. Normal packet PR/workpad attachment is allowed for traceability.
  - The packet rejects disabling parallelization invariants, launching fake child lanes for handoff, weakening proof lock safety, or treating review/merge closeout as a fresh active implementation turn.
- Constraints / non-goals:
  - no implementation source or test edits
  - no source-fix Linear or GitHub lifecycle beyond packet PR/workpad attachment
  - no implementation branch push or source-fix PR creation
  - no changes outside the six packet files and three registry mirrors

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO: prevent provider-worker post-handoff closeout from false-failing on parallelization invariants`
  - `parallelization_serial_conflict`
  - `parallelization_decision_missing`
  - `stay_serial`
  - `forbid_parallel`
  - `same-issue child lanes`
  - `review handoff`
  - `merge handoff`
  - `post-merge/Done closeout`
  - `provider-linear-worker`
  - `proof lock`
  - `CO-423`
  - `PR #721`
- Protected artifact and surface names:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `provider-linear-worker-proof.json`
  - `provider-linear-worker-linear-audit.jsonl`
  - `provider-linear-worker-child-lanes.json`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
- Nearby wrong interpretations to reject:
  - disabling `parallelization_decision_missing` or `parallelization_serial_conflict` globally
  - allowing active implementation turns to complete without exactly one current-turn parallelization decision
  - requiring no-op same-issue child lanes during `review handoff`, `merge handoff`, or `post-merge/Done closeout`
  - treating `stay_serial` or `forbid_parallel` as invalid merely because older same-issue child lanes exist in the proof/audit sidecars
  - weakening `proof lock` acquisition, stale-lock recovery, or `provider-linear-worker-proof.json` durability
  - mutating `CO-423`, `PR #721`, Linear state, GitHub state, or shared-root closeout from this setup lane

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Active-turn parallelization invariant | Active provider turns must record exactly one current-turn decision and enforce child-lane proof for `parallelize_now`. | `parallelization_decision_missing`, `parallelization_serial_conflict`, and related failures remain valid for active implementation turns. | CO-424 preserves these active-turn invariants while narrowing the post-handoff false-failure path. | Disabling or broadening ordinary same-issue child lanes enforcement. |
| Post-handoff closeout | Issue report says closeout can false-fail after `review handoff`, `merge handoff`, or `post-merge/Done closeout`. | Lifecycle handoff/closeout states are not ordinary active implementation turns that should invent child-lane work. | Future implementation classifies handoff closeout separately so valid `stay_serial` or `forbid_parallel` evidence does not become `parallelization_serial_conflict`, and missing active-turn decisions do not become `parallelization_decision_missing` after terminal handoff. | Source implementation in this setup lane. |
| Same-issue child lanes | Prior child-lane history may remain in `provider-linear-worker-child-lanes.json` and proof sidecars. | Only current-turn same-issue child lanes should drive active-turn serial conflict checks. | Future fix avoids treating stale or already-accepted child-lane residue as a fresh conflict during handoff closeout. | Launching fake child lanes to satisfy closeout. |
| CO-423 / PR #721 | The issue description names `CO-423` and `PR #721` as trace anchors. | Related historical evidence should shape the repro without being mutated. | Packet preserves the anchor and leaves live reproduction to the implementation lane. | Linear/GitHub mutation or shared-root reconciliation. |
| Proof lock | Provider worker proof writes are guarded by lock behavior. | Lock safety must remain fail-closed and durable. | Future implementation must not weaken `proof lock` semantics while changing closeout classification. | Manual lock deletion or proof JSON edits. |

## Not Done If
- Any protected term is omitted or renamed.
- The packet implies this setup lane implements the source fix.
- Active-turn `parallelization_decision_missing` or `parallelization_serial_conflict` enforcement is weakened.
- `review handoff`, `merge handoff`, or `post-merge/Done closeout` is treated as a reason to launch fake same-issue child lanes.
- `stay_serial` or `forbid_parallel` is treated as invalid solely because unrelated or older child-lane residue exists.
- `proof lock` safety is loosened, bypassed, or hand-edited.
- This lane mutates Linear, GitHub, `CO-423`, `PR #721`, implementation source, or tests.
- Registry mirrors are missing or inconsistent.

## Goals
- Create the CO-424 docs-first traceability packet and mirrors.
- Register the packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Preserve the bug contract for a later implementation lane.
- Keep implementation, tests, source-fix Linear/GitHub lifecycle, and source fix validation out of this setup lane while allowing packet PR/workpad attachment.

## Non-Goals
- No edits to `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- No edits to `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- No source fix for `parallelization_serial_conflict` or `parallelization_decision_missing`.
- No change to `proof lock` behavior.
- No Linear issue transition or source-fix PR lifecycle. Packet PR/workpad attachment is allowed for traceability.
- No shared-root mutation.

## Stakeholders
- Product: CO operators who need CO-424 shaped before it leaves Backlog.
- Engineering: future provider-worker implementation lane.
- Review: reviewers checking that post-handoff closeout fixes do not weaken active-turn child-lane invariants.

## Metrics & Guardrails
- Primary Success Metrics:
  - all six packet/mirror files exist
  - all protected terms are present
  - registry mirrors include the CO-424 packet
  - JSON registries parse successfully
- Guardrails / Error Budgets:
  - zero implementation/test edits
  - zero source-fix Linear/GitHub lifecycle mutations beyond packet PR/workpad attachment
  - zero source-fix behavior changes in this setup lane

## Technical Considerations
- Architectural Notes:
  - Future implementation should inspect `resolveProviderLinearWorkerParallelizationFailure(...)` and the surrounding lifecycle sequencing in `providerLinearWorkerRunner.ts`.
  - The likely fix boundary is classification and lifecycle sequencing around handoff/closeout, not the decision helper contract itself.
  - Current-turn invariants must remain strict for active implementation turns.
- Dependencies / Integrations:
  - `provider-linear-worker-proof.json`
  - `provider-linear-worker-linear-audit.jsonl`
  - `provider-linear-worker-child-lanes.json`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `No` for this setup packet.
- Rationale: CO-424 documents a provider-worker lifecycle classification bug. The packet does not add, retain, or modify fallback behavior. Future implementation must state separately whether any fallback/seam behavior is touched.

## Open Questions
- Which exact CO-423 / PR #721 artifact should become the future focused repro fixture?
- Should the implementation fix skip the invariant after confirmed handoff state, or classify handoff closeout before active-turn invariant enforcement?
- Should stale child-lane residue be filtered by current-turn timestamp, accepted/rejected decision status, or both during closeout classification?

## Approvals
- Product: parent CO-424 lane, pending
- Engineering: future implementation review, pending
- Design: N/A
