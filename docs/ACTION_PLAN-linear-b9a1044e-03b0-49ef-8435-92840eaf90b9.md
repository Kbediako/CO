# ACTION_PLAN - CO-429 CO-41 March 30 docs freshness registry residue

## Traceability
- Linear issue: `CO-429` / `b9a1044e-03b0-49ef-8435-92840eaf90b9`
- Task id: `linear-b9a1044e-03b0-49ef-8435-92840eaf90b9`
- Source anchor: `ctx:sha256:6f806cf061b8e0e53fb6fe7aee6632291dee47ba4a31e8a1049cfe8b990ac5dd#chunk:c000001`
- Origin manifest: `.runs/linear-b9a1044e-03b0-49ef-8435-92840eaf90b9-packet-docs-r2/cli/2026-04-30T01-05-07-858Z-79e4c026/manifest.json`

## Summary
- Goal: Create the CO-429 docs-first packet for CO-41 March 30 docs-freshness registry residue.
- Scope: docs packet creation only in this child lane.
- Assumptions:
  - Six CO-41 packet/mirror rows for `linear-af97d673-43a4-4a36-8738-b7f61e5b71a1` remain in `docs/docs-freshness-registry.json` with `last_review=2026-03-30` and `cadence_days=30`.
  - Parent evidence confirms `CO-41` is in terminal Done Linear state.
  - Parent evidence confirms `tasks/index.json` plus task specs already carry Apr 19 review evidence.

## Protected Terms
- `docs:freshness`
- `docs:freshness:maintain`
- `docs/docs-freshness-registry.json`
- `linear-af97d673-43a4-4a36-8738-b7f61e5b71a1`
- `CO-41`
- `last_review=2026-03-30 registry rows`
- `task spec last_review=2026-04-19`
- `terminal Done Linear state`
- `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/specs|last_review:2026-03-30|cadence_days:30`

## Not Done If
- The packet implies CO-428 changes.
- The packet expands into provider/control-host implementation.
- The packet proposes deleting CO-41 packet docs.
- The packet weakens `docs:freshness` or `docs:freshness:maintain`.
- The child lane edits files outside the six declared CO-429 packet files.

## Milestones & Sequencing
1. Create the PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror for `linear-b9a1044e-03b0-49ef-8435-92840eaf90b9`.
2. Verify the packet preserves protected terms, target residue paths, non-goals, Not Done If criteria, and validation split.
3. Leave the six-file patch in place for parent import.
4. Parent verifies current `docs:freshness` / `docs:freshness:maintain` output.
5. Parent repairs the six CO-41 `last_review=2026-03-30 registry rows` in `docs/docs-freshness-registry.json` using Apr 19 evidence.
6. Parent runs required docs freshness, registry, Linear/workpad, PR, and review lifecycle validation.

## Dependencies
- CO-41 task id: `linear-af97d673-43a4-4a36-8738-b7f61e5b71a1`
- Target registry: `docs/docs-freshness-registry.json`
- Existing review evidence: `task spec last_review=2026-04-19`
- Owner classifier key: `docs_freshness_candidate|doc_class:task_packet|path_family:tasks/specs|last_review:2026-03-30|cadence_days:30`

## Validation
- Child-lane checks:
  - trailing-whitespace check over the six scoped CO-429 files
  - protected-term coverage check over the six scoped CO-429 files
  - changed-path scope check for declared files only
- Parent validation:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - any required registry/task snapshot, review, PR, and closeout gates

## Rollback / Recovery
- Revert only the CO-429 packet docs if the parent rejects the packet shape.
- Do not delete CO-41 packet docs to clear freshness.
- If registry repair uncovers broader residue, parent should relaunch or create a separate owner lane rather than widening this child patch.

## Risks & Mitigations
- Risk: March 30 registry residue is treated as proof CO-41 docs are obsolete.
  - Mitigation: the packet explicitly preserves CO-41 packet docs and targets registry metadata only.
- Risk: the repair weakens freshness gates.
  - Mitigation: `docs:freshness` and `docs:freshness:maintain` remain parent validation gates.
- Risk: scope drifts into CO-428 or provider/control-host code.
  - Mitigation: non-goals and Not Done If criteria reject both.

## Approvals
- Child docs packet: scoped checks passed on 2026-04-30
- Parent registry repair: implemented on 2026-04-30; six CO-41 rows now align with Apr 19 review evidence.
- Parent lifecycle: blocked before review handoff by the separate CO-428 March 30 active-spec cohort.
