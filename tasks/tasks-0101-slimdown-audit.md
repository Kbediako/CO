# Task Checklist - Slimdown Audit (0101-slimdown-audit)

> Set `MCP_RUNNER_TASK_ID=0101-slimdown-audit` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0101-slimdown-audit.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Constraints
- Target diff budget: <= 500 lines net.
- Delete > add (net-negative diffs required).

## Checklist

### Documentation
- [x] PRD drafted - Evidence: `docs/PRD-slimdown.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-slimdown.md`.
- [x] Findings audit drafted - Evidence: `docs/findings/slimdown-audit.md`.

### Phase 2 Runbook (draft)
1) Confirm no external consumers of legacy scripts (repo + CI scan) and verify `.runs/` artifacts remain sufficient without legacy summaries.
2) Consolidate helper utilities (atomic writes + sanitizers).
3) Normalize env path resolution to `CODEX_ORCHESTRATOR_ROOT`.
4) Delete legacy mcp-runner migrate/metrics scripts and update `.runs/README.md` + `docs/REFRACTOR_PLAN.md`.
5) Run full guardrails (spec-guard → build/lint/test → docs gates → diff budget → review).

### Phase 3 Runbook (draft)
1) Inventory devtools pipeline references (use `docs/findings/slimdown-audit.md` map) and decide the canonical replacement path (`CODEX_REVIEW_DEVTOOLS=1` or `--devtools`).
2) Add a compatibility path (alias or explicit error messaging) before removing pipeline IDs.
3) Remove `implementation-gate-devtools` + `frontend-testing-devtools` from `codex.orchestrator.json` and update docs/SOPs/PRDs.
4) Remove scripts/run-parallel-goals.ts + `parallel:goals` npm script if still unused.
5) Validate with `codex-orchestrator start implementation-gate` and `frontend-testing` using `CODEX_REVIEW_DEVTOOLS=1`.

### Planning
- [x] Confirm consolidation targets and phase sequencing - Evidence: `docs/TECH_SPEC-slimdown.md`.
- [x] Identify doc updates needed for removed scripts - Evidence: `docs/findings/slimdown-audit.md`.

### Delegation
- [x] Subagent run captured - Evidence: `.runs/0101-slimdown-audit-review/cli/2026-01-01T04-44-27-502Z-9688b054/manifest.json`, `.runs/0101-slimdown-audit-nextsteps/cli/2026-01-01T05-38-23-619Z-961fd034/manifest.json`, `.runs/0101-slimdown-audit-usage/cli/2026-01-01T06-08-57-842Z-dee29417/manifest.json`, `.runs/0101-slimdown-audit-nextphase/cli/2026-01-01T06-22-49-653Z-3e9e326e/manifest.json`, `.runs/0101-slimdown-audit-usage2/cli/2026-01-01T10-04-09-470Z-2a8c0e1b/manifest.json`, `.runs/0101-slimdown-audit-slimdown2/cli/2026-01-01T11-00-20-245Z-fca96825/manifest.json`.

### Implementation
- [x] Phase 1 deletions executed (wrappers and manual harness) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T05-57-43-325Z-cf23c380/manifest.json`.
- [x] Phase 2 consolidations executed (helpers and legacy scripts) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T09-23-12-672Z-1658902e/manifest.json`.
  - [x] Replace duplicate `writeJsonAtomic` helpers (`scripts/status-ui-build.mjs`, `packages/shared/design-artifacts/writer.ts`) with `orchestrator/src/cli/utils/fs.ts`.
  - [x] Replace local `sanitizeTaskId` / `sanitizeRunId` in `packages/shared/design-artifacts/writer.ts` with orchestrator helpers.
  - [x] Standardize env path resolution on `CODEX_ORCHESTRATOR_ROOT` (remove `CODEX_ORCHESTRATOR_REPO_ROOT` usage).
  - [x] Remove legacy mcp-runner migrate/metrics scripts and update `.runs/README.md`.
- [x] Phase 3 pipeline and harness simplifications executed.
  - [x] Remove `implementation-gate-devtools` + `frontend-testing-devtools` after devtools path is consolidated.
  - [x] Update docs/SOPs referencing devtools pipeline IDs (see `docs/findings/slimdown-audit.md` map).
  - [x] Remove scripts/run-parallel-goals.ts + `parallel:goals` npm script (if unused).
- [x] Phase 4 automation + CLI simplifications executed.
  - [x] Consolidate archive automation workflows via a reusable base workflow.
  - [x] Deduplicate HUD/output handling in `bin/codex-orchestrator.ts`.

### Validation + Handoff
- [x] Docs-review manifest captured (if doc-only changes) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T06-52-39-251Z-006dbf53/manifest.json`.
- [x] Implementation-gate manifest captured after code changes - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T11-12-06-081Z-b957f1cf/manifest.json`.
- [x] Diff budget check passed - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T11-12-06-081Z-b957f1cf/manifest.json`.
- [x] Frontend-testing manifest captured with DevTools enabled - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T10-10-36-969Z-c65778ef/manifest.json`.
