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

### Phase 5 Runbook (draft)
1) Extract shared doc tooling helpers into `scripts/lib/` (doc collection, task-key normalization, date parsing, toPosix).
2) Replace local duplicates in docs-hygiene, docs-freshness, tasks-archive, implementation-docs-archive, and delegation-guard.
3) Deduplicate pack `runPack` helper across pack-audit + pack-smoke.
4) Update docs to remove references to the codex-devtools wrapper, then delete the wrapper script.
5) Run full guardrails (spec-guard → build/lint/test → docs gates → diff budget → review).

### Phase 6 Runbook (draft)
1) Extract shared CLI arg parsing for guardrail/docs/mirror/status scripts.
2) Centralize `.runs` manifest discovery used by status UI, run-review, and delegation-guard.
3) Consolidate mirror config/permit parsing and optional dependency loading with design tooling.
4) Update build output to include shared JS helpers (permit + optional-deps).
5) Reduce pipeline duplication with shared stage sets (design + diagnostics-with-eval).
6) Extract adapter command defaults (go/python/typescript) into shared helpers.
7) Reuse a single slugify helper across design pipeline + orchestrator.
8) Run full guardrails (spec-guard → build/lint/test → docs gates → diff budget → review).

### Phase 7 Runbook (draft)
1) Replace delegation-guard command blocks in pipelines with `delegation-guard-stage`.
2) Replace spec-guard command blocks in pipelines with the shared spec-guard stage set.
3) Align the spec-guard stage command to call the spec-guard runner wrapper (package-safe).
4) Run full guardrails (spec-guard → build/lint/test → docs gates → diff budget → review).

### Phase 8 Runbook (draft)
1) Extract a docs-review checks stage-set (`docs:check` + `docs:freshness`) and use it in `docs-review` + `implementation-gate`.
2) Reuse static file serving helpers between status UI and mirror tooling.
3) Remove or centralize the fallback diagnostics pipeline definition.
4) Consolidate repo/runs/out path resolution across scripts + design context.
5) Run full guardrails (spec-guard → build/lint/test → docs gates → diff budget → review).

### Phase 9 Runbook (draft)
1) Rewire `orchestrator/src/cli/run/environment.ts` to use `scripts/lib/run-manifests.js`.
2) Ensure `dist/` ships `scripts/lib` for packaged resolution parity.
3) Run full guardrails (spec-guard → build/lint/test → docs gates → diff budget → review).

### Phase 10 Runbook (draft)
1) Reuse shared date math in spec-guard (`computeAgeInDays`).
2) Replace `toPosixPath` in mirror fetch tooling with the shared helper.
3) Rewire design purge + tasks archive run-id parsing to use `scripts/lib/run-manifests.js`.
4) Run full guardrails (spec-guard → build/lint/test → docs gates → diff budget → review).

### Phase 11 Runbook (draft)
1) Replace status UI task-key helper with shared `normalizeTaskKey`.
2) Run full guardrails (spec-guard → build/lint/test → docs gates → diff budget → review).

### Planning
- [x] Confirm consolidation targets and phase sequencing - Evidence: `docs/TECH_SPEC-slimdown.md`.
- [x] Identify doc updates needed for removed scripts - Evidence: `docs/findings/slimdown-audit.md`.
- [x] Phase 5 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 6 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 7 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 8 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 9 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 10 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 11 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.

### Delegation
- [x] Subagent run captured - Evidence: `.runs/0101-slimdown-audit-review/cli/2026-01-01T04-44-27-502Z-9688b054/manifest.json`, `.runs/0101-slimdown-audit-nextsteps/cli/2026-01-01T05-38-23-619Z-961fd034/manifest.json`, `.runs/0101-slimdown-audit-usage/cli/2026-01-01T06-08-57-842Z-dee29417/manifest.json`, `.runs/0101-slimdown-audit-nextphase/cli/2026-01-01T06-22-49-653Z-3e9e326e/manifest.json`, `.runs/0101-slimdown-audit-usage2/cli/2026-01-01T10-04-09-470Z-2a8c0e1b/manifest.json`, `.runs/0101-slimdown-audit-slimdown2/cli/2026-01-01T11-00-20-245Z-fca96825/manifest.json`, `.runs/0101-slimdown-audit-pass3/cli/2026-01-01T13-19-30-562Z-fb8559df/manifest.json`, `.runs/0101-slimdown-audit-phase6/cli/2026-01-01T13-58-29-786Z-01202b8e/manifest.json`, `.runs/0101-slimdown-audit-impl1/cli/2026-01-01T14-37-01-370Z-7538c896/manifest.json`, `.runs/0101-slimdown-audit-scout/cli/2026-01-01T15-58-52-966Z-2f8ac345/manifest.json`, `.runs/0101-slimdown-audit-scout2/cli/2026-01-02T06-46-06-627Z-0e162446/manifest.json`, `.runs/0101-slimdown-audit-resolver/cli/2026-01-02T09-00-37-249Z-e98a2f15/manifest.json`, `.runs/0101-slimdown-audit-scout3/cli/2026-01-02T09-57-29-698Z-58860366/manifest.json`, `.runs/0101-slimdown-audit-scout4/cli/2026-01-02T10-55-12-120Z-5e7504b1/manifest.json`.

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
- [x] Phase 5 consolidations executed (docs helpers, pack helper, wrapper cleanup) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T16-30-31-721Z-35c24301/manifest.json`.
  - [x] Consolidate shared doc tooling helpers (doc collection, task-key normalization, date parsing, toPosix).
  - [x] Deduplicate pack `runPack` helper across pack-audit + pack-smoke.
  - [x] Remove codex-devtools wrapper and update references.
- [x] Phase 6 consolidation executed (CLI args, mirror optional deps/permit, pipeline stage sets, adapter defaults, slugify reuse) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T15-30-21-816Z-3ab2817f/manifest.json`.
- [x] Phase 7 consolidation executed (guardrail stage-set reuse) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T16-30-31-721Z-35c24301/manifest.json`.
  - [x] Replace delegation-guard/spec-guard command blocks with shared stage sets.
  - [x] Align spec-guard stage command to the spec-guard runner wrapper (package-safe).
- [x] Phase 8 consolidation executed (docs-review stage-set reuse, status UI server reuse, resolver alignment) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T07-30-37-808Z-9a35aa5f/manifest.json`.
- [x] Phase 8 regression fix (status UI external out dir data path) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T08-12-07-082Z-bc0c7883/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-22-25-959Z-0202a7c5/manifest.json`.
- [x] Phase 9 consolidation executed (resolver unification + dist shipping) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T09-16-35-400Z-28b143d5/manifest.json`.
- [x] Phase 10 consolidation executed (script helper drift cleanup) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T10-23-28-082Z-dc336fd7/manifest.json`.
- [x] Phase 11 consolidation executed (status UI task-key normalization) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T11-21-53-840Z-375955a7/manifest.json`.

### Validation + Handoff
- [x] Docs-review manifest captured (if doc-only changes) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T06-52-39-251Z-006dbf53/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T14-09-05-816Z-0c732c0b/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T14-36-24-243Z-95cbbe20/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T15-58-20-481Z-0ed04072/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-52-59-234Z-249b7bd8/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T01-45-50-306Z-0b3346ae/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T01-52-56-143Z-9ad8920d/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T02-20-52-639Z-d06c3655/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T02-41-59-440Z-885c79db/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T04-12-32-043Z-4e121dac/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T06-55-04-213Z-55d3f4a1/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-55-37-130Z-c402e6fb/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-00-37-065Z-5391c706/manifest.json`.
- [x] Review-loop SOP updated to monitor inline review threads - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T02-20-52-639Z-d06c3655/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T02-41-59-440Z-885c79db/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T04-12-32-043Z-4e121dac/manifest.json`.
- [x] Review-loop SOP updated to scale post-green monitoring time by complexity - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T02-41-59-440Z-885c79db/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T04-12-32-043Z-4e121dac/manifest.json`.
- [x] Review-loop SOP updated with explicit complexity rubric - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T04-12-32-043Z-4e121dac/manifest.json`.
- [x] Review-loop SOP updated to reply in-thread, react, and resolve connector review threads - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T08-43-51-067Z-2a27c307/manifest.json`.
- [x] Implementation-gate manifest captured after code changes - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T11-12-06-081Z-b957f1cf/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T14-09-41-854Z-46f3b7ea/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T15-30-21-816Z-3ab2817f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-30-31-721Z-35c24301/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-53-34-477Z-50756963/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T01-46-31-523Z-0a37d3fe/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T07-30-37-808Z-9a35aa5f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-12-07-082Z-bc0c7883/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-22-25-959Z-0202a7c5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-11-06-612Z-b04c1d6c/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-16-35-400Z-28b143d5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T10-23-28-082Z-dc336fd7/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-21-53-840Z-375955a7/manifest.json`.
- [x] Diff budget check passed (override recorded for Phase 6 consolidation scope) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T11-12-06-081Z-b957f1cf/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T14-09-41-854Z-46f3b7ea/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T15-30-21-816Z-3ab2817f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-30-31-721Z-35c24301/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-53-34-477Z-50756963/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T01-46-31-523Z-0a37d3fe/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T07-30-37-808Z-9a35aa5f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-12-07-082Z-bc0c7883/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-22-25-959Z-0202a7c5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-11-06-612Z-b04c1d6c/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-16-35-400Z-28b143d5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T10-23-28-082Z-dc336fd7/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-21-53-840Z-375955a7/manifest.json`.
- [x] Frontend-testing manifest captured with DevTools enabled - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T10-10-36-969Z-c65778ef/manifest.json`.
