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
- Approvals Needed:
- Links:
- Subagent usage (required): task ids + manifest paths (use `<task-id>-<stream>` naming).
