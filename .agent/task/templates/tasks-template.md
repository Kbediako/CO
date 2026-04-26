# Task List Template

## Added by Bootstrap 2025-10-16

## Context
- MCP Task ID:
- Primary PRD:
- TECH_SPEC:
- ACTION_PLAN:
- Summary of scope:

### Checklist Convention
- Start every task/subtask with `[ ]` and flip it to `[x]` when the acceptance criteria are met, citing evidence (manifest or log when required; standalone review approvals can cite spec/task notes).

### Evidence Gates
- [ ] Issue-quality review captured (pre-implementation) - Evidence: spec/task notes confirming intent checksum, protected terms, `Not done if`, and parity-matrix status when applicable.
- [ ] Fallback / refactor decision captured (pre-implementation) - Evidence: spec/task notes must first state whether fallback/seam behavior is touched. If yes, choose exactly one of `remove fallback`, `expire fallback`, or `justify retaining fallback` for each touched fallback/seam; use `Not applicable` only when no fallback/seam behavior is touched. Retained fallbacks must record owner, trigger, introduced date, review date, maximum lifetime, removal condition, and validation. See `docs/guides/fallback-expiry-and-refactor-policy.md` for detailed policy guidance.
- [ ] Durable fallback retention evidence captured (applies only when `justify retaining fallback` is chosen above) - Evidence: record contract name, owning surface, steady-state proof, tests/docs, and why it is not governed as an expiring fallback.
- [ ] Standalone review approval captured (pre-implementation) - Evidence: spec/task notes (no manifest).
- [ ] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/<task-id>/cli/<run-id>/manifest.json`.
- [ ] Implementation review manifest captured (post-implementation) - Evidence: `.runs/<task-id>/cli/<run-id>/manifest.json`.

### Progress Log (continuity)
- After each meaningful chunk, append 1-3 bullets in this file capturing: what changed, evidence path/command, and next handoff TODO.
- Keep entries concise so another agent can resume quickly after compaction or handoff.
- Optional scratch mirror: `out/<task-id>/progress.md` (task checklist remains the source of truth).

## Parent Tasks
1. Parent Task Title
   - Subtask 1: Description
     - Files:
     - Commands:
     - Acceptance:
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.
   - Subtask 2: Description
     - Files:
     - Commands:
     - Acceptance:
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.
2. Parent Task Title
   - Subtask 1: Description
     - Files:
     - Commands:
     - Acceptance:
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.
3. Parent Task Title
   - Subtask 1: Description
     - Files:
     - Commands:
     - Acceptance:
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.
4. Parent Task Title
   - Subtask 1: Description
     - Files:
     - Commands:
     - Acceptance:
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.
5. Parent Task Title
   - Subtask 1: Description
     - Files:
     - Commands:
     - Acceptance:
     - [ ] Status: Pending — update to [x] when acceptance criteria are satisfied.

## Relevant Files
- 

## Notes
- PRD/TECH_SPEC/ACTION_PLAN Requirements:
- Intent checksum / parity matrix status:
- Approvals Needed:
- Links:
- Subagent usage (required): task ids + manifest paths (use `<task-id>-<stream>` naming).
