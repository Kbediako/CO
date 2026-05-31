# ACTION_PLAN - CO-589 suppress released terminal failed proofs from current status

## Summary
- Goal: remove the stale current-status authority path that lets terminal released historical failed proof appear as active failed work.
- Scope: docs-first packet, focused projection fix, regression tests, status proof, validation, review, PR, and Linear closeout.
- Assumptions: CO-398 is completed fallback lineage, CO-582 is the live reproduction, and CO-555 is completed so CO-589 is the active owner.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `co-status --format json`
  - `co-status --format json --dashboard`
  - `/ui/data.json`
  - `selected_issue_identifier`
  - `issues[]`
  - `display_status=failed`
  - `provider_linear_worker_proof`
  - `provider_debug_snapshot.claim`
  - `provider_issue_released:not_active`
  - `compatibility issue projection fallback`
  - `CO-398`
  - `CO-582`
- Not done if:
  - terminal released failed proof still drives current selected/active status
  - non-terminal failed work is hidden
  - proof history is deleted or provider-intake is manually cleaned as the fix
  - CLI/API/UI status surfaces disagree
- Pre-implementation issue-quality review:
  - Live CO-589 is In Progress with correct labels and workpad.
  - Live CO-555 is Done, so CO-589 is not a duplicate active owner.
  - Live CO-582 is Done while status projection still shows failed current work.
- Fallback / refactor decision: this task touches high-churn control-host status fallback behavior. Remove the expired selected-run/read-model authority behavior that lets retained failed proof drive current status; justify retaining source-labeled proof/debug audit visibility.
- Large-refactor decision: focused repair is acceptable because one selected-run/read-model reconciliation predicate removes expired current-status authority without adding a new authority source, lifecycle phase, or display-only compatibility path.
- Minor-seam decision: do not add another minor seam; keep retained proof/debug payloads source-labeled and subordinate to the existing current-status authority boundary.

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `control-host status surfaces` | Retained failed proof can drive current status after terminal released same-issue truth. | remove fallback | CO-589 / CO-398 | `provider_issue_released:not_active` plus terminal issue truth and no active retry/running authority still projects `failed`. | CO-398 lineage, recurrence observed 2026-05-31 | 2026-05-31 | N/A after removal | The CO-582 shape no longer appears as current work. | Focused projection tests, ControlRuntime UI/read-model regression, and local `co-status` proof. |
| `control-host status surfaces` | Source-labeled retained proof/debug history remains visible as audit evidence. | justify retaining fallback | CO-589 / CO-398 | Operator diagnosis needs historical failed proof after current-status suppression. | CO-398 lineage | 2026-05-31 | Non-expiring durable audit contract while source-labeled | Remove only with replacement schema preserving current authority, retained proof, source labels, and degraded reason. | Projection tests and ControlRuntime proof show retained proof cannot drive current selected/active authority. |

- Durable retention evidence:
  - contract name: control-host source-labeled retained proof audit evidence
  - owning surface: `control-host status surfaces`
  - steady-state proof: terminal released failed proof is reconciled and suppressed from current selected/issues while retained `provider_linear_worker_proof` and `provider_debug_snapshot` remain source-labeled audit evidence.
  - tests/docs: `tests/selected-run-projection.spec.ts`, `orchestrator/tests/ControlRuntime.test.ts`, and the CO-589 PRD/TECH_SPEC/task packet.
  - non-expiring rationale: this is a durable operator audit contract, not temporary compatibility debt; removal requires a replacement schema preserving current authority, retained proof, source labels, and degraded reason.

## Milestones & Sequencing
1. Create CO-589 docs-first packet and registry mirrors.
2. Record parallelization decision and run docs-review before source edits.
3. Inspect existing selected-run/read-model projection tests and add failing CO-582-shaped regression.
4. Implement the minimal shared predicate or authority-order fix in selected-run reconciliation before presenter rendering.
5. Run focused tests and local `co-status --format json --dashboard` proof.
6. Run required validation/review, open PR, drain automated review/checks, merge, and close out workpad/Linear.

## Dependencies
- Linear CO-589, related CO-398 and CO-582.
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
- `orchestrator/tests/CompatibilityIssuePresenter.test.ts`
- `orchestrator/tests/ControlRuntime.test.ts`
- `orchestrator/tests/CoStatusCliShell.test.ts`

## Validation
- Checks / tests:
  - docs-first JSON and protected-term checks
  - docs-review manifest
  - focused status projection regression tests
  - `co-status --format json --dashboard` local proof
  - normal validation floor and standalone review
- Rollback plan: revert only CO-589 packet/source/test changes; do not mutate provider-intake state or Linear terminal issues to hide the symptom.

## Risks & Mitigations
- Risk: hiding a real failed non-terminal run.
  - Mitigation: add a negative regression where non-terminal failed proof remains visible.
- Risk: proof history disappears.
  - Mitigation: assert proof/debug data remains source-labeled audit evidence where schema supports it.
- Risk: another compatibility seam is added.
  - Mitigation: require one predicate/authority decision shared by selected and active issue projection paths.

## Approvals
- Reviewer: parent CO orchestrator
- Date: 2026-05-31
