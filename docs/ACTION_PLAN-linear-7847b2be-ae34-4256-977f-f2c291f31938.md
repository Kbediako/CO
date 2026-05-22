# ACTION PLAN - CO-563 co-status terminal worker proof reconciliation

## Summary
- Goal: create the CO-563 docs-first packet and registry mirrors for reconciling `co-status --format json` current failed work when an outer provider manifest failed after successful worker handoff.
- Scope: declared docs/task packet files plus `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`; parent owns implementation, tests, validation, Linear/workpad state, GitHub/PR lifecycle, and review handoff.
- Assumptions:
  - the parent-provided source anchor is authoritative for this packet
  - the protected evidence shape is exact and must not be generalized into blanket provider-failure suppression
  - parent implementation must define authority order across `worker proof`, provider manifest status, PR/Linear terminal state, and retry state

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `co-status --format json`
  - `provider manifest`
  - `outer provider manifest`
  - `Run provider linear worker`
  - `worker proof`
  - `owner_phase=ended`
  - `owner_status=succeeded`
  - PR merged
  - Linear terminal closeout
  - `Done`
  - `retrying=0`
  - no retry metadata
- Not done if:
  - protected terms are missing
  - `co-status --format json` still reports the protected terminal-success shape as current failed work
  - wrapper diagnostic metadata from the failed `provider manifest` / `outer provider manifest` is hidden or deleted
  - active failed workers, retrying workers, failed recoveries, or workers missing terminal proof become invisible
  - authority order remains implicit
  - this child lane edits implementation, tests, Linear state, workpad, PR lifecycle, GitHub state, or review-handoff state
- Pre-implementation issue-quality review:
  - 2026-05-23: approved as a docs-first packet for an authority-ordering status contract. The issue is not narrower than the user request because it preserves the exact terminal worker-success shape, wrapper diagnostic requirement, active failed-worker negative case, explicit non-goals, Not Done If, and parity matrix.
- Fallback / refactor decision: this task touches stale/fallback diagnostic authority. The stale seam is removed, not retained: failed outer provider wrapper status must not outrank terminal `worker proof` plus PR/Linear/no-retry evidence for current active-failure classification.
- Durable retention evidence: not applicable because no fallback is retained.
- Large-refactor check: no large refactor is required for this docs packet; parent implementation should keep the change in the existing `co-status --format json` projection/classification path unless source inspection proves authority is split across multiple lifecycle phases.

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `co-status --format json` active-failure classification | Failed `outer provider manifest` status can outrank terminal `worker proof` plus PR/Linear/no-retry evidence and appear as current failed work. | remove fallback | CO-563 | Provider wrapper exits `1` after successful worker handoff and terminal closeout. | 2026-05-22 | 2026-05-23 | Not retained | Parent implementation defines authority order so the protected terminal-success shape is reconciled while diagnostics remain visible. | Focused status projection/classification regression for the protected shape plus negative cases for active failed and retrying workers. |

## Milestones & Sequencing
1. [x] Create PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and `.agent` mirror.
2. [x] Preserve source anchor, source object id, parent manifest pointer, and source payload pointer.
3. [x] Add user request translation, protected terms, wrong interpretations to reject, explicit non-goals, Not Done If, and parity matrix.
4. [x] Record fallback/refactor decision for stale outer-provider-manifest active-failure authority.
5. [x] Add CO-563 registry mirrors in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
6. [ ] Parent reconciles this packet against authoritative Linear issue/workpad truth.
7. [ ] Parent inspects the `co-status --format json` projection/classification seam and provider-worker proof hydration path.
8. [ ] Parent implements explicit authority order while preserving wrapper diagnostics.
9. [ ] Parent adds focused protected-shape and negative-case tests.
10. [ ] Parent runs scoped validation, review, PR lifecycle, and Linear handoff.

## Parent-Owned Follow-On Plan
1. Locate the active-failure classification path for `co-status --format json`.
2. Locate the source of `worker proof`, provider manifest status, PR/Linear closeout, and retry state in the status projection.
3. Implement the smallest authority-ordering change:
   - active retry state wins and keeps work visible
   - failed/non-terminal/missing worker proof keeps work visible
   - terminal worker proof plus PR merged, Linear `Done`, `retrying=0`, and no retry metadata can reconcile the failed wrapper status
   - failed wrapper status remains diagnostic metadata
4. Add focused regressions for the protected shape and for active failed/retrying/missing-proof cases.
5. Run parent-owned docs/review validation and lifecycle handoff.

## Dependencies
- Source anchor `ctx:sha256:2ffaef00b6fc6b80a7385f652721e23337078b369b67cb0688c5bdc2b89b645d#chunk:c000001`.
- Source object id `sha256:2ffaef00b6fc6b80a7385f652721e23337078b369b67cb0688c5bdc2b89b645d`.
- Parent manifest `.runs/linear-7847b2be-ae34-4256-977f-f2c291f31938-docs-spec-packet/cli/2026-05-22T18-47-10-870Z-5f1e1807/manifest.json`.
- Parent source payload `.runs/linear-7847b2be-ae34-4256-977f-f2c291f31938-docs-spec-packet/cli/2026-05-22T18-47-10-870Z-5f1e1807/memory/source-0/source.txt`.
- Parent-owned `co-status --format json` projection/classification and provider-worker proof source seams.

## Validation
- Child-lane checks:
  - `git diff --check -- <owned files>`
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - protected-term scan over declared files
  - `git status --short` confirms changed files stay inside the declared file scope
- Parent-owned checks:
  - protected terminal-success shape no longer appears as current failed work
  - active failed worker remains visible
  - retrying or retry metadata remains visible
  - missing, failed, or non-terminal worker proof remains visible
  - failed outer provider wrapper diagnostic metadata remains present
- Rollback plan: remove the CO-563 docs packet and registry mirror rows from the parent patch import; no source, Linear, GitHub, PR, or review lifecycle rollback is required from this child lane.

## Risks & Mitigations
- Risk: wrapper failure is hidden instead of preserved.
  - Mitigation: Not Done If and validation require diagnostic metadata to remain visible.
- Risk: active failed workers are accidentally filtered.
  - Mitigation: parent-owned negative tests cover active failed and retrying workers.
- Risk: worker proof success is trusted without enough corroboration.
  - Mitigation: target authority matrix requires PR merged, Linear `Done`, `retrying=0`, and no retry metadata.
- Risk: fix broadens into unrelated status or lifecycle behavior.
  - Mitigation: packet records explicit non-goals for Linear/GitHub/PR mutation, degraded-read behavior, machine-status timeout behavior, and broad provider failure suppression.

## Approvals
- Docs packet child lane: produced in this workspace for parent patch export.
- Parent implementation/review/Linear lifecycle: pending parent ownership.
- Date: 2026-05-23
