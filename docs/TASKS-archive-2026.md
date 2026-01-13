# Task Archive — 2026

- Generated: 2026-01-13T03:34:01.281Z
- Source: docs/TASKS.md on main
- Policy: manual-trim (target 225 lines)
# Task List Snapshot — Codex Orchestrator Slimdown (0707)
- **Update — Planning:** PRD + tech spec published; CI/local test coverage policy recorded (core vs full-matrix lanes). Awaiting first diagnostics manifest under `.runs/0707-orchestrator-slimdown/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0707-orchestrator-slimdown` for orchestrator commands so manifests, metrics, and `out/**` land in the correct directories.
## Checklist Mirror
Mirror status with `tasks/tasks-0707-orchestrator-slimdown.md` and `.agent/task/0707-orchestrator-slimdown.md`. Keep `[ ]` until a manifest path such as `.runs/0707-orchestrator-slimdown/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` is recorded.
### Foundation
- [x] Diagnostics manifest captured — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-01T09-37-11-576Z-1a60ebea/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0707-orchestrator-slimdown/metrics.json`, `out/0707-orchestrator-slimdown/state.json`.
- [x] CI/test coverage policy mirrored across PRD/spec/tasks — core PR lane runs `npm run build`, `npm run lint`, `npm run test`; full-matrix PR lane (label `full-matrix` or adapters/evaluation/design/patterns paths) runs `npm run build:all`, `npm run lint`, `npm run test`, `npm run test:adapters`, `npm run test:evaluation`, `npm run eval:test` when fixtures/optional design deps installed; release/RC always full matrix; local baseline = core with full matrix locally when touching adapters/evaluation/design/patterns or release prep after `npm run setup:design-tools && npx playwright install` + fixtures (note if skipped). Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
### Deliverables
- [x] Manifest single-source + generated TS types/AJV validator; duplicate schema removed — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Unused agent SDK deps removed with usages pruned/shimmed — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Core build split (`npm run build` core, `npm run build:all` full matrix) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Design deps optional/lazy across toolkits + mirror scripts with runtime guidance — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Patterns lint guard builds `dist/patterns/linters/index.js` only when missing/outdated — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Exec command modularized without behavior change — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Scoped test scripts added (`test:orchestrator`, `test:adapters`, `test:evaluation`; default `npm test` = core) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Characterization tests for execution-mode resolution (flags, metadata modes, parallel override) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Execution-mode logic unified behind a shared helper with no behavior changes — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Task/run ID sanitization unified behind a shared helper with identical error messages — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Shared lock retry helper extracted for TaskStateStore and ExperienceStore — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Atomic write behavior verified (directory creation, temp naming) before unification — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Atomic write helpers unified with explicit options after verification (Needs Verification) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] CLI pipeline result wrappers simplified with explicit result storage — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Enforcement-mode parsing shared between control-plane and privacy guard — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Error string expectations verified before centralizing error formatting — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Error message formatting centralized without changing prefixes or strings (Needs Verification) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.

# Task List Snapshot — Hi-Fi Design Toolkit (0410-hi-fi-design-toolkit)
- **Update — Pending kickoff:** PRD, spec, and task mirrors drafted; awaiting diagnostics run to capture `.runs/0410-hi-fi-design-toolkit/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- **Update — External toolkit:** Autonomous hi-fi design starter will be synchronized into this repo with compliance permits before extractor work begins.
- **Notes:** Always export `MCP_RUNNER_TASK_ID=0410-hi-fi-design-toolkit` so manifests, metrics, and out files land under the correct directories.

## Checklist Mirror
Mirror status with `tasks/hi-fi-design-toolkit.md` and `.agent/task/hi-fi-design-toolkit.md`. Keep `[ ]` until a manifest path such as `.runs/0410-hi-fi-design-toolkit/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` is recorded.

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

- **Update — Planning:** Fresh + clone-informed pipeline PRD/spec drafted; awaiting diagnostics run to seed `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- **Update — Schema & snippet:** Manifest support for design plan/guardrail/history/style profiles plus `prompt-snippets/frontend-aesthetics-v1.md` landed; guardrail metrics/style-overlap gate documented for parity tests.
- **Notes:** Modes differ only in aesthetic plan derivation (brief vs brief+Hifi style profile); artifacts will mirror design pipeline layouts with added guardrail/history outputs.

## Checklist Mirror
Mirror status with `tasks/frontend-design-pipeline-v2.md` and `.agent/task/frontend-design-pipeline-v2.md`. Keep `[ ]` until a manifest path such as `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` is recorded.

### Foundation
- [ ] Collateral synchronized — `docs/design/PRD-frontend-design-pipeline-v2.md`, `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`, `tasks/index.json`, `.agent/task/frontend-design-pipeline-v2.md`, `docs/TASKS.md`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Spec guard coverage — `node scripts/spec-guard.mjs --dry-run` watches `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.

### Pipeline Stages
- [ ] Style ingestion (Hifi) — `hifi_style_profile.json` emitted with approvals + similarity level; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Design brief normalization — `frontend-design-brief.json` staged with required fields + hash; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Aesthetic axes plan — `frontend-aesthetic-plan.json` captures axes + `avoid` lists + snippet version; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Implementation + complexity metadata — `implementation-metadata.json` links plan to framework/density expectations; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Aesthetics guardrail — `design-review-report.json` with originality/accessibility/brief-alignment/slop scores + pass/fail; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Design diversity memory — `frontend-design-history.json` bounded + mirrored to `out/0412-frontend-design-pipeline-v2/design/history.json`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Frontend aesthetics snippet library — `prompt-snippets/frontend-aesthetics-v1.md` versioned and referenced by plans/guardrails; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.

### Artifacts, Guardrails, Validation
- [ ] Artifact layout + writer — artifacts under `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/artifacts/design/**`, summary `out/0412-frontend-design-pipeline-v2/design/runs/<run>.json`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Manifest/schema updates — manifest sections for `design_plan`, `design_guardrail`, `design_history`, style profile metadata with approvals/retention; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Metrics/telemetry — metrics (`aesthetic_axes_completeness`, `originality_score`, `accessibility_score`, `brief_alignment_score`, `slop_risk`, `diversity_penalty`, `similarity_to_reference`, `style_overlap`, `style_overlap_gate`, `snippet_version`) emitted to manifest + `out/**`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Retention/legal logging — retention enforced (style profiles may use shorter window), approvals + `do_not_copy` markers captured; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Mode parity — Fresh vs clone-informed runs show identical stage set; manifests capture mode + reference style id; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Guardrail efficacy — AI-slop mock fails and compliant mock passes with differing `slop_risk`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Style-overlap gate — Clone-informed runs compute `style_overlap` (max of palette/typography/motion/spacing similarities) and fail guardrail when >0.10; manifests + `design-review-report.json` record per-axis scores and `style_overlap_gate`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Diversity penalty check — history reuse increases `diversity_penalty` surfaced in guardrail report; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Reviewer hand-off — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run review` executed with latest manifest cited; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.

