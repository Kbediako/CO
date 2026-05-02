# ACTION_PLAN - CO-486 live 0.128 persisted /goal canary scaffold

## Summary
- Goal: give the parent lane a docs-first action plan for classifying live Codex CLI `0.128.0` persisted `/goal` canary evidence and the manifest/workpad evidence contract.
- Scope: this child lane only creates the ACTION_PLAN and checklist mirrors named in the child-lane brief.
- Assumptions:
  - the parent-provided source anchor is authoritative
  - the child-lane source payload is available at `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc-docs-checklist-scaffold/cli/2026-05-02T15-15-46-450Z-560e82b6/memory/source-0/source.txt` and records source object `sha256:c43c991f5bad4fef277b4bf219d3ff2c3ce1bb5e17e8fbfb0224249bb7752e38`
  - parent owns Linear truth, the active workpad, PRD, TECH_SPEC, registries, source code, canary commands, validation scripts, PR lifecycle, and patch integration
  - this lane must not add hook or resume integration

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - live Codex CLI `0.128.0`
  - persisted `/goal` canary
  - manifest evidence contract
  - workpad evidence contract
  - provider-worker recovery classification
  - long-poll recovery classification
  - hook recovery classification
  - no hook/resume integration
- Not done if:
  - persisted `/goal` evidence is inferred from cached, stale, or non-live output
  - manifest evidence and workpad evidence are collapsed into one uncheckable note
  - provider-worker, long-poll, and hook recovery classifications are merged into one generic recovery bucket
  - hook or resume integration is added, planned as implementation, or treated as required for the canary
  - source code, canary commands, validation scripts, PRD, TECH_SPEC, task registries, Linear, GitHub, workpad, or PR lifecycle surfaces are changed by this child lane
- Pre-implementation issue-quality review:
  - The issue is an evidence-contract and classification lane, not a feature implementation lane.
  - The issue is narrower than hook/resume integration and broader than a free-form workpad note.
  - The micro-task path is unavailable because correctness depends on exact protected terms, live evidence provenance, and explicit non-goals.

## Milestones & Sequencing
1. Child lane creates the ACTION_PLAN, task checklist, and `.agent` checklist mirror only.
2. Parent imports the child patch and reconciles the scaffold against current CO-486 Linear issue/workpad truth.
3. Parent refreshes or confirms PRD and TECH_SPEC without relying on this child lane for those files.
4. Parent runs or records the live `0.128.0` persisted `/goal` canary under the authoritative runtime surface.
5. Parent records canary proof in manifest evidence and workpad evidence with enough detail for review to independently trace the run, inputs, output, command/runtime version, and failure mode if any.
6. Parent classifies provider-worker, long-poll, and hook recovery behavior separately.
7. Parent keeps hook/resume integration out of scope; any required hook/resume implementation becomes a separate owner lane.
8. Parent runs only the validation/review gates justified by the parent-owned file changes and completes PR/Linear handoff.

## Parent-Owned Evidence Contract
- Live canary evidence must name the active Codex CLI/runtime surface and confirm `0.128.0` before using the result.
- Persisted `/goal` evidence must include the run/session setup, the `/goal` operation under test, the persistence check, and whether the canary passed, failed, or was blocked.
- Manifest evidence must point to the authoritative `.runs/.../manifest.json` and any canary artifact paths the reviewer needs.
- Workpad evidence must summarize the canary outcome, manifest path, recovery classifications, and remaining blockers without becoming the only source of proof.
- Provider-worker recovery classification must stay separate from long-poll recovery classification and hook recovery classification.
- Hook recovery classification may document what is observed or intentionally not covered; it must not add hook/resume integration in this lane.

## Dependencies
- Source anchor `ctx:sha256:c43c991f5bad4fef277b4bf219d3ff2c3ce1bb5e17e8fbfb0224249bb7752e38#chunk:c000001`.
- Parent manifest `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc-docs-checklist-scaffold/cli/2026-05-02T15-15-46-450Z-560e82b6/manifest.json`.
- Parent-owned Linear issue/workpad truth for `CO-486`.
- Parent-owned PRD and TECH_SPEC.
- Parent-owned live Codex CLI `0.128.0` canary command and validation evidence.

## Validation
- Child-lane checks:
  - scoped trailing-whitespace hygiene over the three declared files
  - protected-term scan over the three declared files
  - scoped changed-file review confirming no out-of-scope edits
- Parent-owned checks:
  - docs-review or equivalent packet review after importing the scaffold
  - live canary proof review for persisted `/goal`
  - manifest/workpad evidence review
  - focused validation for any parent-owned source or docs changes

## Risks & Mitigations
- Risk: a non-live or stale `0.128.0` canary is treated as proof.
  - Mitigation: require command/runtime version evidence in the manifest and workpad summary.
- Risk: manifest and workpad evidence drift.
  - Mitigation: parent records the manifest as the durable artifact and keeps the workpad as a concise pointer and status summary.
- Risk: recovery classification broadens into implementation.
  - Mitigation: keep provider-worker, long-poll, and hook classifications separate and stop if hook/resume integration is needed.
- Risk: the child scaffold accidentally becomes the source of truth.
  - Mitigation: parent must reconcile against live Linear issue/workpad truth before implementation or handoff.

## Approvals
- Reviewer: bounded same-issue docs child lane.
- Date: 2026-05-02.
