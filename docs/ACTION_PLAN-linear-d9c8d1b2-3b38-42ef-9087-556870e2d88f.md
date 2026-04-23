# ACTION_PLAN - CO: define preserved historical task-stub status semantics without triggering freshness or archive automation

## Summary
- Goal: create the CO-311 docs-first packet and registry mirrors for the preserved historical task-stub status-semantics follow-up.
- Scope: packet files, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry rows for the new CO-311 surfaces only.
- Assumptions:
  - the shared source-0 payload is metadata-only and does not contain the live issue description
  - the live issue description reconciled read-only from Linear on 2026-04-22 is the authoritative wording for protected terms, non-goals, and not-done-if language
  - parent owns tooling/docs implementation, Linear state/workpad, review, validation, and PR lifecycle

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `tasks/tasks-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
  - `docs/docs-freshness-registry.json`
  - `scripts/docs-freshness.mjs`
  - `scripts/implementation-docs-archive.mjs`
  - `active`
  - `archived`
  - `canonical task key`
  - `historical stub`
  - `docs:freshness:maintain`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Not done if:
  - preserved historical task-key stubs still have only two bad choices: ordinary active freshness debt or immediate archive eligibility
  - repo tooling remains ambiguous about whether a preserved historical stub should be treated as active current evidence, an archive stub, or a third explicit class
  - a future lane preserving a task-key stub still has to hand-roll an ad hoc status choice without docs/tooling guidance
- Pre-implementation issue-quality review:
  - 2026-04-22: the live CO-311 description makes this a preserved historical task-stub semantics lane across docs freshness and implementation-doc archiving, not a narrower CO-308 fix or a packet reconstruction task.
  - 2026-04-22: the micro-task path is not appropriate because correctness depends on exact protected wording, exact non-goals, explicit not-done-if language, and a current/reference/target parity contract before implementation starts.

## Milestones & Sequencing
1. Reconcile the metadata-only source payload with the live read-only CO-311 issue description.
2. Draft the CO-311 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
3. Register the new canonical spec and checklist in `tasks/index.json`.
4. Add a current CO-311 snapshot to `docs/TASKS.md`.
5. Add docs freshness registry rows only for the new CO-311 packet/checklist surfaces.
6. Validate edited JSON registries and the scoped git diff.
7. Leave changes uncommitted for parent patch export.

## Parent-Owned Follow-On Plan
1. Define the truthful preserved historical task-stub status model, including when the stub remains authoritative for tooling and when it becomes archive-eligible.
2. Update the relevant tooling/docs surfaces so preserved stubs are not forced into false active freshness debt or immediate archive eligibility.
3. Verify the example preserved stub `tasks/tasks-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md` can be represented truthfully without recreating the missing Apr 21 packet files or reopening CO-308.
4. Run parent docs-review and the parent-selected focused validation for the touched tooling/docs paths.

## Dependencies
- Linear issue `CO-311`
- Source anchor `ctx:sha256:74b4c465c76042caa48680e8f6d1a67f1d95f056492747a6a11231781f41381a#chunk:c000001`
- `tasks/tasks-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- `docs/docs-freshness-registry.json`
- `scripts/docs-freshness.mjs`
- `scripts/implementation-docs-archive.mjs`
- `tasks/index.json`
- `docs/TASKS.md`

## Validation
- Child-lane checks:
  - JSON parse check for `tasks/index.json`
  - JSON parse check for `docs/docs-freshness-registry.json`
  - scoped `git diff --check`
  - touched-file diff review
- Parent-lane checks:
  - docs-review before tooling/docs source edits
  - focused validation proving preserved historical stubs no longer become false active debt or immediate archive candidates
  - parent review / PR handoff gates
- Rollback plan:
  - revert only the CO-311 packet and registry mirror edits if parent issue reconciliation changes the status-semantics scope before implementation

## Risks & Mitigations
- Risk: metadata-only source payload causes the packet to miss protected issue wording.
  - Mitigation: live issue description was reconciled read-only from Linear and is preserved throughout the packet.
- Risk: parent implementation broadens into a generic docs-freshness or archive-policy redesign.
  - Mitigation: packet repeatedly bounds the work to preserved historical task-key stubs and rejects blanket migrations or policy weakening.
- Risk: the follow-up gets interpreted as missing historical packet reconstruction.
  - Mitigation: packet explicitly rejects recreating the missing Apr 21 packet files and keeps CO-308 reopening out of scope.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-22
- Parent docs-review / implementation approval: pending
