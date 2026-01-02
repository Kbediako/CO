# Technical Spec - Slimdown Audit (Task 0101-slimdown-audit)

Source of truth for requirements: `tasks/tasks-0101-slimdown-audit.md`.

## Consolidation Targets (Delete or Merge)

### 1) Legacy CLI and MCP wrappers
- Delete redundant wrappers that duplicate the orchestrator CLI (Phase 1 completed; files removed):
  - scripts/mcp-runner-start.sh
  - scripts/mcp-runner-poll.sh
  - scripts/run-mcp-diagnostics.sh
  - scripts/agents_mcp_runner.mjs
  - scripts/run-local-mcp.sh (fold behavior into `codex-orchestrator mcp` if logging is still required)
  - scripts/manual-orchestrator-run.ts
- Update docs and READMEs to call `codex-orchestrator start|status|resume|mcp` directly.
- Preconditions: update `.runs/README.md`, `.agent/readme.md`, `.agent/system/services.md`, `docs/REFRACTOR_PLAN.md`, and `tasks/tasks-0914-npm-companion-package.md` before deletion (done as part of Phase 1).

### 2) Duplicate helper utilities
- Atomic writes:
  - Replace local `writeJsonAtomic` implementations in scripts/mcp-runner-metrics.js, scripts/mcp-runner-migrate.js, `scripts/status-ui-build.mjs`, and `packages/shared/design-artifacts/writer.ts` with the canonical helper (`orchestrator/src/cli/utils/fs.ts` or a shared helper extracted to `packages/shared`).
- Task/run ID sanitization:
  - Remove local `sanitizeTaskId`/`sanitizeRunId` in `packages/shared/design-artifacts/writer.ts` and reuse `orchestrator/src/persistence/sanitizeTaskId.ts` and `sanitizeRunId.ts` (or a shared helper moved to `packages/shared`).
- Environment path resolution:
  - Standardize on `CODEX_ORCHESTRATOR_ROOT` and a shared resolver for `repoRoot`, `runsRoot`, `outRoot` (ensure orchestrator and scripts share one implementation).

### 3) Pipeline duplication
- Remove devtools variants that differ only by env toggles:
  - `implementation-gate-devtools` and `frontend-testing-devtools` in `codex.orchestrator.json` (replace with aliases + `CODEX_REVIEW_DEVTOOLS=1`).
- Replace with a single pipeline + documented env override (`CODEX_REVIEW_DEVTOOLS=1`) or a CLI flag.
- Preconditions: update README, `.agent` SOPs, and frontend-testing/devtools PRDs + TECH_SPECs that explicitly call out the devtools pipeline IDs.

### 4) Legacy migration and metrics scripts
- Retire scripts/mcp-runner-migrate.js once all legacy `.runs/local-mcp` data is migrated (compat pointers already written by the CLI).
- Retire scripts/mcp-runner-metrics.js if metrics summaries are replaced by orchestrator aggregates or no longer consumed.
- Preconditions: update `.runs/README.md` (metrics summary + migrations pointers) and any reviewer guidance referencing these scripts.

### 5) Optional: adapter parallel-goals harness
- If unused, remove scripts/run-parallel-goals.ts and the `parallel:goals` npm script.

### 6) Archive workflow duplication
- Consolidate tasks + implementation-docs archive workflows via a shared base workflow to reduce repeated setup/sync/PR steps.
- Keep the existing workflow filenames as thin wrappers for stable references in docs and task checklists.

### 7) CLI entrypoint duplication
- Deduplicate HUD gating and run output formatting across start/resume/frontend-test in `bin/codex-orchestrator.ts`.

### 8) Documentation tooling duplication
- Consolidate shared helpers across docs scripts (collection, path normalization, task-key normalization, date parsing).
- Targets with duplicated logic:
  - `scripts/docs-hygiene.ts` (collect markdown, toPosixPath)
  - `scripts/docs-freshness.mjs` (collect markdown, toPosix, parseDate/computeAgeInDays)
  - `scripts/tasks-archive.mjs` (normalizeTaskKey)
  - `scripts/implementation-docs-archive.mjs` (collect markdown, toPosix, normalizeTaskKey, parseDate/computeAgeInDays)
  - `scripts/delegation-guard.mjs` (normalizeTaskKey)
- Expected approach: extract small shared helpers under `scripts/lib/` and remove duplicate implementations to keep behavior identical.

### 9) Pack script duplication
- `scripts/pack-audit.mjs` and `scripts/pack-smoke.mjs` share identical `npm pack` parsing; consolidate the shared `runPack` helper.

### 10) Wrapper script cleanup
- Remove the codex-devtools wrapper (one-line wrapper) and replace docs with the canonical `codex -c 'mcp_servers.chrome-devtools.enabled=true' ...` invocation.

### 11) CLI arg parsing + run discovery helpers
- Extract a shared `parseArgs` helper for scripts that repeat the same `--flag` / `--flag=value` parsing.
- Extend the shared parser to mirror tooling (`scripts/mirror-check.mjs`, `scripts/mirror-serve.mjs`, `scripts/mirror-style-fingerprint.mjs`).
- Centralize `.runs` manifest discovery used by `scripts/run-review.ts`, `scripts/status-ui-build.mjs`, and `scripts/delegation-guard.mjs`.

### 12) Mirror + design tooling overlap
- Share optional dependency loading between `scripts/design/pipeline/optionalDeps.ts` and `scripts/mirror-optional-deps.mjs`.
- Consolidate compliance permit parsing between `scripts/design/pipeline/toolkit/common.ts` and `scripts/mirror-site.mjs`.
- Share mirror config parsing/validation between `scripts/mirror-site.mjs` and `scripts/mirror-check.mjs`; reuse CLI arg parsing for mirror-serve/fingerprint.
- Ensure shared JS helpers (permit + optional-deps) are shipped in `dist/` for design pipeline stages.

### 13) Pipeline stage duplication (design + diagnostics)
- Use stage sets for shared design stages across `design-reference` and `hi-fi-design-toolkit` (spec-guard + artifact writer).
- Use stage sets for shared diagnostics guardrails (delegation + spec-guard), keeping eval between build/lint/test and spec-guard.
- Note: stage sets cannot include nested stage-set refs (enforced by `orchestrator/src/cli/config/userConfig.ts`).

### 14) Adapter command defaults
- Extract shared defaults/builders for `adapters/*/build-test-configs.ts` to reduce repeated command scaffolding (fixture cwd + clean fixture).

### 15) Slugify helper reuse
- Replace design pipeline slugify variants with a shared helper (move to `packages/shared/utils/strings.ts` and re-export in orchestrator).

### 16) Guardrail stage-set reuse
- Replace repeated delegation/spec-guard command blocks in `docs-review`, `implementation-gate`, `tfgrpo-learning`, and design pipelines with stage-set references.
- Align the shared spec-guard stage to invoke the packaged spec-guard runner (skips cleanly when `scripts/spec-guard.mjs` is absent).

### 17) Docs-review tail stage-set reuse
- `docs-review` and `implementation-gate` repeat the same `docs:check` + `docs:freshness` stages.
- Extract a shared stage-set for the docs-review checks and reference it in both pipelines (keep diff-budget + review stages where they are).

### 18) Static file server duplication (status UI + mirror)
- `scripts/status-ui-serve.mjs` duplicates the static file server logic in `scripts/lib/mirror-server.mjs` (content-type map, path safety, 404/403 handling).
- Reuse the mirror server helper for status UI serving, or move the shared pieces into a single helper to reduce drift.

### 19) Diagnostics fallback duplication
- `orchestrator/src/cli/pipelines/index.ts` defines a fallback diagnostics pipeline that duplicates `codex.orchestrator.json`.
- Remove the duplicate definition or source it from the config to avoid drift.

### 20) Environment path resolution duplication
- Repo/runs/out path resolution and directory listing helpers are implemented in `orchestrator/src/cli/run/environment.ts`, `orchestrator/src/persistence/ExperienceStore.ts`, `scripts/status-ui-build.mjs`, `scripts/status-ui-serve.mjs`, `scripts/run-review.ts`, and `scripts/lib/run-manifests.js`.
- Consolidate the orchestrator resolver plus status UI build/serve and run-review to use shared run-manifest helpers (`resolveEnvironmentPaths`, `listDirectories`) and ship `scripts/lib` in `dist/` so the package runtime keeps a single source of truth.

### 21) Script helper drift (micro-duplication)
- `scripts/spec-guard.mjs` still defines local date math; reuse `computeAgeInDays` from `scripts/lib/docs-helpers.js`.
- `scripts/mirror-site.mjs` reimplements `toPosixPath`; reuse the shared helper to avoid divergent path normalization.
- `scripts/design/purgeExpired.ts` and `scripts/tasks-archive.mjs` hand-roll run metadata/paths; reuse `scripts/lib/run-manifests.js` utilities to honor the same env defaults.

### 22) Status UI task-key normalization
- `scripts/status-ui-build.mjs` duplicates task-key normalization logic; reuse the shared `normalizeTaskKey` helper for task index entries.

### 23) Docs + review/mirror path resolution
- `scripts/run-review.ts` and `scripts/mirror-site.mjs` still hardcode `.runs` roots; reuse `scripts/lib/run-manifests.js` helpers so `CODEX_ORCHESTRATOR_RUNS_DIR` and `CODEX_ORCHESTRATOR_ROOT` are honored.
- Docs archive/freshness tooling (`scripts/docs-freshness.mjs`, `scripts/tasks-archive.mjs`, `scripts/implementation-docs-archive.mjs`) still writes to `out/` directly; use `resolveOutDir` to honor `CODEX_ORCHESTRATOR_OUT_DIR`.

### 24) Remaining env resolver call sites
- Several scripts still call `resolveRepoRoot` + `resolveRunsDir`/`resolveOutDir` directly; collapse these to `resolveEnvironmentPaths()` to keep env resolution consistent and reduce per-script boilerplate.
- Target remaining mirror/docs/guardrail/design helpers and the spec-guard runner so all script-side env paths flow through the same resolver surface.

### 25) Docs helper path existence checks
- Docs scripts still define local `exists` helpers for path checks; reuse a shared `pathExists` helper in `scripts/lib/docs-helpers.js` to reduce drift.
- Target docs-hygiene, docs-freshness, and implementation-docs-archive.

### 26) Run-manifests resolver surface trim
- `scripts/lib/run-manifests.js` still exports `resolveRepoRoot` / `resolveRunsDir` / `resolveOutDir` even though call sites now use `resolveEnvironmentPaths`.
- Trim the export surface to just `resolveEnvironmentPaths` and reuse its return type in `orchestrator/src/cli/run/environment.ts` to keep env resolution wired to the shared resolver.
- Phase 15 executes this target (resolver API trim).

## Expected Line Reductions by Phase (Estimate)
- Phase 1 (wrapper cleanup): remove 5-6 wrapper/harness scripts.
  - Estimated reduction: ~360 to 500 lines.
- Phase 2 (legacy scripts + helper consolidation): remove migration/metrics scripts and dedupe helper functions.
  - Estimated reduction: ~350 to 420 lines.
- Phase 3 (pipeline and harness simplification): remove devtools pipeline duplicates and optional parallel-goals harness.
  - Estimated reduction: ~250 to 350 lines.
- Phase 4 (workflow + CLI dedupe): consolidate archive automation workflows and CLI HUD/output helpers.
  - Estimated reduction: ~80 to 140 lines.
- Phase 5 (docs + pack helper consolidation + wrapper removal): extract shared doc tooling helpers, dedupe pack scripts, and drop one-line wrappers.
  - Estimated reduction: ~180 to 260 lines.
- Phase 6 (CLI args + mirror overlap + pipeline/adapters): shared arg parsing + mirror/permit helpers + pipeline stage sets + adapter defaults.
  - Estimated reduction: ~160 to 240 lines.
- Phase 7 (guardrail stage-set reuse): replace repeated delegation/spec-guard command blocks and align spec-guard invocation.
  - Estimated reduction: ~40 to 80 lines.
- Phase 8 (docs-review checks + static server + fallback cleanup + env resolver): consolidate shared checks and server/path helpers.
  - Estimated reduction: ~60 to 120 lines.
- Phase 9 (resolver unification): remove remaining parallel resolver path + directory listing helper and ship shared resolver in dist.
  - Estimated reduction: ~10 to 30 lines.
- Phase 10 (script helper drift cleanup): reuse shared date/path/env helpers in remaining scripts.
  - Estimated reduction: ~10 to 25 lines.
- Phase 11 (status UI task-key normalization): drop local task-key helper in status UI build.
  - Estimated reduction: ~5 to 10 lines.
- Phase 12 (env root alignment): reuse shared repo/run/out resolvers across docs tooling, mirror helpers, guardrail runners, and CLI persistence outputs.
  - Estimated reduction: ~10 to 25 lines.
- Phase 13 (env resolver call-site consolidation): replace remaining resolveRepoRoot/resolveRunsDir/resolveOutDir uses with resolveEnvironmentPaths across scripts/runner helpers.
  - Estimated reduction: ~10 to 20 lines.
- Phase 14 (docs helper consolidation): reuse shared path-existence helper across docs scripts.
  - Estimated reduction: ~5 to 10 lines.
- Phase 15 (resolver API trim): drop unused run-manifest resolver exports and reuse the shared env type.
  - Estimated reduction: ~5 to 10 lines.

## Validation Steps per Phase

### Phase 1
- Update docs referencing removed scripts.
- Run the packaged spec-guard runner (`node "$CODEX_ORCHESTRATOR_PACKAGE_ROOT/dist/orchestrator/src/cli/utils/specGuardRunner.js" --dry-run`), or `node scripts/spec-guard.mjs --dry-run` when the script exists in-repo.
- Run `npm run build`, `npm run lint`, `npm run test`.
- Run `npm run docs:check` and `npm run docs:freshness`.
- Run `node scripts/diff-budget.mjs` and `npm run review` with manifest evidence.

### Phase 2
- Re-run full guardrails as above.
- Add or update targeted unit tests if helper behavior changes.
- Pre-delete checks: confirm no active consumers of scripts/mcp-runner-migrate.js / scripts/mcp-runner-metrics.js (repo search + CI/workflow scan), and verify `.runs/` artifacts remain sufficient without legacy summaries.

### Phase 3
- Re-run full guardrails as above.
- Validate pipeline IDs and devtools behavior using `codex-orchestrator start implementation-gate` and `frontend-testing` with `CODEX_REVIEW_DEVTOOLS=1`.
- Pre-delete checks: ensure no automation still calls `implementation-gate-devtools` / `frontend-testing-devtools`; add an explicit error or alias if needed to guide callers to the new path.

### Phase 4
- Re-run full guardrails as above.
- Validate archive automation workflows still open PRs and sync archive branches (dry-run locally if needed).

### Phase 5
- Re-run full guardrails as above.
- Validate docs tooling outputs remain identical (docs:check, docs:freshness, archive scripts in dry-run).

### Phase 6
- Re-run full guardrails as above.
- Validate mirror tools, design pipeline, and adapter commands still behave identically (smoke runs or dry-run flags).

### Phase 8
- Re-run docs-review and implementation-gate.
- Smoke status-ui-serve and mirror-serve to confirm static serving behavior is unchanged.
- Validate diagnostics pipeline resolution when config is present (no fallback drift).

### Phase 9
- Re-run implementation-gate to confirm env resolution + directory listing match script expectations.
- Validate packaged CLI can resolve repo/runs/out with `CODEX_ORCHESTRATOR_ROOT` + `CODEX_ORCHESTRATOR_RUNS_DIR` + `CODEX_ORCHESTRATOR_OUT_DIR`.

### Phase 10
- Re-run implementation-gate after helper reuse.

### Phase 11
- Re-run implementation-gate to confirm status UI data output is unchanged.

### Phase 12
- Re-run implementation-gate to confirm docs tooling, mirror helpers, guardrail runners, and CLI persistence outputs honor configured env roots.

### Phase 13
- Re-run implementation-gate to confirm the remaining script-side env resolver call sites still honor configured defaults.

### Phase 14
- Re-run implementation-gate after docs helper reuse to confirm docs tooling behavior remains unchanged.

### Phase 15
- Re-run implementation-gate after resolver API trimming to confirm env resolution remains unchanged.

## Execution Checklists (Draft)

### Phase 2 checklist
- Replace `writeJsonAtomic` duplicates in `scripts/status-ui-build.mjs` + `packages/shared/design-artifacts/writer.ts` with `orchestrator/src/cli/utils/fs.ts`.
- Swap `sanitizeTaskId` / `sanitizeRunId` in `packages/shared/design-artifacts/writer.ts` to use `orchestrator/src/persistence/sanitizeTaskId.ts` + `sanitizeRunId.ts`.
- Standardize env path resolution (prefer `CODEX_ORCHESTRATOR_ROOT` + shared resolver).
- Remove scripts/mcp-runner-migrate.js + scripts/mcp-runner-metrics.js after pre-delete checks.
- Update `.runs/README.md` + any reviewer guidance to drop metrics/migrations references.
- Phase 2 file targets (non-exhaustive):
  - scripts/mcp-runner-migrate.js, scripts/mcp-runner-metrics.js
  - `scripts/status-ui-build.mjs`, `packages/shared/design-artifacts/writer.ts`
  - `scripts/design/pipeline/context.ts`, `scripts/design/purgeExpired.ts`, `orchestrator/src/cli/services/commandRunner.ts` (env var consistency)
  - `docs/REFRACTOR_PLAN.md`, `.runs/README.md` (remove legacy script references)

### Phase 3 checklist
- Consolidate devtools pipelines to a single path (document `CODEX_REVIEW_DEVTOOLS=1` / `--devtools` entrypoint).
- Remove `implementation-gate-devtools` + `frontend-testing-devtools` from `codex.orchestrator.json` after pre-delete checks.
- Update docs/SOPs/PRDs listing the devtools pipeline IDs (see `docs/findings/slimdown-audit.md` map).
- Remove scripts/run-parallel-goals.ts + `parallel:goals` npm script if still unused.
- Phase 3 doc update list (primary references):
  - `README.md`, `.agent/AGENTS.md`, `.agent/SOPs/review-loop.md`, `.agent/SOPs/agent-autonomy-defaults.md`
  - `docs/AGENTS.md`, `docs/PRD-frontend-testing-core.md`, `docs/TECH_SPEC-frontend-testing-core.md`
  - `docs/PRD-devtools-readiness-orchestrator-usage.md`, `docs/TECH_SPEC-devtools-readiness-orchestrator-usage.md`, `docs/ACTION_PLAN-frontend-testing-core.md`
  - `.agent/task/0912-review-loop-devtools-gate.md`, `.agent/task/0915-frontend-testing-core.md`

### Phase 4 checklist
- Introduce a reusable archive automation workflow and update the existing archive workflows to call it.
- Deduplicate CLI HUD/output handling in `bin/codex-orchestrator.ts`.

### Phase 5 checklist
- Consolidate shared doc tooling helpers (doc collection, task-key normalization, date parsing, toPosix).
- Consolidate pack script `runPack` helper shared by pack-audit + pack-smoke.
- Remove the codex-devtools wrapper after updating docs that reference it.

### Phase 6 checklist
- Consolidate shared CLI arg parsing across scripts (guardrails, docs, mirror, status UI, review).
- Centralize `.runs` manifest discovery used by status UI + run-review + delegation-guard.
- Deduplicate optional dependency loading and compliance permit parsing between design + mirror tooling.
- Ensure shared JS helpers are included in `dist/` (permit + optional-deps).
- Introduce stage sets for shared design/diagnostics pipeline stages.
- Consolidate adapter build/test/lint command defaults.
- Replace design pipeline slugify variants with a shared helper.

### Phase 7 checklist
- Replace repeated delegation-guard command blocks with `delegation-guard-stage` in pipelines.
- Replace repeated spec-guard command blocks with the shared spec-guard stage set.
- Align spec-guard stage command to call the spec-guard runner wrapper (package-safe).

### Phase 8 checklist
- Extract a docs-review checks stage-set (`docs:check` + `docs:freshness`) and use it in `docs-review` + `implementation-gate`.
- Reuse static file server helper between status UI and mirror tooling.
- Remove or centralize the fallback diagnostics pipeline definition.
- Consolidate repo/runs/out path resolution (or rewire scripts to use a shared resolver).

### Phase 9 checklist
- Replace the orchestrator environment resolver + directory listing helper with the shared `scripts/lib/run-manifests.js` helpers (including status UI build/serve, run-review defaults, and ExperienceStore defaults).
- Include `scripts/lib` in `dist/` packaging so the resolver is available in the published CLI.

### Phase 2 runbook (ordered)
1) Confirm no external consumers for legacy scripts (repo + CI scan) and verify `.runs/` artifacts remain sufficient without `metrics-summary.json` / migrations logs.
2) Consolidate helper utilities:
   - Move `packages/shared/design-artifacts/writer.ts` to import `writeJsonAtomic`, `sanitizeTaskId`, `sanitizeRunId`.
   - Update `scripts/status-ui-build.mjs` to use the canonical `writeJsonAtomic`.
3) Normalize env path resolution to `CODEX_ORCHESTRATOR_ROOT` (remove `CODEX_ORCHESTRATOR_REPO_ROOT` usage in design scripts and ensure subprocess env stays consistent).
4) Delete scripts/mcp-runner-migrate.js + scripts/mcp-runner-metrics.js; update `.runs/README.md` + `docs/REFRACTOR_PLAN.md`.
5) Run full guardrails (spec-guard → build/lint/test → documentation gate → diff budget → review).

### Phase 3 runbook (ordered)
1) Inventory devtools pipeline references (use the list above) and decide the canonical replacement path (`CODEX_REVIEW_DEVTOOLS=1` or `--devtools`).
2) Add a compatibility path (alias or explicit error messaging) before removing pipeline IDs.
3) Remove `implementation-gate-devtools` + `frontend-testing-devtools` from `codex.orchestrator.json`; update docs/SOPs/PRDs.
4) Remove scripts/run-parallel-goals.ts + `parallel:goals` npm script if still unused.
5) Validate with `codex-orchestrator start implementation-gate` and `frontend-testing` using `CODEX_REVIEW_DEVTOOLS=1`.

### Phase 4 runbook (ordered)
1) Add a reusable archive automation workflow for shared checkout/setup/sync/PR steps.
2) Update tasks + implementation-docs archive workflow wrappers to call the shared workflow.
3) Deduplicate CLI HUD/output handling across start/resume/frontend-test.
4) Run full guardrails and record manifest evidence.

### Phase 5 runbook (ordered)
1) Extract shared doc tooling helpers into `scripts/lib/` (doc collection, task-key normalization, date parsing, toPosix).
2) Replace local duplicates in docs-hygiene, docs-freshness, tasks-archive, implementation-docs-archive, and delegation-guard.
3) Deduplicate pack `runPack` helper across pack-audit + pack-smoke.
4) Update docs to remove references to the codex-devtools wrapper, then delete the wrapper script.
5) Run full guardrails and record manifest evidence.

### Phase 6 runbook (ordered)
1) Introduce a shared `parseArgs` helper and migrate scripts with identical CLI parsing.
2) Extract `.runs` manifest discovery helpers for status UI + run-review + delegation-guard.
3) Consolidate mirror config/permit + optional dependency helpers (share between design + mirror tooling).
4) Update build output to include shared JS helpers (permit + optional-deps).
5) Add stage sets for shared design/diagnostics stages and replace duplicated stage blocks.
6) Extract adapter command defaults and reuse across go/python/typescript adapters.
7) Replace design pipeline slugify variants with the shared helper.
8) Run full guardrails and record manifest evidence.

### Phase 7 runbook (ordered)
1) Replace delegation-guard command blocks in pipelines with `delegation-guard-stage`.
2) Replace spec-guard command blocks in pipelines with the shared spec-guard stage set.
3) Align the spec-guard stage command to call the spec-guard runner wrapper (package-safe).
4) Run full guardrails and record manifest evidence.

### Phase 8 runbook (ordered)
1) Add a docs-review checks stage-set (`docs:check` + `docs:freshness`) and reference it from `docs-review` + `implementation-gate`.
2) Reuse static file serving helpers between status UI and mirror tooling.
3) Remove or source the fallback diagnostics pipeline from config.
4) Consolidate repo/runs/out path resolution across scripts + design context.
5) Run full guardrails and record manifest evidence.

### Phase 9 runbook (ordered)
1) Rewire `orchestrator/src/cli/run/environment.ts` to use `scripts/lib/run-manifests.js` for repo/runs/out resolution.
2) Ensure `dist/` includes `scripts/lib` so the resolver is available in packaged runs.
3) Run implementation-gate and record manifest evidence.

### Phase 10 runbook (ordered)
1) Reuse shared helpers in spec-guard, mirror-site, and design purge/tasks-archive via `scripts/lib/docs-helpers.js` + `scripts/lib/run-manifests.js`.
2) Run implementation-gate and record manifest evidence.

### Phase 11 runbook (ordered)
1) Replace status UI task-key helper with `normalizeTaskKey`.
2) Run implementation-gate and record manifest evidence.

### Phase 12 runbook (ordered)
1) Reuse shared repo/run/out resolvers across run-review, mirror tooling (fetch/check/serve/fingerprint), docs tooling (hygiene/freshness/archives), guardrail runners, and CLI persistence outputs.
2) Run implementation-gate and record manifest evidence.

### Phase 15 runbook (ordered)
1) Trim run-manifest resolver exports to `resolveEnvironmentPaths` only and reuse its return type in `orchestrator/src/cli/run/environment.ts`.
2) Run implementation-gate and record manifest evidence.

### Phase 3 per-file doc update checklist (draft)
- `README.md`: replace devtools pipeline IDs with the new path; update example commands.
- `.agent/AGENTS.md`: swap devtools pipeline guidance to the new path.
- `.agent/SOPs/review-loop.md`: remove mentions of `implementation-gate-devtools`.
- `.agent/SOPs/agent-autonomy-defaults.md`: replace `implementation-gate-devtools` references.
- `docs/AGENTS.md`: update devtools command examples.
- `docs/PRD-frontend-testing-core.md`: remove devtools pipeline ID references; document new enablement path.
- `docs/TECH_SPEC-frontend-testing-core.md`: replace pipeline ID references; update validation notes.
- `docs/PRD-devtools-readiness-orchestrator-usage.md`: swap to new devtools path.
- `docs/TECH_SPEC-devtools-readiness-orchestrator-usage.md`: update preflight guidance to new path.
- `docs/ACTION_PLAN-frontend-testing-core.md`: remove devtools pipeline ID in the plan.
- `.agent/task/0912-review-loop-devtools-gate.md`: update evidence notes if the pipeline ID changes.
- `.agent/task/0915-frontend-testing-core.md`: update references to devtools pipeline creation.
  - `docs/findings/slimdown-audit.md`: refresh the devtools reference map after consolidation.
  - Edit notes:
    - `README.md`: update the DevTools gate section and frontend-testing examples to use `CODEX_REVIEW_DEVTOOLS=1` or `--devtools`.
    - `.agent/AGENTS.md` + `docs/AGENTS.md`: replace devtools pipeline IDs in the “DevTools-enabled” command examples.
    - `.agent/SOPs/review-loop.md` + `.agent/SOPs/agent-autonomy-defaults.md`: swap devtools pipeline IDs in gate guidance.
    - Frontend testing specs/PRDs: replace devtools pipeline IDs in enablement + validation sections.

## Consolidated Handoff Checklist (Phase 2 → Phase 3)
1) Phase 2 prechecks + repo scan complete; `.runs/` artifacts confirmed sufficient without legacy summaries.
2) Helper consolidation done (atomic writes, sanitizers, env vars).
3) Legacy scripts removed (mcp-runner-migrate.js, mcp-runner-metrics.js) + docs updated.
4) DevTools consolidation plan chosen (alias vs explicit error).
5) DevTools pipeline IDs removed; docs/SOPs updated per checklist.
6) Optional `parallel:goals` harness removed (if unused).
7) Full guardrails run and evidence recorded.

## DevTools Consolidation Decision (Draft)
- Option A: Alias old pipeline IDs to the new path for one release window.
  - Pros: smoothest migration, no hard failures.
  - Cons: prolongs duplication and hidden usage.
- Option B: Hard error with a clear message and recommended replacement command.
  - Pros: forces migration, removes ambiguity quickly.
  - Cons: breaks any untracked automation immediately.
- Recommendation: start with Option A for one cycle (warn), then move to Option B once usage drops to zero.
