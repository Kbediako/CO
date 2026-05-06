# ACTION_PLAN - CO-505 docs/TASKS historical path normalization

## Summary
- Goal: normalize historical in-repo `docs/TASKS.md` evidence paths from `/Users/kbediako` and `../../.runs` forms to repo-relative references without changing `CO-503` stale-spec classification metadata.
- Scope: docs-first packet, parent-owned `docs/TASKS.md` path inventory and normalization, external exception annotation, parent-owned registry/checklist registration, docs validation, review, PR, and handoff.
- Assumptions: the parent workpad inventory is the current implementation authority; this child lane owns only packet files and does not edit `docs/TASKS.md` or registry mirrors.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `normalize docs/TASKS.md historical in-repo evidence paths`, `/Users/kbediako`, `../../.runs`, `repo-relative references`, `.runs/...`, `out/...`, `orchestrator/...`, `tasks/...`, `docs/...`, `preserve historical meaning`, `document external exceptions`, `CO-503`, PR `#781`, `npm run docs:check`, `npm run docs:freshness`.
- Not done if: unannotated in-repo `/Users/kbediako` paths remain, in-repo run evidence still uses `../../.runs`, external references are mishandled, historical meaning is lost, `CO-503` stale-spec metadata changes, or docs validation fails after cleanup.
- Pre-implementation issue-quality review: complete for the docs-packet phase. The issue contract names the exact path families, target file, external-exception rule, non-goals, and validation gates; it is not a narrower interpretation of the user request.
- Fallback / refactor decision: this task touches historical/stale evidence metadata. The decision is `remove fallback` for in-repo machine-local and upward-traversal path forms, and `justify retaining fallback` only for genuine external provenance that cannot be truthfully represented as repo-relative.
- Durable retention evidence: historical `docs/TASKS.md` entries remain; the parent only changes path syntax or adds external exception notes.
- Large-refactor check: not applicable because this is a bounded docs metadata cleanup with no code behavior seam.

## Milestones & Sequencing
1. Create the CO-505 docs-first packet and task mirrors within the docs-packet child scope.
2. Parent inventories all `docs/TASKS.md` `/Users/kbediako` and `../../.runs` references before editing.
3. Parent classifies each match as in-repo evidence or genuine external provenance.
4. Parent normalizes in-repo paths to repo-relative forms and annotates external exceptions.
5. Parent registers or updates canonical task mirrors without widening into `CO-503` stale-spec metadata.
6. Parent runs docs validation, standalone/elegance review as required, PR handoff, and `ready-review` drain.

## Dependencies
- Parent-owned workpad and Linear issue state.
- Parent-owned `docs/TASKS.md` inventory.
- Parent-owned `tasks/index.json` and `docs/docs-freshness-registry.json` registration if needed.
- Source anchors:
  - `ctx:sha256:f6df0cd43c7fd87ced32d0e8e02d78b6c4bfecdd0101b7e7842036baee221aaf#chunk:c000001`
  - `ctx:sha256:9162b6d23db3df6c0bb33e8c326c782fc46c9471ade9462f9710744d3fec4728#chunk:c000001`

## Validation
- Checks / tests:
  - packet-only child validation: verify the six owned files exist and contain the CO-505 source anchor and protected terms
  - parent path inventory for `/Users/kbediako` and `../../.runs` in `docs/TASKS.md`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - parent-required broader validation floor before review handoff
  - manifest-backed standalone review and explicit elegance/minimality pass if the final diff is non-trivial
- Rollback plan: revert the metadata-only path normalization and packet/registry entries; no source code, tests, or guard behavior should be involved.

## Risks & Mitigations
- Risk: a genuine external reference is incorrectly made repo-relative.
  - Mitigation: parent classifies each path before editing and leaves an explicit exception note when the target is outside the repo.
- Risk: historical meaning is lost during path cleanup.
  - Mitigation: preserve surrounding issue, PR, command, timestamp, and evidence wording; edit only path syntax or exception annotation.
- Risk: the lane drifts into `CO-503` stale-spec classification metadata.
  - Mitigation: keep `last_review`, owner status, terminal classification, and docs-freshness status out of scope unless the parent explicitly relaunches with widened ownership.
- Risk: child packet edits collide with parent-owned registries.
  - Mitigation: child owns only the six declared packet files; parent owns all registry and lifecycle surfaces.

## Approvals
- Reviewer: Codex docs-packet child lane for packet readiness; parent review pending for implementation.
- Date: 2026-05-07
