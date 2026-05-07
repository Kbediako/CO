# ACTION_PLAN - CO-492 advisory persisted goal evidence capture

## Summary
- Goal: create the CO-492 docs-first packet and registry mirrors for optional advisory persisted `/goal` capture.
- Scope: docs packet, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` only in this child lane.
- Assumptions:
  - CO-486 remains the source classification: persisted goal state is provider-worker run evidence with `authority=advisory_only`.
  - Parent owns implementation code/tests, Linear state, authoritative workpad, PR lifecycle, review, and validation.
  - The prompt-declared source anchor is authoritative for this child lane; the referenced `.runs/.../source.txt` payload is not present in this checkout at authoring time.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - persisted `/goal`
  - goals feature
  - app-server APIs
  - model tools
  - provider-worker run evidence
  - manifest `goal_evidence`
  - workpad summary
  - `advisory_only`
  - Linear remains source of truth
- Not done if:
  - goal state is accepted as authority for Linear transitions, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, or TUI automation
  - unavailable or stale goal evidence changes lifecycle behavior
  - this lane edits source code, tests, Linear state, workpad state, PR lifecycle, or review lifecycle
  - the packet omits implementation-facing tests for available and unavailable evidence
- Pre-implementation issue-quality review:
  - The issue is a narrow follow-up from CO-486, not a new canary or authority redesign.
  - The issue requires protected wording and explicit authority boundaries, so the micro-task path is unavailable.
  - Parent implementation must remain additive: capture and render evidence only.
- Fallback / refactor decision: this issue touches an optional evidence seam. Retain Linear-first lifecycle authority and justify unavailable goal capture as a supported no-op state.

## CO-382 Fallback Decision Table
- Large-refactor decision: no larger authority refactor is warranted because this issue adds advisory run evidence and explicitly rejects lifecycle authority expansion.
- Minor-seam decision: retain the optional unavailable/non-current goal-evidence seam as a supported no-op evidence path, not as lifecycle authority.
- Contract name: Linear-first provider-worker lifecycle authority with optional advisory `goal_evidence`.
- Owning surface: provider-worker manifest and workpad evidence capture.
- Steady-state proof: Linear/workpad/PR/review/check evidence remains authoritative while `goal_evidence` only records advisory state or reason.
- Tests/docs: focused provider-worker manifest/workpad tests, command-runner manifest persistence tests, and the CO-492 docs packet.
- Non-expiring rationale: optional goal evidence can be absent or unavailable as a supported no-op state because goal evidence is not required for workflow authority.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker `goal_evidence` | Goal evidence unavailable or non-current beside authoritative Linear/workpad evidence. | justify retaining fallback | CO-492 | capture source unavailable, disabled, stale, complete, or thread-mismatched | 2026-05-07 | 2026-05-07 | non-expiring supported no-op | separate approved authority redesign | focused provider-worker manifest/workpad tests |

## Milestones & Sequencing
1. Create PRD, TECH_SPEC, ACTION_PLAN, canonical spec, task checklist, and `.agent` mirror.
2. Update `tasks/index.json` with CO-492 packet metadata and child-lane approval evidence.
3. Add a `docs/TASKS.md` snapshot summarizing the packet and explicit authority rejection list.
4. Add docs-freshness registry rows for the six new packet/checklist files.
5. Run scoped docs-only checks: JSON parse, protected-term scan, and `git diff --check`.
6. Leave workspace changes in place for parent patch export.
7. Parent imports the patch, reconciles against live Linear/workpad truth, implements source/tests, runs validation, and owns PR/review/handoff.

## Parent-Owned Implementation Guidance
- Capture optional manifest `goal_evidence` from model tools or app-server APIs when current and relevant.
- Preserve unavailable or stale capture as advisory metadata, not a blocker.
- Render a compact workpad summary from manifest evidence.
- Ensure every consumer treats `goal_evidence.authority` as `advisory_only`.
- Keep lifecycle gates tied to Linear/workpad/PR/review/check evidence.

## Dependencies
- CO-486 packet and canary decision.
- Source anchor `ctx:sha256:aeaf7bb89eb5a370f39d4f1098e89c80b5da6a6a29b77b1972ececf1cdb811f6#chunk:c000001`.
- Prompt manifest `.runs/linear-779bc931-f6b4-4a1c-b16f-145d500aca73-docs-packet/cli/2026-05-06T23-13-09-726Z-85d46883/manifest.json`.
- Parent-owned provider-worker implementation workspace.

## Validation
- Child-lane checks:
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - protected-term scan over the six packet files plus registry mirrors
  - scoped changed-file review against declared file scope
  - `git diff --check`
- Parent-owned checks:
  - docs-review after importing the packet
  - focused implementation tests for available, unavailable, disabled, stale, complete, and thread-mismatched goal evidence
  - provider-worker workpad summary regressions
  - normal parent validation, review, PR lifecycle, and Linear handoff

## Risks & Mitigations
- Risk: goal evidence is accidentally treated as workflow authority.
  - Mitigation: require `authority=advisory_only`, `linear_authority_preserved=true`, and the full `not_authorized_for` list.
- Risk: missing goal evidence blocks a run.
  - Mitigation: unavailable capture is a supported no-op state with an explicit reason.
- Risk: workpad summary overstates proof.
  - Mitigation: summary must be compact, advisory, and pointer-oriented.
- Risk: implementation broadens into hook/resume control or TUI automation.
  - Mitigation: both are explicit non-goals and validation must prove lifecycle gates do not consume goal status.

## Approvals
- Reviewer: bounded same-issue docs child lane.
- Date: 2026-05-07.
