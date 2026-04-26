# ACTION_PLAN - CO-386 Codex CLI release-intake supersession workflow

## Summary
- Goal: create the CO-386 docs-first packet for a parent-owned Codex CLI release-intake supersession workflow.
- Scope: packet files, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and parent-owned implementation sequencing for release-intake evidence and archive-only classification.
- Assumptions:
  - source-0 contains run metadata and issue identity only
  - the parent prompt's protected terms are the operative issue-shaping contract for this child lane
  - parent owns Linear state, workpad, docs-review, implementation, validation, PR lifecycle, and final patch integration

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-386`
  - `Codex CLI release-intake`
  - `supersession workflow`
  - `local CLI`
  - `package/downstream smoke`
  - `cloud-canary`
  - `workflow pins`
  - `model posture`
  - `docs surfaces`
  - `release notes`
  - `supersedes/holds matrix`
  - `archive-only classification`
- Not done if:
  - protected terms are missing
  - local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes are collapsed into one generic evidence bucket
  - the supersedes/holds matrix is absent
  - archive-only classification is allowed for unresolved live blockers
  - this child lane edits implementation, workflow, template, package, test, or Linear surfaces
- Pre-implementation issue-quality review:
  - 2026-04-26: approved for docs packet only. The lane is not suitable for the micro-task path because correctness depends on exact protected terms and release/posture surface parity.

## Milestones & Sequencing
1. Inspect source-0 and record its metadata-only scope.
2. Create the CO-386 PRD, canonical TECH_SPEC, ACTION_PLAN, task checklist, and `.agent` mirror.
3. Register the canonical spec in `tasks/index.json`.
4. Add a current CO-386 snapshot to `docs/TASKS.md`.
5. Validate protected terms, JSON parsing, and scoped diff/file list.
6. Leave the child-lane changes uncommitted for parent patch export.

## Parent-Owned Follow-On Plan
1. Reconcile the packet against current CO-386 Linear issue/workpad truth before implementation.
2. Choose the canonical release-intake surface for Codex CLI candidates.
3. Implement a supersedes/holds matrix that can distinguish current posture, held blockers, superseded evidence, and archive-only classification.
4. Require separate rows or fields for release notes, local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, and docs surfaces.
5. Keep archive-only classification limited to superseded evidence; unresolved blockers stay holds.
6. Run docs-review and focused validation for the implementation surface selected by the parent.
7. Run package/downstream smoke and cloud-canary validation whenever parent changes release-facing package, workflow, or cloud posture surfaces.
8. Record the final release-intake decision in task mirrors, workpad, PR, and canonical docs surfaces.

## Dependencies
- Linear issue `CO-386`
- Source anchor `ctx:sha256:aad8a7b6913c77cb5d07cb83c0b1766d268691fd3e688457d7f9b8bfd48a1742#chunk:c000001`
- `tasks/index.json`
- `docs/TASKS.md`
- Parent-owned Codex CLI release notes and local CLI evidence
- Parent-owned package/downstream smoke and cloud-canary evidence
- Parent-owned workflow pins, model posture, and docs surfaces

## Validation
- Checks / tests:
  - protected-term scan across CO-386 packet files
  - JSON parse check for `tasks/index.json`
  - scoped `git status --short` and `git diff --name-only`
- Rollback plan:
  - parent can reject or revert only the CO-386 packet and registry edits if issue-body reconciliation reveals a materially different scope

## Risks & Mitigations
- Risk: source-0 lacks full issue body text.
  - Mitigation: packet records the metadata-only source and carries forward the explicit parent-provided protected terms.
- Risk: parent implementation treats release-intake as automatic release adoption.
  - Mitigation: action plan separates intake, supersedes/holds, archive-only classification, and final posture decisions.
- Risk: archive-only classification obscures current blockers.
  - Mitigation: archive-only is defined as a superseded-evidence state, not a live blocker resolution.
- Risk: workflow pins or model posture move without downstream evidence.
  - Mitigation: parent-owned follow-on plan requires package/downstream smoke and cloud-canary gates for release-facing changes.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-26
- Parent docs-review / implementation approval: completed 2026-04-26; standalone review rerun telemetry reported `status=succeeded` / `review_outcome=bounded-success` after the catalog-entry fix.
