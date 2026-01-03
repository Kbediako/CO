# Task Checklist - 0101-slimdown-audit (0101)

> Set `MCP_RUNNER_TASK_ID=0101-slimdown-audit` for orchestrator commands. Mirror status with `tasks/tasks-0101-slimdown-audit.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0101-slimdown-audit/cli/<run-id>/manifest.json`).

## Foundation
- [x] PRD drafted - Evidence: `docs/PRD-slimdown.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-slimdown.md`.
- [x] Findings audit drafted - Evidence: `docs/findings/slimdown-audit.md`.

## Planning
- [x] Confirm consolidation targets and phase sequencing - Evidence: `docs/TECH_SPEC-slimdown.md`.
- [x] Identify doc updates needed for removed scripts - Evidence: `docs/findings/slimdown-audit.md`.
- [x] Phase 5 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 6 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 7 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 8 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 9 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 10 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 11 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 12 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 13 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 14 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 15 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 16 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 17 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 18 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.

## Phase 2 Runbook (draft)
1) Confirm no external consumers of legacy scripts (repo + CI scan) and verify `.runs/` artifacts remain sufficient without legacy summaries.
2) Consolidate helper utilities (atomic writes + sanitizers).
3) Normalize env path resolution to `CODEX_ORCHESTRATOR_ROOT`.
4) Delete legacy mcp-runner migrate/metrics scripts and update `.runs/README.md` + `docs/REFRACTOR_PLAN.md`.
5) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 3 Runbook (draft)
1) Inventory devtools pipeline references (use `docs/findings/slimdown-audit.md` map) and decide the canonical replacement path (`CODEX_REVIEW_DEVTOOLS=1` or `--devtools`).
2) Add a compatibility path (alias or explicit error messaging) before removing pipeline IDs.
3) Remove `implementation-gate-devtools` + `frontend-testing-devtools` from `codex.orchestrator.json` and update docs/SOPs/PRDs.
4) Remove scripts/run-parallel-goals.ts + `parallel:goals` npm script if still unused.
5) Validate with `codex-orchestrator start implementation-gate` and `frontend-testing` using `CODEX_REVIEW_DEVTOOLS=1`.

## Phase 5 Runbook (draft)
1) Extract shared doc tooling helpers into `scripts/lib/` (doc collection, task-key normalization, date parsing, toPosix).
2) Replace local duplicates in docs-hygiene, docs-freshness, tasks-archive, implementation-docs-archive, and delegation-guard.
3) Deduplicate pack `runPack` helper across pack-audit + pack-smoke.
4) Update docs to remove references to the codex-devtools wrapper, then delete the wrapper script.
5) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 6 Runbook (draft)
1) Extract shared CLI arg parsing for guardrail/docs/mirror/status scripts.
2) Centralize `.runs` manifest discovery used by status UI, run-review, and delegation-guard.
3) Consolidate mirror config/permit parsing and optional dependency loading with design tooling.
4) Update build output to include shared JS helpers (permit + optional-deps).
5) Reduce pipeline duplication with shared stage sets (design + diagnostics-with-eval).
6) Extract adapter command defaults (go/python/typescript) into shared helpers.
7) Reuse a single slugify helper across design pipeline + orchestrator.
8) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 7 Runbook (draft)
1) Replace delegation-guard command blocks in pipelines with `delegation-guard-stage`.
2) Replace spec-guard command blocks in pipelines with the shared spec-guard stage set.
3) Align the spec-guard stage command to call the spec-guard runner wrapper (package-safe).
4) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 8 Runbook (draft)
1) Extract a docs-review checks stage-set (`docs:check` + `docs:freshness`) and use it in `docs-review` + `implementation-gate`.
2) Reuse static file serving helpers between status UI and mirror tooling.
3) Remove or centralize the fallback diagnostics pipeline definition.
4) Consolidate repo/runs/out path resolution across scripts + design context.
5) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 9 Runbook (draft)
1) Rewire `orchestrator/src/cli/run/environment.ts` to use `scripts/lib/run-manifests.js` (and reuse `listDirectories` in `ExperienceStore` + `resolveEnvironmentPaths` in status UI build/serve + run-review).
2) Ensure `dist/` ships `scripts/lib` for packaged resolution parity.
3) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 10 Runbook (draft)
1) Reuse shared date math in spec-guard (`computeAgeInDays`).
2) Replace `toPosixPath` in mirror fetch tooling with the shared helper.
3) Rewire design purge + tasks archive run-id parsing to use `scripts/lib/run-manifests.js`.
4) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 11 Runbook (draft)
1) Replace status UI task-key helper with shared `normalizeTaskKey`.
2) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 12 Runbook (draft)
1) Reuse shared repo/run resolvers in `scripts/run-review.ts` + `scripts/mirror-site.mjs`.
2) Reuse `resolveOutDir` for docs archive/freshness tooling outputs.
3) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 13 Runbook (draft)
1) Replace remaining `resolveRepoRoot`/`resolveRunsDir`/`resolveOutDir` call sites with `resolveEnvironmentPaths`.
2) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 14 Runbook (draft)
1) Replace local docs path existence helpers with shared `pathExists` in `scripts/lib/docs-helpers.js`.
2) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 15 Runbook (draft)
1) Trim run-manifests resolver exports and reuse `resolveEnvironmentPaths` return type in `orchestrator/src/cli/run/environment.ts`.
2) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 16 Runbook (draft)
1) Replace local file existence helpers in status UI build, run-review, mirror-site, and design visual regression with `pathExists`.
2) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 17 Runbook (draft)
1) Resolve CLI environment paths via `resolveEnvironmentPaths` and keep `environment.ts` for type + task-id normalization only.
2) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Phase 18 Runbook (draft)
1) Normalize guardrail summary detection to include spec-guard runner commands.
2) Remove the optional-deps wrapper by importing `scripts/design/pipeline/optional-deps.js` directly.
3) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

## Delegation
- [x] Subagent run captured - Evidence: `.runs/0101-slimdown-audit-review/cli/2026-01-01T04-44-27-502Z-9688b054/manifest.json`, `.runs/0101-slimdown-audit-nextsteps/cli/2026-01-01T05-38-23-619Z-961fd034/manifest.json`, `.runs/0101-slimdown-audit-usage/cli/2026-01-01T06-08-57-842Z-dee29417/manifest.json`, `.runs/0101-slimdown-audit-nextphase/cli/2026-01-01T06-22-49-653Z-3e9e326e/manifest.json`, `.runs/0101-slimdown-audit-usage2/cli/2026-01-01T10-04-09-470Z-2a8c0e1b/manifest.json`, `.runs/0101-slimdown-audit-slimdown2/cli/2026-01-01T11-00-20-245Z-fca96825/manifest.json`, `.runs/0101-slimdown-audit-pass3/cli/2026-01-01T13-19-30-562Z-fb8559df/manifest.json`, `.runs/0101-slimdown-audit-phase6/cli/2026-01-01T13-58-29-786Z-01202b8e/manifest.json`, `.runs/0101-slimdown-audit-impl1/cli/2026-01-01T14-37-01-370Z-7538c896/manifest.json`, `.runs/0101-slimdown-audit-scout/cli/2026-01-01T15-58-52-966Z-2f8ac345/manifest.json`, `.runs/0101-slimdown-audit-scout2/cli/2026-01-02T06-46-06-627Z-0e162446/manifest.json`, `.runs/0101-slimdown-audit-resolver/cli/2026-01-02T09-00-37-249Z-e98a2f15/manifest.json`, `.runs/0101-slimdown-audit-scout3/cli/2026-01-02T09-57-29-698Z-58860366/manifest.json`, `.runs/0101-slimdown-audit-scout4/cli/2026-01-02T10-55-12-120Z-5e7504b1/manifest.json`, `.runs/0101-slimdown-audit-hunt1/cli/2026-01-02T12-30-19-247Z-b99ceeb5/manifest.json`, `.runs/0101-slimdown-audit-hunt2/cli/2026-01-02T13-46-37-874Z-01efddfc/manifest.json`, `.runs/0101-slimdown-audit-hunt3/cli/2026-01-02T14-40-21-824Z-a1fa2df3/manifest.json`, `.runs/0101-slimdown-audit-hunt4/cli/2026-01-02T15-29-57-838Z-c6b88cf6/manifest.json`, `.runs/0101-slimdown-audit-hunt5/cli/2026-01-02T16-12-20-495Z-64aabefa/manifest.json`, `.runs/0101-slimdown-audit-hunt6/cli/2026-01-02T16-48-09-519Z-6db698f3/manifest.json`, `.runs/0101-slimdown-audit-hunt7/cli/2026-01-02T17-28-55-010Z-bb65bf5e/manifest.json`, `.runs/0101-slimdown-audit-hunt8/cli/2026-01-02T18-13-24-956Z-63ce6e71/manifest.json`, `.runs/0101-slimdown-audit-hunt9/cli/2026-01-02T19-09-59-034Z-16bd8ebc/manifest.json`, `.runs/0101-slimdown-audit-hunt10/cli/2026-01-03T00-21-25-802Z-96e4a179/manifest.json`, `.runs/0101-slimdown-audit-hunt11/cli/2026-01-03T04-02-04-863Z-95fa88e1/manifest.json`.

## Implementation
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
- [x] Phase 9 consolidation executed (resolver unification + dist shipping) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T09-16-35-400Z-28b143d5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T14-55-28-935Z-24c71173/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T15-35-14-355Z-282b6470/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-15-03-569Z-f1e2d6cd/manifest.json`.
- [x] Phase 10 consolidation executed (script helper drift cleanup) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T10-23-28-082Z-dc336fd7/manifest.json`.
- [x] Phase 11 consolidation executed (status UI task-key normalization) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T11-53-07-596Z-dbddf8db/manifest.json`.
- [x] Phase 12 consolidation executed (docs + run/out resolver alignment) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T13-01-51-814Z-021b8041/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T13-55-59-723Z-62f6f269/manifest.json`.
- [x] Phase 13 consolidation executed (env resolver call-site consolidation) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T16-56-04-083Z-fffd4806/manifest.json`.
- [x] Phase 14 consolidation executed (docs helper pathExists reuse) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T17-44-33-292Z-f3f7b8c7/manifest.json`.
- [x] Phase 15 consolidation executed (resolver API trim) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T18-25-48-442Z-74eb1353/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T19-27-43-563Z-d6350a14/manifest.json`.
- [x] Phase 16 consolidation executed (pathExists reuse in status UI, mirror, review, design scripts) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T19-56-02-736Z-5bac93fd/manifest.json`.
- [x] Phase 17 consolidation executed (CLI env resolver wrapper removed) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-03T00-43-23-233Z-849e7395/manifest.json`.
- [x] Phase 18 consolidation executed (guardrail detection + optional-deps wrapper removal) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-03T04-14-39-520Z-2b87960a/manifest.json`.

## Validation + Handoff
- [x] Docs-review manifest captured (if doc-only changes) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T06-52-39-251Z-006dbf53/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T14-09-05-816Z-0c732c0b/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T14-36-24-243Z-95cbbe20/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T15-58-20-481Z-0ed04072/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-52-59-234Z-249b7bd8/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T01-45-50-306Z-0b3346ae/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T01-52-56-143Z-9ad8920d/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T02-20-52-639Z-d06c3655/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T02-41-59-440Z-885c79db/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T04-12-32-043Z-4e121dac/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T06-55-04-213Z-55d3f4a1/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-55-37-130Z-c402e6fb/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-00-37-065Z-5391c706/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T12-41-06-364Z-cd175807/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T12-58-29-363Z-8fd2e290/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T13-54-00-624Z-d3e36760/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T14-12-18-533Z-c2d9bd50/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T14-57-19-702Z-e80c5979/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T15-28-00-072Z-d17a5b2b/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T15-36-57-582Z-43141b97/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-10-19-693Z-120d35f6/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-16-43-058Z-05acbb94/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-49-34-024Z-5a2b3cb6/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T17-33-50-144Z-0ed18b20/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T18-14-47-765Z-336eafb3/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T18-36-36-848Z-d5087848/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T19-12-28-036Z-367d2bc2/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T19-33-32-512Z-bf6c97bd/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T19-51-16-427Z-2436596a/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T23-52-33-485Z-ee1b36d2/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T00-26-10-060Z-7d3aa6a1/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T00-53-56-830Z-7ea1799c/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T04-13-58-327Z-45a18714/manifest.json`.
- [x] Review-loop SOP updated to monitor inline review threads - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T02-20-52-639Z-d06c3655/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T02-41-59-440Z-885c79db/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T04-12-32-043Z-4e121dac/manifest.json`.
- [x] Review-loop SOP updated to scale post-green monitoring time by complexity - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T02-41-59-440Z-885c79db/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T04-12-32-043Z-4e121dac/manifest.json`.
- [x] Review-loop SOP updated with explicit complexity rubric - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T04-12-32-043Z-4e121dac/manifest.json`.
- [x] Review-loop SOP updated to reply in-thread, react, and resolve connector review threads - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T08-43-51-067Z-2a27c307/manifest.json`.
- [x] Implementation-gate manifest captured after code changes - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T11-12-06-081Z-b957f1cf/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T14-09-41-854Z-46f3b7ea/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T15-30-21-816Z-3ab2817f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-30-31-721Z-35c24301/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-53-34-477Z-50756963/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T01-46-31-523Z-0a37d3fe/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T07-30-37-808Z-9a35aa5f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-12-07-082Z-bc0c7883/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-22-25-959Z-0202a7c5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-11-06-612Z-b04c1d6c/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-16-35-400Z-28b143d5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T10-23-28-082Z-dc336fd7/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-21-53-840Z-375955a7/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-53-07-596Z-dbddf8db/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T13-01-51-814Z-021b8041/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T13-55-59-723Z-62f6f269/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T14-55-28-935Z-24c71173/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T15-35-14-355Z-282b6470/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-15-03-569Z-f1e2d6cd/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-56-04-083Z-fffd4806/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T17-44-33-292Z-f3f7b8c7/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T18-25-48-442Z-74eb1353/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T19-27-43-563Z-d6350a14/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T19-56-02-736Z-5bac93fd/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T00-43-23-233Z-849e7395/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T04-14-39-520Z-2b87960a/manifest.json`.
- [x] Diff budget check passed (override recorded for Phase 6 consolidation scope) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T11-12-06-081Z-b957f1cf/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T14-09-41-854Z-46f3b7ea/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T15-30-21-816Z-3ab2817f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-30-31-721Z-35c24301/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-53-34-477Z-50756963/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T01-46-31-523Z-0a37d3fe/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T07-30-37-808Z-9a35aa5f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-12-07-082Z-bc0c7883/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-22-25-959Z-0202a7c5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-11-06-612Z-b04c1d6c/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-16-35-400Z-28b143d5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T10-23-28-082Z-dc336fd7/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-21-53-840Z-375955a7/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-53-07-596Z-dbddf8db/manifest.json`.
- [x] Frontend-testing manifest captured with DevTools enabled - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T10-10-36-969Z-c65778ef/manifest.json`.
