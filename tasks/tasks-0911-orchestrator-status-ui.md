# Task List - Orchestrator Status UI (0911-orchestrator-status-ui)

## Context
- Link to PRD: `tasks/0911-prd-orchestrator-status-ui.md` (canonical), `docs/PRD-orchestrator-status-ui.md` (mirror).
- Summary of scope: Plan a dark-themed, read-only dashboard that reports task buckets (active, ongoing, complete, pending) plus codebase status and orchestrator run detail from local artifacts.

### Checklist Convention
- Start every task/subtask with `[ ]` and flip it to `[x]` when the acceptance criteria are met, citing the run manifest or log that documents completion.

### Evidence Gates
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0911-orchestrator-status-ui/cli/2025-12-30T08-23-06-106Z-3bd5e70b/manifest.json`.
- [x] DevTools QA manifest captured - Evidence: `.runs/0911-orchestrator-status-ui/cli/2025-12-30T09-15-57-261Z-d7387939/manifest.json`.
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0911-orchestrator-status-ui/cli/2025-12-30T09-23-34-986Z-8e6693c4/manifest.json`.

## Parent Tasks
1. Planning and approvals
   - Subtask 1: Write/update mini-spec and obtain approval.
     - Files: `tasks/specs/0911-orchestrator-status-ui.md`
     - Commands: None (docs only).
     - Acceptance: Mini-spec exists with `last_review` set and approval section completed.
     - [x] Status: Complete - Evidence: `tasks/specs/0911-orchestrator-status-ui.md`.
   - Subtask 2: Record PRD approval in `tasks/index.json` gate metadata.
     - Files: `tasks/index.json`
     - Commands: `npx codex-orchestrator start docs-review --format json --no-interactive --task 0911-orchestrator-status-ui`
     - Acceptance: Gate status updated with manifest path and run id.
     - [x] Status: Complete - Evidence: `tasks/index.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-23T07-59-47-613Z-344689f5/manifest.json`.
2. Status model and data sources
   - Subtask 1: Define task buckets and run status rules.
     - Files: `docs/TECH_SPEC-orchestrator-status-ui.md`
     - Commands: None (docs only).
     - Acceptance: Task status classification documented (active, ongoing, complete, pending).
     - [x] Status: Complete - Evidence: this commit.
   - Subtask 2: Define codebase status signals and log source selection.
     - Files: `docs/TECH_SPEC-orchestrator-status-ui.md`
     - Commands: None (docs only).
     - Acceptance: Codebase signals and log sources documented with limits.
     - [x] Status: Complete - Evidence: this commit.
3. UX layout and dark theme direction
   - Subtask 1: Document layout, panels, and theme guidance.
     - Files: `docs/TECH_SPEC-orchestrator-status-ui.md`
     - Commands: None (docs only).
     - Acceptance: Dark theme and panel layout captured with ASCII wireframe.
     - [x] Status: Complete - Evidence: this commit.
4. Implementation prep (no implementation)
   - Subtask 1: Define aggregation schema and caching strategy.
     - Files: `docs/TECH_SPEC-orchestrator-status-ui.md`
     - Commands: None (docs only).
     - Acceptance: UI data schema and refresh rules documented.
     - [x] Status: Complete - Evidence: this commit.
5. Implementation (complete)
   - Subtask 1: Build aggregation script to emit out/0911-orchestrator-status-ui/data.json.
     - Files: scripts/status-ui-build.mjs
     - Commands: node scripts/status-ui-build.mjs
     - Acceptance: Aggregator emits JSON without errors on a sample `.runs/` tree.
     - [x] Status: Complete - Evidence: `.runs/0911-orchestrator-status-ui/cli/2025-12-24T05-07-59-073Z-e6a472e8/manifest.json`.
   - Subtask 2: Build static UI and styles for overview and run detail.
     - Files: packages/orchestrator-status-ui/index.html, packages/orchestrator-status-ui/app.js, packages/orchestrator-status-ui/styles.css
     - Commands: Optional local server command (TBD).
     - Acceptance: UI renders dark theme layout with live data updates.
     - [x] Status: Complete - Evidence: `.runs/0911-orchestrator-status-ui/cli/2025-12-24T05-07-59-073Z-e6a472e8/manifest.json`.
6. Post-launch polish
   - Subtask 1: Refresh UI visuals, tune active/ongoing colors, add favicon, and improve keyboard selection.
     - Files: packages/orchestrator-status-ui/styles.css, packages/orchestrator-status-ui/index.html, packages/orchestrator-status-ui/app.js, packages/orchestrator-status-ui/favicon.svg
     - Commands: Local static server + manual QA.
     - Acceptance: New palette applied consistently, favicon loads without 404s, and task rows are keyboard-selectable.
   - [x] Status: Complete - Evidence: `.runs/0911-orchestrator-status-ui/cli/2025-12-29T23-57-33-834Z-548d594f/manifest.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-30T01-23-39-016Z-e0c9d909/manifest.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-30T00-27-43-100Z-9c2b8a6d/manifest.json`, `.runs/0911-orchestrator-status-ui/cli/2025-12-30T01-33-59-187Z-5f123a71/manifest.json`.

## Relevant Files
- `tasks/0911-prd-orchestrator-status-ui.md`
- `docs/PRD-orchestrator-status-ui.md`
- `docs/TECH_SPEC-orchestrator-status-ui.md`
- `tasks/specs/0911-orchestrator-status-ui.md`
- `docs/TASKS.md`
- `.agent/task/0911-orchestrator-status-ui.md`
- Docs-review manifest: `.runs/0911-orchestrator-status-ui/cli/2025-12-30T08-23-06-106Z-3bd5e70b/manifest.json`

## Notes
- Spec Requirements: Mini-spec required (see `tasks/specs/0911-orchestrator-status-ui.md`).
- Approvals Needed: PRD approval, mini-spec approval, docs-review manifest before implementation.
- Links: `docs/PRD-orchestrator-status-ui.md`, `docs/TECH_SPEC-orchestrator-status-ui.md`.
