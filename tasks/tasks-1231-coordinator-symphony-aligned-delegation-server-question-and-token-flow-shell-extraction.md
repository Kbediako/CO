# Task Checklist - 1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction

- MCP Task ID: `1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`, `tasks/specs/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`, `tasks/tasks-1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`, `.agent/task/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`
- [x] Deliberation/findings captured for the extraction lane. Evidence: `docs/findings/1231-delegation-server-question-and-token-flow-shell-extraction-deliberation.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction.md`, `docs/findings/1231-delegation-server-question-and-token-flow-shell-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T063817Z-docs-first/02-spec-guard.log`
- [x] `npm run docs:check`. Evidence: `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T063817Z-docs-first/03-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T063817Z-docs-first/04-docs-freshness.log`
- [x] docs-review approval or explicit override captured for registered `1231`. Evidence: `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T063817Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Exact question/delegation-token seam revalidated before code changes. Evidence: `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T070652Z-closeout/00-summary.md`
- [x] Question enqueue/poll and delegation-token flow extracted behind a dedicated helper boundary. Evidence: `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T070652Z-closeout/00-summary.md`
- [x] Focused regressions cover expired question fallback and manifest-root token-path containment parity. Evidence: `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T070652Z-closeout/05-targeted-tests.log`
- [x] Closeout packet, override notes, and next-slice note captured. Evidence: `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T070652Z-closeout/00-summary.md`, `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T070652Z-closeout/13-override-notes.md`, `out/1231-coordinator-symphony-aligned-delegation-server-question-and-token-flow-shell-extraction/manual/20260316T070652Z-closeout/14-next-slice-note.md`
