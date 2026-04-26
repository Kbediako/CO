# ACTION_PLAN - CO: split repo-authoritative mode from downstream compatibility mode

## Summary
- Goal: prepare CO-385 for implementation by defining the repo-authoritative and downstream compatibility mode split before source/test changes.
- Scope: docs-first packet, task checklist, task registry entry, and docs/TASKS snapshot only in this child lane.
- Assumptions:
  - the parent prompt carries the authoritative CO-385 protected wording
  - the referenced source payload is not available in this child checkout
  - parent owns source/test implementation, Linear state, workpad, PR lifecycle, docs-review, and full validation

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO: split repo-authoritative mode from downstream compatibility mode.`
  - `repo-authoritative execution mode`
  - `repo-local config`
  - `canonical CO pipelines`
  - `packaged fallback config/pipelines`
  - `explicit downstream compatibility mode or adapter`
  - `operator output names active mode and why`
  - `CI exercises both modes separately`
- Not done if:
  - repo-local runs can silently use packaged fallback config as normal path
  - compatibility fallback remains indistinguishable from authoritative repo execution in manifests/status/operator output
  - implementation removes downstream compatibility
  - implementation duplicates CO-380, CO-381, or CO-382 scope
- Pre-implementation issue-quality review:
  - 2026-04-26: issue is an alignment lane, not a tiny docs-only tweak, because correctness depends on exact mode naming, output truth, and separate CI treatment.
  - 2026-04-26: parent should not proceed if the implementation plan only adds fallback warnings without a mode split.

## Milestones & Sequencing
1. Create the CO-385 PRD, canonical TECH_SPEC, ACTION_PLAN, and task checklist from the parent-provided protected wording.
2. Register the canonical TECH_SPEC and checklist in `tasks/index.json`.
3. Add the CO-385 snapshot to `docs/TASKS.md`.
4. Parent runs docs-review and resolves any packet findings.
5. Parent implements the authority-mode decision near config/pipeline resolution.
6. Parent threads mode and reason through manifest/status/operator output.
7. Parent adds targeted CI/tests for repo-authoritative and downstream compatibility modes separately.
8. Parent runs the normal validation/review/PR lifecycle.

## Parent-Owned Implementation Notes
- Repo-authoritative mode should be the normal CO repo path and require repo-local config plus canonical CO pipelines.
- Downstream compatibility mode or adapter should be explicit before packaged fallback config/pipelines are allowed.
- Operator output should state both the active mode and the selection reason.
- Machine-readable output should preserve at least mode, reason, config source, pipeline source, and fallback allowance.
- Public packaged behavior should not change without a migration path.
- 2026-04-26 parent implementation uses `--config-mode` / `CODEX_ORCHESTRATOR_CONFIG_MODE` for the explicit split, preserves `--repo-config-required` as a migration alias, and records `config_resolution` in plan output and manifests.

## Dependencies
- Source anchor `ctx:sha256:2d8ef5d9cc274d0e7e06cb774c3f7e24b0efecd258411a566b314e62c089bd63#chunk:c000001`
- Parent manifest `.runs/linear-902025f4-f954-41e5-9dcb-9c3d2d12741f-docs-packet-v2/cli/2026-04-26T01-37-33-415Z-a122aed5/manifest.json`
- `tasks/specs/linear-902025f4-f954-41e5-9dcb-9c3d2d12741f.md`
- `tasks/index.json`
- parent-owned implementation and validation lanes

## Validation
- Child-lane checks:
  - parse `tasks/index.json`
  - run scoped `git diff --check` for owned files
  - inspect scoped changed-file list
- Parent-owned checks:
  - targeted authoritative-mode denial tests
  - targeted compatibility-mode fallback tests
  - manifest/status/operator output assertions
  - separate CI coverage for both modes
  - normal parent validation floor
- Rollback plan:
  - revert only the CO-385 docs packet and task registry edits if parent source evidence changes the issue shape before implementation

## Risks & Mitigations
- Risk: warning-only fallback labeling is mistaken for the requested mode split.
  - Mitigation: acceptance requires packaged fallback config/pipelines to move behind explicit downstream compatibility mode or adapter.
- Risk: downstream compatibility is accidentally removed.
  - Mitigation: non-goals and validation require compatibility to remain available through an explicit path.
- Risk: scope drifts into CO-380, CO-381, or CO-382.
  - Mitigation: packet names those issues as separate policy owners and rejects duplicate scope.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-26
- Parent docs-review / implementation approval: pending
