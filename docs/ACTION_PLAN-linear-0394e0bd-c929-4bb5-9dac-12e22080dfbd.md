# ACTION_PLAN - CO-424 prevent provider-worker post-handoff closeout parallelization false failures

## Summary
- Goal: create the CO-424 docs-first traceability packet and registry mirrors so the issue can leave Backlog later.
- Scope: packet/setup only. No implementation source, tests, source-fix Linear/GitHub lifecycle, or source-fix PR work. Packet PR/workpad attachment is allowed for traceability.
- Assumptions:
  - `CO-423` and `PR #721` are trace anchors from the issue description.
  - Future implementation will work in `provider-linear-worker` closeout logic and focused tests.
  - This setup lane leaves a file-only diff for review or parent import.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
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
- Not done if:
  - this lane edits implementation source or tests
  - the packet omits protected terms or registry mirrors
  - active-turn parallelization invariants are weakened
  - handoff closeout is fixed by requiring fake same-issue child lanes
  - `proof lock` safety is bypassed
  - Linear or GitHub is mutated
- Pre-implementation issue-quality review:
  - 2026-05-04: CO-424 is not a source-fix lane yet; it is a setup/traceability lane so Backlog promotion later has exact scope and protected wording.
  - 2026-05-04: the future fix is narrower than disabling `parallelization_serial_conflict` or `parallelization_decision_missing` and broader than a docs-only wording change.
- Fallback / refactor decision: not applicable for this setup packet. Future implementation must record a separate decision if it adds or retains fallback/seam behavior.

## Milestones & Sequencing
1. Create PRD, TECH_SPEC mirror, ACTION_PLAN, canonical spec, task checklist, and `.agent` mirror.
2. Register the packet in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
3. Run lightweight file-only validation: status, protected-term/path checks, and JSON parse checks.
4. Run `npm run docs:check` and `npm run docs:freshness` only if available without dependency setup.
5. Stop with packet/setup complete; do not implement source or tests.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `provider-linear-worker-proof.json`
- `provider-linear-worker-linear-audit.jsonl`
- `provider-linear-worker-child-lanes.json`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Validation
- Checks / tests:
  - `git status --short --branch`
  - protected-term `rg` across CO-424 packet and registry mirror files
  - packet-path `rg` across registry mirrors
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - optional `npm run docs:check`
  - optional `npm run docs:freshness`
- Rollback plan:
  - revert the six CO-424 packet files plus the three registry mirror edits. No source or external state rollback should be needed because this lane does not mutate source, Linear, or GitHub.

## Risks & Mitigations
- Risk: packet wording weakens active-turn child-lane enforcement.
  - Mitigation: explicitly preserve `parallelization_serial_conflict`, `parallelization_decision_missing`, and strict active-turn same-issue child lanes behavior.
- Risk: future implementer treats handoff closeout as permission to launch no-op child lanes.
  - Mitigation: packet rejects fake child lanes for `review handoff`, `merge handoff`, and `post-merge/Done closeout`.
- Risk: proof durability is weakened while fixing closeout.
  - Mitigation: packet names `proof lock` safety as protected and out of scope for weakening.

## Approvals
- Packet setup: current bounded worker lane refreshed by parent, 2026-05-04
- Future implementation review: pending
