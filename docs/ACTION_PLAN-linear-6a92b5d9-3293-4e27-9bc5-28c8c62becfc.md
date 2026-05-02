# ACTION_PLAN - CO-486 persisted /goal evidence packet rebase r2

## Summary
- Goal: recreate the CO-486 docs-first packet on the current main-based Rework branch while preserving the advisory-only persisted goal evidence decision.
- Scope: this r2 child lane creates only the six declared packet files: PRD, TECH_SPEC, ACTION_PLAN, canonical spec, task checklist, and `.agent` checklist mirror.
- Assumptions:
  - the parent-provided source anchor is authoritative for this child lane
  - the r2 source payload is available at `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc-docs-packet-rebase-r2/cli/2026-05-02T19-51-38-188Z-83e5dfff/memory/source-0/source.txt`
  - source object `sha256:968e79825ece74f1535532921c7bb2fe3b53e6ab34bad59ecefe3796d897cfe3` maps to pointer `ctx:sha256:968e79825ece74f1535532921c7bb2fe3b53e6ab34bad59ecefe3796d897cfe3#chunk:c000001`
  - parent owns Linear truth, the active workpad, registries, canary command acceptance, validation scripts, source code, PR lifecycle, and patch integration
  - this lane must not add hook or resume integration

## Rework Context
- Prior PR `#751` is stale/closed and not the active handoff surface.
- Parent registry reset commit `e8a904d8c089` restored the registry/task rows after the Rework reset.
- Stale appserver child lane `docs-packet-rebase` is invalidated for packet production.
- This r2 lane is the current packet producer and should leave its changes in place for parent patch export.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - live Codex CLI `0.128.0`
  - persisted `/goal` canary
  - goals feature
  - app-server APIs
  - model tools
  - runtime continuation
  - TUI controls
  - provider-worker run evidence
  - manifest evidence contract
  - workpad evidence contract
  - advisory-only `goal_evidence`
  - `authority=advisory_only`
  - provider-worker recovery classification
  - long-poll recovery classification
  - hook recovery classification
  - no hook/resume integration
  - Linear remains source of truth
- Not done if:
  - persisted `/goal` evidence is inferred from cached, stale, or non-live output without preserving the prior canary evidence path
  - manifest evidence and workpad evidence are collapsed into one uncheckable note
  - provider-worker, long-poll, hook recovery, runtime continuation, TUI, and child-lane classifications are merged into one generic bucket
  - hook or resume integration is added, planned as implementation, or treated as required for the canary
  - stale PR `#751` is treated as active PR truth
  - invalidated `docs-packet-rebase` is treated as current packet authority
  - source code, canary commands, validation scripts, registries, Linear, GitHub, workpad, or PR lifecycle surfaces are changed by this child lane
- Pre-implementation issue-quality review:
  - The issue is an evidence-contract and classification lane, not a feature implementation lane.
  - The issue is narrower than hook/resume integration and broader than a free-form workpad note.
  - The micro-task path is unavailable because correctness depends on exact protected terms, live evidence provenance, Rework provenance, and explicit non-goals.

## Milestones & Sequencing
1. Child lane verifies source payload availability and current branch posture.
2. Child lane recreates the PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, and `.agent` mirror only.
3. Child lane updates packet provenance to current Rework truth: closed PR `#751`, registry reset commit `e8a904d8c089`, invalidated `docs-packet-rebase`, and current `docs-packet-rebase-r2`.
4. Child lane preserves the prior live `0.128.0` canary evidence and the advisory-only `goal_evidence` contract.
5. Child lane preserves `CO-492` as the optional follow-up for advisory provider-worker manifest/workpad capture.
6. Child lane runs only scoped docs/file checks over declared files.
7. Parent imports the patch and reconciles it against current Linear/workpad truth.
8. Parent runs docs-review, registry checks, validation, PR lifecycle, and Linear handoff.

## Parent-Owned Evidence Contract
- Live canary evidence must name the active Codex CLI/runtime surface and confirm `0.128.0` before using the result.
- Persisted `/goal` evidence must include the run/session setup, the goal operation under test, the persistence check, and whether the canary passed, failed, or was blocked.
- Manifest evidence must point to the authoritative `.runs/.../manifest.json` and any canary artifact paths the reviewer needs.
- Workpad evidence must summarize the canary outcome, manifest path, recovery classifications, and remaining blockers without becoming the only source of proof.
- Provider-worker recovery classification must stay separate from long-poll recovery classification and hook recovery classification.
- Hook recovery classification may document what is observed or intentionally not covered; it must not add hook/resume integration in this lane.
- Goal evidence is advisory-only and may not authorize Linear transitions, workpad closeout, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, or long-poll terminal status.

## Dependencies
- Source anchor `ctx:sha256:968e79825ece74f1535532921c7bb2fe3b53e6ab34bad59ecefe3796d897cfe3#chunk:c000001`.
- Current r2 manifest `.runs/linear-6a92b5d9-3293-4e27-9bc5-28c8c62becfc-docs-packet-rebase-r2/cli/2026-05-02T19-51-38-188Z-83e5dfff/manifest.json`.
- Parent registry reset commit `e8a904d8c089`.
- Parent-owned Linear issue/workpad truth for `CO-486`.
- Parent-owned PR lifecycle after stale PR `#751` closure.
- Follow-up issue `CO-492` / `779bc931-f6b4-4a1c-b16f-145d500aca73`.

## Validation
- Child-lane checks:
  - source payload availability for r2
  - scoped trailing-whitespace hygiene over the six declared files
  - protected-term scan over the six declared files
  - scoped changed-file review confirming no out-of-scope edits
- Parent-owned checks:
  - docs-review or equivalent packet review after importing this r2 packet
  - live canary proof review for persisted `/goal`
  - manifest/workpad evidence review
  - focused validation for any parent-owned source, docs, registry, or lifecycle changes

## Risks & Mitigations
- Risk: a non-live or stale `0.128.0` canary is treated as fresh proof.
  - Mitigation: preserve command/runtime version evidence and source artifact paths; parent decides whether fresh re-probing is required.
- Risk: stale PR `#751` or the invalidated child lane re-enters the authority chain.
  - Mitigation: explicitly classify PR `#751` as closed/stale and `docs-packet-rebase` as invalidated; name r2 as current packet producer.
- Risk: manifest and workpad evidence drift.
  - Mitigation: parent records the manifest as the durable artifact and keeps the workpad as a concise pointer and status summary.
- Risk: recovery classification broadens into implementation.
  - Mitigation: keep provider-worker, long-poll, hook recovery, runtime continuation, and TUI classifications separate and stop if hook/resume integration is needed.
- Risk: the child scaffold accidentally becomes the source of lifecycle truth.
  - Mitigation: parent must reconcile against live Linear issue/workpad truth before implementation or handoff.

## Approvals
- Reviewer: bounded same-issue docs child lane `docs-packet-rebase-r2`.
- Date: 2026-05-02.
