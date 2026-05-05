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
- Desired Outcome: implement and validate the CO-424 provider-worker fix so successful review/merge/Done lifecycle closeout no longer false-fails on stale parallelization proof, while ordinary active-turn same-issue child-lane enforcement remains fail-closed.

## User Request Translation
- User intent / needs: complete CO-424 by preserving the exact provider-worker closeout bug shape, implementing the source/test fix, keeping protected terms and non-goals intact, and carrying the issue through validation/review handoff.
- Success criteria / acceptance:
  - PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror exist for `linear-0394e0bd-c929-4bb5-9dac-12e22080dfbd`.
  - `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the CO-424 packet consistently.
  - The packet preserves protected terms: `parallelization_serial_conflict`, `parallelization_decision_missing`, `stay_serial`, `forbid_parallel`, `same-issue child lanes`, `review handoff`, `merge handoff`, `post-merge/Done closeout`, `provider-linear-worker`, `proof lock`, `CO-423`, and `PR #721`.
  - The implementation updates `provider-linear-worker` closeout classification, focused tests, and docs/task mirrors in the same governed lane.
  - The packet rejects disabling parallelization invariants, launching fake child lanes for handoff, weakening proof lock safety, or treating review/merge closeout as a fresh active implementation turn.
- Constraints / non-goals:
  - no weakening of active implementation-turn `parallelization_decision_missing`, `parallelization_serial_conflict`, or `parallelize_now` launch enforcement
  - no `CO-423` / `PR #721` content mutation
  - no proof-lock weakening or manual proof JSON edits
  - no broad retry scheduler rewrite

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
  - mutating `CO-423` or `PR #721` content instead of treating them as trace evidence

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Active-turn parallelization invariant | Active provider turns must record exactly one current-turn decision and enforce child-lane proof for `parallelize_now`. | `parallelization_decision_missing`, `parallelization_serial_conflict`, and related failures remain valid for active implementation turns. | CO-424 preserves these active-turn invariants while narrowing the post-handoff false-failure path. | Disabling or broadening ordinary same-issue child lanes enforcement. |
| Post-handoff closeout | Issue report says closeout can false-fail after `review handoff`, `merge handoff`, or `post-merge/Done closeout`. | Lifecycle handoff/closeout states are not ordinary active implementation turns that should invent child-lane work. | Implementation classifies closeout and lineage residue separately so valid `stay_serial`/`forbid_parallel` evidence does not become `parallelization_serial_conflict`, and terminal closeout does not become `parallelization_decision_missing` when no child lane launched and the source checkout is not dirty. | Changing team workflow states. |
| Same-issue child lanes | Prior child-lane history may remain in `provider-linear-worker-child-lanes.json` and proof sidecars. | Only current-decision/current-turn same-issue child lanes should drive active-turn serial conflict checks. | The fix filters current-turn child lanes by decision lineage where available and keeps legacy timestamp fallback for true violations. | Launching fake child lanes to satisfy closeout. |
| CO-423 / PR #721 | The issue description names `CO-423` and `PR #721` as trace anchors. | Related historical evidence should shape the repro without being mutated. | Focused tests cover the CO-423-style review handoff and post-merge/Done closeout classes without mutating historical issue/PR content. | Historical Linear/GitHub mutation or shared-root reconciliation. |
| Proof lock | Provider worker proof writes are guarded by lock behavior. | Lock safety must remain fail-closed and durable. | Command closeout demotes repeated stale proof-lock diagnostics into secondary diagnostics when an authoritative provider-worker terminal cause exists. | Manual lock deletion or proof JSON edits. |

## Not Done If
- Any protected term is omitted or renamed.
- The implementation weakens active-turn `parallelization_decision_missing` or `parallelization_serial_conflict` enforcement.
- Active-turn `parallelization_decision_missing` or `parallelization_serial_conflict` enforcement is weakened.
- `review handoff`, `merge handoff`, or `post-merge/Done closeout` is treated as a reason to launch fake same-issue child lanes.
- `stay_serial` or `forbid_parallel` is treated as invalid solely because unrelated or older child-lane residue exists.
- `proof lock` safety is loosened, bypassed, or hand-edited.
- This lane mutates `CO-423`, `PR #721`, or proof files directly.
- Registry mirrors are missing or inconsistent.

## Goals
- Keep the CO-424 docs-first packet and registry mirrors current.
- Implement provider-worker closeout filtering in `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- Add focused regressions in `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- Demote repeated stale proof-lock diagnostics in provider-worker command closeout when another terminal cause exists.
- Preserve active-turn fail-closed behavior for true same-decision serial/forbid child-lane launches.

## Non-Goals
- No broad retry scheduler rewrite.
- No disabling of `parallelization_decision_missing`, `parallelization_serial_conflict`, or `parallelize_now` launch proof.
- No manual proof-lock or proof JSON mutation.
- No edits to `CO-423` or `PR #721` content.
- No shared-root mutation.

## Stakeholders
- Product: CO operators who need provider-worker closeout to stop producing false retry noise after valid handoff/merge.
- Engineering: current provider-worker implementation lane.
- Review: reviewers checking that post-handoff closeout fixes do not weaken active-turn child-lane invariants.

## Metrics & Guardrails
- Primary Success Metrics:
  - focused CO-423-style closeout regressions pass
  - true same-decision serial/forbid violation regressions pass
  - stale proof-lock diagnostics are secondary when a distinct terminal provider-worker cause exists
  - all protected terms and registry mirrors remain current
- Guardrails / Error Budgets:
  - zero active-turn invariant weakening
  - zero historical `CO-423` / `PR #721` mutation
  - zero proof-lock safety weakening

## Technical Considerations
- Architectural Notes:
  - The implementation updates `resolveProviderLinearWorkerParallelizationFailure(...)`, effective child-lane counting, lifecycle closeout treatment, and command-stage provider-worker error details.
  - Decision lineage is preferred for distinguishing prior implementation child-lane residue from later serial/handoff decisions; timestamp behavior remains as fallback for legacy/no-lineage true violations.
  - Current-turn invariants remain strict for active implementation turns.
- Dependencies / Integrations:
  - `provider-linear-worker-proof.json`
  - `provider-linear-worker-linear-audit.jsonl`
  - `provider-linear-worker-child-lanes.json`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`, because the fix touches stale child-lane residue and stale proof-lock diagnostics.
- Decision: retain legacy timestamp fallback for child-lane records without decision lineage, but prefer lineage when present. Owner: CO-424. Review/removal trigger: after all live same-issue child-lane records carry decision lineage consistently. Validation: focused ProviderLinearWorkerRunner regressions cover lineage filtering and true same-decision violation fallback behavior.

## Open Questions
- Whether broader provider observability should expose lineage-filtered child-lane counts separately from raw child-lane counts can be handled as a follow-up if reviewers ask for it.

## Approvals
- Product: parent CO-424 lane, pending review handoff
- Engineering: current implementation review, pending
- Design: N/A
