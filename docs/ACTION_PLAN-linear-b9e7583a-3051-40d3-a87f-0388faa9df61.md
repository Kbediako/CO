# ACTION_PLAN - CO-441 re-home live docs freshness maintenance owner after terminal CO-427

## Summary
- Goal: create the CO-441 docs-first packet and perform the narrow tactical `docs:freshness:maintain` owner re-home after terminal `CO-427`.
- Scope: packet docs, task mirrors, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `docs/docs-catalog.json`, and `docs/guides/docs-freshness-cohorts.md`.
- Assumptions:
  - CO-441 is the intended tactical current live-owner hold for canonical owner key `docs:freshness:maintain`.
  - CO-330 remains scoped to provider-refresh recovery.
  - CO-431 remains the structural/root automation owner.
  - Parent owns `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, Linear state, workpad, validation, and PR lifecycle.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness:maintain`
  - `rolling freshness cohort`
  - `CO-427`
  - `configured_owner_terminal`
  - canonical owner key `docs:freshness:maintain`
  - `CO-330`
  - `CO-431`
- Not done if:
  - protected terms or exact packet surfaces are missing
  - the packet implies CO-330 should absorb docs freshness owner repair
  - the packet implies CO-441 replaces CO-431
  - the child lane edits parent-owned live owner metadata or source code
  - parent catalog/cohort-guide edits exceed the narrow CO-441 owner re-home and lineage evidence
  - `docs:freshness` or `docs:freshness:maintain` behavior is weakened
- Pre-implementation issue-quality review:
  - 2026-04-30: CO-441 is narrow tactical owner re-home packet work, not CO-330 provider-refresh code and not CO-431 structural/root automation work.
  - 2026-04-30: the micro-task path is unavailable because correctness depends on protected terms, exact surfaces, and canonical owner marker compatibility.
  - 2026-04-30: parent-owned live owner repair follows packet setup; the child lane stops at patch artifact.
- Fallback / refactor decision: packet setup does not add or extend fallback/seam behavior. Parent repair must preserve existing `docs:freshness:maintain` fail-closed behavior and rolling freshness cohort visibility.
- Durable retention evidence: Not applicable for this child lane; no fallback is retained or changed here.
- Large-refactor check: Not applicable for packet setup. CO-431 remains the structural/root automation owner outside this tactical packet.

## Milestones & Sequencing
1. Read recent CO-425/CO-427/CO-430 owner re-home packet patterns.
2. Create PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and agent mirror for CO-441.
3. Register the CO-441 task in `tasks/index.json`.
4. Add a top `docs/TASKS.md` packet-only snapshot.
5. Add six active rows to `docs/docs-freshness-registry.json` for packet and mirror docs.
6. Reproduce the terminal-owner maintenance blocker.
7. Re-home `docs/docs-catalog.json` rolling owner metadata to live `CO-441`.
8. Update `docs/guides/docs-freshness-cohorts.md` so `CO-427` is terminal historical evidence and `CO-441` is current owner.
9. Run scoped JSON parse, path, protected-term, docs freshness, and full repo checks.
10. Complete standalone review, explicit elegance review, PR lifecycle, and Linear handoff.

## Dependencies
- Linear issue `CO-441` / `b9e7583a-3051-40d3-a87f-0388faa9df61`.
- Source terminal owner `CO-427`.
- Canonical owner key `docs:freshness:maintain`.
- Parent-owned `docs/docs-catalog.json`.
- Parent-owned `docs/guides/docs-freshness-cohorts.md`.
- Source manifest `.runs/linear-b9e7583a-3051-40d3-a87f-0388faa9df61-docs-packet/cli/2026-04-30T05-13-56-467Z-10e9a902/manifest.json`.

## Validation
- Checks / tests:
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - `docs:freshness`
  - `docs:freshness:maintain -- --format json`
  - required repo validation gates before PR handoff
  - standalone review and explicit elegance review
  - targeted path scan for `linear-b9e7583a-3051-40d3-a87f-0388faa9df61` and `CO-441`
  - targeted protected-term scan for `docs:freshness:maintain`, `rolling freshness cohort`, `CO-427`, `configured_owner_terminal`, canonical owner key `docs:freshness:maintain`, `CO-330`, and `CO-431`
- Rollback plan:
  - revert only the CO-441 packet files, task index item, task snapshot, registry rows, catalog owner change, and cohort-guide owner-lineage changes if the parent rejects the patch.

## Risks & Mitigations
- Risk: packet setup is mistaken for live owner repair.
  - Mitigation: packet states the child lane is packet-only and the parent owns `docs/docs-catalog.json` plus `docs/guides/docs-freshness-cohorts.md`.
- Risk: CO-441 is mistaken for CO-431 replacement.
  - Mitigation: packet states CO-431 remains structural/root automation owner.
- Risk: terminal owner evidence is softened.
  - Mitigation: keep `CO-427`, `configured_owner_terminal`, and canonical owner key `docs:freshness:maintain` visible across packet surfaces.

## Approvals
- Reviewer: CO-441 parent lane
- Date: 2026-04-30
