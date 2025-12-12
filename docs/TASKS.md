# Task List Snapshot — Orchestrator Workspace

- **Update — 2025-11-06:** Snakes Arena game assets were extracted from this repository and archived under `/Users/asabeko/Documents/snakes-arena-backup`; the remaining pipelines cover orchestrator diagnostics, linting, testing, and spec guard validation only.

## Checklist Mirror
The Snakes Arena checklist has been retired from this workspace; reference the archived manifests in `/Users/asabeko/Documents/snakes-arena-backup/.runs/` if historical evidence is needed.

> _Guardrail note:_ Minimal diagnostics or smoke-test pipelines can opt out of spec-guard enforcement by setting `guardrailsRequired: false` in their pipeline definition (e.g., inside `codex.orchestrator.json`). Standard design pipelines keep `node scripts/spec-guard.mjs --dry-run` inline so manifests such as `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json` continue to record guardrail evidence automatically.

# Task List Snapshot — Orchestrator Issue Validation & Prioritization (0901)

- **Update — Planning:** Validation docs prepared; awaiting first diagnostics/plan manifest under `.runs/0901-orchestrator-issue-validation/cli/<run-id>/manifest.json`.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0901-orchestrator-issue-validation` before orchestrator commands. Validation runs should keep guardrails on: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`.

## Checklist Mirror
Mirror status with `tasks/tasks-0901-orchestrator-issue-validation.md` and `.agent/task/0901-orchestrator-issue-validation.md` (create if automation requires). Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/plan manifest captured — Evidence: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0901-orchestrator-issue-validation/metrics.json`, `out/0901-orchestrator-issue-validation/state.json`.
- [x] PRD/spec/tasks mirrors updated with manifest links — Evidence: `.runs/0901-orchestrator-issue-validation/cli/2025-12-12T02-00-30-325Z-9cd0b653/manifest.json`.

### Validation
- [x] Issue #1 validated (sub‑pipeline error finalization) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #2 validated (CLI exec args passthrough) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #3 validated (session env override on reuse) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #4 validated (retry config clobbering) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #5 validated (`isIsoDate` strictness) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #6 validated (instruction stamp guard behavior) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #7 validated (timeout kill cross‑platform) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #8 validated (temp dir cleanup) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.
- [x] Issue #9 validated (eslint plugin side‑effect build) — Evidence: `tasks/tasks-0901-orchestrator-issue-validation.md`.

### Follow‑up Plan
- [x] Prioritized fix backlog created (new task/PR) with acceptance criteria — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.

# Task List Snapshot — Orchestrator Reliability Fixes (0902)

- **Update — Planning:** Follow‑on hardening task from 0901; implementation underway.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0902-orchestrator-reliability-fixes` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`.

## Checklist Mirror
Mirror status with `tasks/tasks-0902-orchestrator-reliability-fixes.md` and `.agent/task/0902-orchestrator-reliability-fixes.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/guardrails manifest captured — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0902-orchestrator-reliability-fixes/metrics.json`, `out/0902-orchestrator-reliability-fixes/state.json`.
- [x] PRD/spec/task mirrors updated with manifest links — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.

### Fixes
- [x] Issue #1 fixed: sub‑pipeline exceptions finalize parent manifests/stages — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #2 fixed: CLI exec executor forwards unified exec args — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #3 fixed: session reuse applies env overrides — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #4 fixed: retry defaults not clobbered by `undefined` spreads — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #5 fixed: `isIsoDate` enforces strict ISO‑8601 expectations — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #6 fixed: instruction loader warns+skips unstamped optional candidates — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #7 fixed: timeout kill is cross‑platform/Windows‑safe — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #8 fixed: temp dirs cleaned in crystalizer and SDK exec — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.
- [x] Issue #9 fixed: eslint plugin no longer runs builds as side effects — Evidence: `tasks/tasks-0902-orchestrator-reliability-fixes.md`.

### Guardrails
- [x] Spec guard passes — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.

# Task List Snapshot — TaskStateStore Run History File Fix (0903)

- **Update — Planning:** Follow‑on from 0902 to remove TaskStateStore/metrics `state.json` collision.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0903-taskstate-store-run-history-fix` before orchestrator commands. Guardrails required.

## Checklist Mirror
Mirror status with `tasks/tasks-0903-taskstate-store-run-history-fix.md` and `.agent/task/0903-taskstate-store-run-history-fix.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Diagnostics/guardrails manifest captured — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0903-taskstate-store-run-history-fix/metrics.json`, `out/0903-taskstate-store-run-history-fix/state.json`.
- [x] PRD/spec/task mirrors updated with manifest links — Evidence: `tasks/tasks-0903-taskstate-store-run-history-fix.md`.

### Fix
- [x] TaskStateStore run history uses `runs.json` without overwriting metrics `state.json`.

### Guardrails
- [x] Spec guard passes — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Lint passes — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.
- [x] Tests pass — Evidence: `.runs/0903-taskstate-store-run-history-fix/cli/2025-12-12T04-49-23-224Z-5cfceb39/manifest.json`.

# Task List Snapshot — Dead Code Pruning & Evidence (0801)

- **Update — Planning:** Diagnostics captured at `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`; dead-code deletions and archive relocations complete (archives parked under `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/` with README pointers) and guardrails/tests rerun on 2025-12-09.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0801-dead-code-pruning` before running orchestrator commands; guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test` (and `npm run build` if touching orchestrator packages).

## Checklist Mirror
Mirror status with `tasks/tasks-0801-dead-code-pruning.md` and `.agent/task/0801-dead-code-pruning.md` (if created). Keep `[ ]` until manifest path is recorded.

### Foundation
- [x] Diagnostics/plan manifest captured — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0801-dead-code-pruning/metrics.json`, `out/0801-dead-code-pruning/state.json`.
- [x] PRD/spec/tasks mirrors updated with manifest links — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.

### Remediation Plan
- [x] Unused CLI/learning/SDK helpers removed or justified — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Aggregator entrypoints/pattern registries evaluated and pruned or documented — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Evaluation harness + mirror server + design sample handled (delete/archive/justify) — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Archives decision (keep with README pointer or relocate to archive folder) — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Guardrails/tests executed — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test` (and `npm run build` when orchestrator code touched); Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.

### Review & Handoff
- [x] Reviewer hand-off run (`npm run review --manifest <latest>`) with approvals captured — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.

# Task List Snapshot — Codex Orchestrator Slimdown (0707)

- **Update — Planning:** PRD + tech spec published; CI/local test coverage policy recorded (core vs full-matrix lanes). Awaiting first diagnostics manifest under `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0707-orchestrator-slimdown` for orchestrator commands so manifests, metrics, and `out/**` land in the correct directories.

## Checklist Mirror
Mirror status with `tasks/tasks-0707-orchestrator-slimdown.md` and `.agent/task/0707-orchestrator-slimdown.md`. Keep `[ ]` until a manifest path such as `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json` is recorded.

### Foundation
- [x] Diagnostics manifest captured — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-01T09-37-11-576Z-1a60ebea/manifest.json`.
- [ ] Metrics/state snapshots updated — Evidence: `.runs/0707-orchestrator-slimdown/metrics.json`, `out/0707-orchestrator-slimdown/state.json`.
- [ ] CI/test coverage policy mirrored across PRD/spec/tasks — core PR lane runs `npm run build`, `npm run lint`, `npm run test`; full-matrix PR lane (label `full-matrix` or adapters/evaluation/design/patterns paths) runs `npm run build:all`, `npm run lint`, `npm run test`, `npm run test:adapters`, `npm run test:evaluation`, `npm run eval:test` when fixtures/optional design deps installed; release/RC always full matrix; local baseline = core with full matrix locally when touching adapters/evaluation/design/patterns or release prep after `npm run setup:design-tools && npx playwright install` + fixtures (note if skipped). Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json` (documentation update run).

### Deliverables
- [ ] Manifest single-source + generated TS types/AJV validator; duplicate schema removed — Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.
- [ ] Unused agent SDK deps removed with usages pruned/shimmed — Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.
- [ ] Core build split (`npm run build` core, `npm run build:all` full matrix) — Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.
- [ ] Design deps optional/lazy across toolkits + mirror scripts with runtime guidance — Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.
- [ ] Patterns lint guard builds `dist/patterns/linters/index.js` only when missing/outdated — Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.
- [ ] Exec command modularized without behavior change — Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.
- [ ] Scoped test scripts added (`test:orchestrator`, `test:adapters`, `test:evaluation`; default `npm test` = core) — Evidence: `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`.

# Task List Snapshot — Design Reference Pipeline (0401-design-reference)

- **Update — 2025-11-21:** Diagnostics + review run captured at `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`; use this evidence path across mirrors.
- **Update — Configuration planning:** `design.config.yaml` schema drafted alongside pipeline toggles documentation; manifest reference set to `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`.
- **Notes:** Optional tool setup lives behind `npm run setup:design-tools`; retention/expiry policies will reference `design.config.yaml > metadata.design.retention`.

## Checklist Mirror
Mirror status with `tasks/design-reference-pipeline.md` and `.agent/task/design-reference-pipeline.md`. Keep `[ ]` until a manifest path such as `.runs/0401-design-reference/cli/<run-id>/manifest.json` is recorded.

### Foundation
- [x] Collateral synchronized — `docs/design/PRD-design-reference-pipeline.md`, `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, `tasks/index.json`, `.agent/task/design-reference-pipeline.md`, `docs/TASKS.md`; Evidence: `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`.
- [x] Pipeline toggles wired — `design.config.yaml` template + CLI/ENV triggers (`--pipeline design-reference`, `DESIGN_PIPELINE=1`) documented; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Setup tooling — `npm run setup:design-tools` captures Playwright/FFmpeg optional installs without impacting baseline CI; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

### Pipeline Stages
- [x] Playwright extractor implemented — stages DOM/CSS/screenshots with privacy approvals logged; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Reference page builder shipped — `motherduck.html` staged under `design/reference/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Componentization stage delivered — `packages/design-system` assets staged under `design/components/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Advanced assets optionality — Framer Motion + FFmpeg outputs gated by config quotas; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

### Manifest & Guardrails
- [x] Manifest schema updates — `packages/shared/manifest/types.ts` + `packages/shared/manifest/writer.ts` persist `design_artifacts`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] DesignArtifactWriter output — `out/0401-design-reference/design/runs/<run>.json` summary written with retention/privacy fields; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Retention & privacy controls — expiry automation/docs and approval logging established; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Guardrail integration — `scripts/spec-guard.mjs` covers `docs/design/specs/**`; `npm --prefix packages/design-system run test:visual` hooked into pipeline; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

### Verification & Approvals
- [x] Visual regression evidence — diff artifacts + pass/fail summaries staged under `design/visual-regression/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Diagnostics run — `npx codex-orchestrator start diagnostics --pipeline design-reference --format json`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Reviewer hand-off — `npm run review` references latest design-reference manifest and approvals; Evidence: `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`.

# Task List Snapshot — Hi-Fi Design Toolkit (0410-hi-fi-design-toolkit)

- **Update — Pending kickoff:** PRD, spec, and task mirrors drafted; awaiting diagnostics run to capture `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json`.
- **Update — External toolkit:** Autonomous hi-fi design starter will be synchronized into this repo with compliance permits before extractor work begins.
- **Notes:** Always export `MCP_RUNNER_TASK_ID=0410-hi-fi-design-toolkit` so manifests, metrics, and out files land under the correct directories.

## Checklist Mirror
Mirror status with `tasks/hi-fi-design-toolkit.md` and `.agent/task/hi-fi-design-toolkit.md`. Keep `[ ]` until a manifest path such as `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json` is recorded.

### Foundation
- [x] Collateral minted — `docs/design/PRD-hi-fi-design-toolkit.md`, `docs/design/specs/HI_FI_DESIGN_TOOLKIT.md`, `tasks/index.json`, `.agent/task/hi-fi-design-toolkit.md`, `docs/TASKS.md`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.
- [x] External toolkit synchronized — vendored `/home/jr_ga/code/ASABEKO/autonomous-hi-fi-design-starter` with snapshot metadata in `packages/design-reference-tools/VENDOR.md`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.
- [x] Compliance permits imported — `compliance/permit.json` mirrors upstream approvals and is referenced by docs; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.

### Pipeline Enablement
- [x] Extractor stage wired — `scripts/design/pipeline/toolkit/extract.ts` enforces permits + approvals and stages context assets; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Tokens + style guide stage — `tokens.ts` + styleguide wrapper emit token bundles + markdown docs with manifest metrics; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Reference & self-correction stage — `reference.ts` + optional `self-correct` loops capture diff reductions + FFmpeg approvals; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Publish integration — toolkit outputs merged into `packages/design-system` with `npm --prefix packages/design-system run test:visual` logged; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.

### Guardrails & Evidence
- [x] Spec guard stage embedded — `design-spec-guard` runs `node scripts/spec-guard.mjs --dry-run` inside the hi-fi diagnostics pipeline before artifact writes; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Manifest/schema updates — `design_toolkit_artifacts` + summary persisted to manifests and `out/0410-hi-fi-design-toolkit/design/runs/<run>.json`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Retention/privacy automation — retention window + purge command (`npm run design:purge-expired`) documented, approvals recorded; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Diagnostics run — `npx codex-orchestrator start hi-fi-design-toolkit --format json`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Reviewer hand-off — `npm run review` cites latest toolkit manifest and approvals; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.

# Task List Snapshot — Frontend Design Pipeline v2 (0412-frontend-design-pipeline-v2)

- **Update — Planning:** Fresh + clone-informed pipeline PRD/spec drafted; awaiting diagnostics run to seed `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- **Update — Schema & snippet:** Manifest support for design plan/guardrail/history/style profiles plus `prompt-snippets/frontend-aesthetics-v1.md` landed; guardrail metrics/style-overlap gate documented for parity tests.
- **Notes:** Modes differ only in aesthetic plan derivation (brief vs brief+Hifi style profile); artifacts will mirror design pipeline layouts with added guardrail/history outputs.

## Checklist Mirror
Mirror status with `tasks/frontend-design-pipeline-v2.md` and `.agent/task/frontend-design-pipeline-v2.md`. Keep `[ ]` until a manifest path such as `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json` is recorded.

### Foundation
- [ ] Collateral synchronized — `docs/design/PRD-frontend-design-pipeline-v2.md`, `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`, `tasks/index.json`, `.agent/task/frontend-design-pipeline-v2.md`, `docs/TASKS.md`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Spec guard coverage — `node scripts/spec-guard.mjs --dry-run` watches `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.

### Pipeline Stages
- [ ] Style ingestion (Hifi) — `hifi_style_profile.json` emitted with approvals + similarity level; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Design brief normalization — `frontend-design-brief.json` staged with required fields + hash; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Aesthetic axes plan — `frontend-aesthetic-plan.json` captures axes + `avoid` lists + snippet version; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Implementation + complexity metadata — `implementation-metadata.json` links plan to framework/density expectations; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Aesthetics guardrail — `design-review-report.json` with originality/accessibility/brief-alignment/slop scores + pass/fail; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Design diversity memory — `frontend-design-history.json` bounded + mirrored to `out/0412-frontend-design-pipeline-v2/design/history.json`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Frontend aesthetics snippet library — `prompt-snippets/frontend-aesthetics-v1.md` versioned and referenced by plans/guardrails; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.

### Artifacts, Guardrails, Validation
- [ ] Artifact layout + writer — artifacts under `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/artifacts/design/**`, summary `out/0412-frontend-design-pipeline-v2/design/runs/<run>.json`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Manifest/schema updates — manifest sections for `design_plan`, `design_guardrail`, `design_history`, style profile metadata with approvals/retention; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Metrics/telemetry — metrics (`aesthetic_axes_completeness`, `originality_score`, `accessibility_score`, `brief_alignment_score`, `slop_risk`, `diversity_penalty`, `similarity_to_reference`, `style_overlap`, `style_overlap_gate`, `snippet_version`) emitted to manifest + `out/**`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Retention/legal logging — retention enforced (style profiles may use shorter window), approvals + `do_not_copy` markers captured; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Mode parity — Fresh vs clone-informed runs show identical stage set; manifests capture mode + reference style id; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Guardrail efficacy — AI-slop mock fails and compliant mock passes with differing `slop_risk`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Style-overlap gate — Clone-informed runs compute `style_overlap` (max of palette/typography/motion/spacing similarities) and fail guardrail when >0.10; manifests + `design-review-report.json` record per-axis scores and `style_overlap_gate`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Diversity penalty check — history reuse increases `diversity_penalty` surfaced in guardrail report; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Reviewer hand-off — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run review` executed with latest manifest cited; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.

# Task List Snapshot — More Nutrition Pixel Archive (0505-more-nutrition-pixel)

- **Update — 2025-11-09:** Hi-fi design toolkit run captured https://more-nutrition.webflow.io and logged manifest `.runs/0505-more-nutrition-pixel/cli/2025-11-09T12-25-49-931Z-decf5ae1/manifest.json` with full stage telemetry (interactions enabled for scroll/slider playback).
- **Update — Archive minted:** Toolkit outputs mirrored into `.runs/0505-more-nutrition-pixel/archive/2025-11-09T12-25-49Z/` (context, tokens, style guide, reference, diffs) for desktop + mobile snapshots. *Note: directory pruned from the working copy on 2025-11-09 to keep the repo lean; rerun hi-fi pipeline to regenerate artifacts if needed.*
- **Notes:** Automated self-correction stopped at a 2.59% residual error rate; findings captured in `docs/findings/more-nutrition.md` to track spacing + slider gaps.

## Checklist Mirror
Mirror status with `tasks/0505-more-nutrition-pixel.md` and `.agent/task/0505-more-nutrition-pixel.md`. Keep `[ ]` until manifest + archive references are recorded.

### Capture & Evidence
- [x] Hi-fi pipeline run — `npx codex-orchestrator start hi-fi-design-toolkit --task 0505-more-nutrition-pixel --format json`; Evidence: `.runs/0505-more-nutrition-pixel/cli/2025-11-09T12-25-49-931Z-decf5ae1/manifest.json`.
- [x] Toolkit summary — `out/0505-more-nutrition-pixel/design/runs/2025-11-09T12-25-49-931Z-decf5ae1.json` logs approvals, breakpoints, token counts, and self-correction deltas.

### Artifacts & Findings
- [x] Archive staged — `.runs/0505-more-nutrition-pixel/archive/2025-11-09T12-25-49Z/` copies `design-toolkit/{context,tokens,styleguide,reference,diffs}` *(local copy removed on 2025-11-09 cleanup; rerun capture to recreate)*.
- [x] Findings doc — `docs/findings/more-nutrition.md` lists residual parity gaps, diff metrics, and next actions referencing the same manifest.

### Documentation Sync
- [x] Mirrors refreshed — `tasks/index.json`, `tasks/0505-more-nutrition-pixel.md`, `.agent/task/0505-more-nutrition-pixel.md`, `docs/PRD.md`, `docs/TECH_SPEC.md`, and `docs/ACTION_PLAN.md` cite the manifest + archive path for Task 0505.

# Task List Snapshot — Codex Orchestrator Autonomy Enhancements (0303)

- **Update — 2025-11-05:** Multi-instance autonomy upgrade validation run recorded; manifest `.runs/autonomy-upgrade/cli/2025-11-05T13-30-00Z-upgrade/manifest.json` captures control-plane enforcement, scheduler fan-out, streaming handles, and privacy guard enforcement.
- **Update — 2025-11-06:** Efficiency optimizations (guard decision pruning, replay window reuse, stdio sliding buffer, `mergeSnapshot` O(1) append) validated; manifest `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`.
- **Update — 2025-11-04:** Unified exec runtime (session manager + event streaming) completed; manifest `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
- **Update — 2025-11-04:** CLI command stages now emit unified exec lifecycle events with streaming logs; manifest `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`.
- **Update — 2025-11-04:** Tool orchestrator layer implemented with manifest evidence `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.
- **Update — 2025-11-04:** Diagnostics run `2025-11-04T01-59-37-568Z-8065982c` captured guardrail execution; manifest at `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
- **Gate Status:** Planning approved — greenlight to begin ToolOrchestrator implementation. Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-46-22-699Z-8be8efb9/manifest.json`.
- **Notes:** Upgrade metrics recorded at `.runs/autonomy-upgrade/metrics.json` with aggregates in `.runs/autonomy-upgrade/metrics/post-rollout.json`, `.runs/autonomy-upgrade/metrics/completeness.json`, and MTTR delta tracked in `out/autonomy-upgrade/metrics/mttr-delta.json`. Legacy diagnostics remain at `.runs/0303-orchestrator-autonomy/metrics.json`; state snapshot refreshed at `out/0303-orchestrator-autonomy/state.json`.

## Checklist Mirror
Mirror status with `tasks/tasks-0303-orchestrator-autonomy.md` and `.agent/task/0303-orchestrator-autonomy.md`. Each `[x]` entry must cite the manifest path that satisfied the acceptance criteria.

### Foundation
- [x] Synchronize collateral — `tasks/index.json`, `docs/PRD-codex-orchestrator-autonomy.md`, `docs/TECH_SPEC-codex-orchestrator-autonomy.md`, `docs/ACTION_PLAN-codex-orchestrator-autonomy.md`, `.agent/task/0303-orchestrator-autonomy.md` reference Task 0303; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json` (diagnostics run 2025-11-03T23:58:59Z).
- [x] Prepare run directories — Initialize `.runs/0303-orchestrator-autonomy/cli/` via diagnostics run; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json`.
- [x] Environment defaults — `MCP_RUNNER_TASK_ID` exported in shell / CI and recorded in diagnostics manifest task id + approval profile; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (manifest records `approval_policy: read/edit/run/network`).

### Tool Orchestrator Layer
- [x] Implement centralized `ToolOrchestrator` service with approval cache reuse and sandbox retry policy; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.
- [x] Persist approval/retry metadata into manifests (`toolRuns[].approvalSource`, `toolRuns[].retryCount`, `toolRuns[].sandboxState`) with unit coverage; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.

### Unified Exec Runtime
- [x] Build `ExecSessionManager` supporting reusable PTY handles, opt-out flows, and environment snapshots; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
- [x] Update unified exec runner to emit `exec:begin|chunk|end` events, stream stdout/stderr under 64 KiB caps, and honor sandbox retries; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.

### CLI & SDK Interfaces
- [x] Ship `codex-orchestrator exec` command with `--json`, `--jsonl`, `--otel-endpoint`, and `--notify` support mirroring Codex CLI; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
- [x] Extend Node.js SDK to spawn the exec command, stream JSONL events, and expose resume/retry helpers; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 

### Telemetry & Notifications
- [x] Implement OTEL exporter module with graceful retry/backoff and manifest metrics; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
- [x] Add notification hooks for summarized run events with configuration precedence (CLI > env > config); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 

### Instruction Hierarchy & Schema
- [x] Deliver hierarchical instruction loader merging `AGENTS.md` → `docs/AGENTS.md` → `.agent/AGENTS.md`, recording hashes in manifest metadata; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
- [x] Update manifest/config schemas for new fields and document JSONL event format; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 

### Efficiency Optimizations
- [x] Prune `handle.decisions` along with the frame buffer to keep guard metadata bounded; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/orchestrator/tests/HandleService.test.ts`.
- [x] Replay subscriptions and snapshots reuse the stored frame window (O(replayed frames) per observer); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/orchestrator/tests/HandleService.test.ts`.
- [x] Replace quadratic stdio concatenation with an O(chunk) sliding window; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/shared/tests/StdioTracker.test.ts`.
- [x] Make `TaskStateStore.mergeSnapshot` O(1) for append-only runs while keeping replacements ordered; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `orchestrator/tests/TaskStateStore.test.ts`.
- [x] Diagnostics + guardrails rerun after efficiency fixes (`npm run test`, `node scripts/spec-guard.mjs --dry-run`); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`.

### Verification & Guardrails
- [x] Run diagnostics (`npx codex-orchestrator start diagnostics --format json`) and record manifest link; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-44-59-137Z-de57c4d7/manifest.json`.
- [x] Guardrails — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (when fixtures ready); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json` (diagnostics run captures guardrail execution summary).
- [x] Reviewer hand-off — Execute `npm run review` using latest manifest; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (review outcome “Skip for now” logged).

---

# Task List Snapshot — Orchestrator Resilience Hardening (0202)

- **Update — 2025-10-31:** Diagnostics run `2025-10-31T22-56-34-431Z-9574035c` succeeded; manifest recorded under `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- **Gate Status:** Resilience enhancements implemented; awaiting reviewer sign-off.
- **Notes:** Metrics appended to `.runs/0202-orchestrator-hardening/metrics.json`; state snapshot refreshed at `out/0202-orchestrator-hardening/state.json`.

## Checklist Mirror
Mirror status with `tasks/tasks-0202-orchestrator-hardening.md` and `.agent/task/0202-orchestrator-hardening.md`. Each `[x]` entry must cite the manifest path that satisfied the acceptance criteria.

- Documentation Sync — `[x]` Collateral references Task 0202 and ties to diagnostics manifest; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Persistence Reliability — `[x]` Lock retry/backoff shipped with passing tests; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Heartbeat Safety — `[x]` Awaited heartbeat queue implemented; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Output Bounding — `[x]` Command buffer and error truncation verified via tests; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Guardrails & Review — `[x]` `spec-guard`, `npm run lint`, `npm run test`, and `npm run review` executed; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.

Update checklist entries with the exact `.runs/0202-orchestrator-hardening/cli/<run-id>/manifest.json` path once runs complete.

# Task List Snapshot — TF-GRPO Integration (0506)

- **Update — 2025-11-21:** `tfgrpo-learning` run succeeded (3 epochs, G=2, rewarders=`gt,relative`, temps 0.7/0.7/0.3) with manifest `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`; prompt-pack stamps recorded and spec-guard passed. Diagnostics-with-eval guardrail run succeeded under `.runs/0506-tfgrpo-integration/cli/2025-11-21T07-09-08-052Z-ac3a1d09/manifest.json` (build/lint/test/eval/spec-guard).
- **Gate Status:** TF-GRPO enablement in planning; implementation gated on Experience Store + prompt pack landing behind `FEATURE_TFGRPO_GROUP`.
- **Guardrails:** Enforce `G ≥ 2`, ≤32-word experiences, three epochs (~100 samples) with train temp 0.7 / eval temp 0.3, stamped instruction sources only, and `node scripts/spec-guard.mjs --dry-run` before review.

## Checklist Mirror
Mirror status with `tasks/tasks-0506-tfgrpo.md` and `.agent/task/0506-tfgrpo-integration.md`. Flip `[ ]` to `[x]` only after attaching the manifest path (e.g., `.runs/0506-tfgrpo-integration/cli/<run-id>/manifest.json`).

### PR-1 Prompt Packs & Loader
- [x] Stamped prompt-pack manifests wired into `packages/orchestrator/src/instructions/loader.ts`; tests: `packages/orchestrator/tests/instructions/PromptPackLoader.test.ts`, `orchestrator/tests/InstructionsLoader.test.ts`. Evidence: prompt_packs stamps in `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.

### PR-2 Metrics (Per-Tool & Per-Epoch)
- [x] Emit per-tool, per-epoch token/cost/latency metrics via exec command → recorder/aggregator/OTEL; tests: `orchestrator/tests/MetricsAggregator.test.ts`, `orchestrator/tests/ExecCommand.test.ts`. Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.

### PR-3 Experience Store & Injection
- [x] Persist ≤32-word stamped experiences and inject them into prompt packs; tests: `orchestrator/tests/ExperienceStore.test.ts`, `orchestrator/tests/PromptExperienceInjection.test.ts`. Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.

### PR-4 Trajectory Summary & Optimizer
- [x] Summarize exec events into trajectory frames, stamp, and re-inject; tests: `orchestrator/tests/ExecCommand.test.ts`, `orchestrator/tests/ExperienceStore.test.ts`. Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.

### PR-5 Rewarders (GT + Relative Rank)
- [x] Evaluation harness exposes deterministic GT + relative ranking rewarders; tests: `evaluation/tests/harness.test.ts` (RewarderExactMatch, RelativeRankingRewarder suites). Evidence: tfgrpo-learning run used `TFGRPO_REWARDERS=gt,relative` (runner log `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/commands/01-tfgrpo-loop.ndjson`).

### PR-6 Learning Schedule
- [x] Three-epoch (~100 sample) schedule with temperature overrides and tfgrpo-learning pipeline wiring; tests: `evaluation/tests/harness.test.ts` (LearningScheduleLoop), `orchestrator/tests/ControlPlaneValidator.test.ts` (PipelineTemperatureConfig). Evidence: runner log shows epochs 1–3 at temps 0.7/0.7/0.3 with 100 samples each; manifest `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.

### PR-7 Config Guardrails
- [x] Request builder enforces `groupSize ≥ 2` and instruction loader filters stamped sources; tests: `orchestrator/tests/ControlPlaneValidator.test.ts`, `packages/orchestrator/tests/instructions/InstructionGuard.test.ts`. Evidence: command recorded `TFGRPO_GROUP_SIZE=2` with stamped instruction sources + prompt pack stamps in manifest `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.

### PR-8 Group Runner (Feature Flagged)
- [x] TaskManager + Scheduler run grouped subtasks when `FEATURE_TFGRPO_GROUP` is set; tests: `orchestrator/tests/TaskManager.test.ts`, `orchestrator/tests/SchedulerPlan.test.ts`. Evidence: grouped vitest run with `FEATURE_TFGRPO_GROUP=1 TFGRPO_GROUP_SIZE=2` (`.runs/0506-tfgrpo-integration/manual/2025-11-21-group-tests.log`).

- **Update — 2025-11-21:** First full tfgrpo-learning loop captured guardrail evidence and prompt-pack stamps under `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`; guardrail suite (build/lint/test/eval/spec-guard) passed under `.runs/0506-tfgrpo-integration/cli/2025-11-21T07-09-08-052Z-ac3a1d09/manifest.json`.

### Verification & Guardrails
- [x] Diagnostics / tfgrpo-learning pipeline run recorded under `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json` (spec-guard passed).
- [x] Guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (when fixtures exist). Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-21T07-09-08-052Z-ac3a1d09/manifest.json`.
- [ ] Reviewer hand-off via `npm run review` referencing the latest TF-GRPO manifest.

# Task List Snapshot — PlusX 15th Anniversary Hi-Fi Clone (0520-15th-plus-hi-fi)

- **Update — 2025-11-14:** Toolkit re-run captured https://15th.plus-ex.com with runtime canvas/font propagation, ScrollSmoother loader macro, and manifest `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/manifest.json`.
- **Update — Archive refreshed:** `.runs/.../artifacts` copied into `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/15th-plus/2025-11-14T11-11-13-442Z-6897b063/` before pruning the run directory; README + loader script live in `reference/plus-ex-15th/`.
- **Notes:** Compliance permit `plus-ex-15th-2025-11-14` allows live asset mirroring+ScrollSmoother unlock for localhost validation only.

## Checklist Mirror
Mirror status with `tasks/0520-15th-plus-hi-fi.md` and `.agent/task/0520-15th-plus-hi-fi.md`. Cite the manifest + archive when flipping statuses.

### Capture & Runtime Propagation
- [x] Hi-fi toolkit run — `npx codex-orchestrator start hi-fi-design-toolkit --task 0520-15th-plus-hi-fi --format json`; Evidence: `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/manifest.json`.
- [x] Runtime metadata — `design/state.json` shows `runtimeCanvasColors`, `resolvedFonts`, `interactionScriptPath`, `interactionWaitMs` for plus-ex-15th; Evidence: `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/design/state.json`.

### Archive & Reference
- [x] Artifacts mirrored — `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/archives/hi-fi-tests/15th-plus/2025-11-14T11-11-13-442Z-6897b063/` retains `design-toolkit/{context,tokens,styleguide,reference,diffs,motion}`; `.runs/.../artifacts` pruned for hygiene.
- [x] Reference README + loader — `reference/plus-ex-15th/README.md` documents serve command + archive pointer, `scripts/loader-scroll-macro.js` ships DOM-ready ScrollSmoother unlock.

### Validation & Doc Mirrors
- [x] Local validation — `npx serve ... -l 4173` + Playwright probe logged `{\"unlocked\":\"true\",\"sectionCount\":40}`; grep confirms no `/assets/assets/**` references.
- [x] Mirrors updated — `tasks/index.json`, `tasks/0520-15th-plus-hi-fi.md`, `.agent/task/0520-15th-plus-hi-fi.md`, `docs/design/notes/2025-11-13-15th-plus.md`, and `docs/TASKS.md` cite manifest + archive.
