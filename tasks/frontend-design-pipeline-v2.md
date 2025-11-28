# Task Checklist — Frontend Design Pipeline v2 (0412-frontend-design-pipeline-v2)

> Export `MCP_RUNNER_TASK_ID=0412-frontend-design-pipeline-v2` before running diagnostics or guardrail commands. Mirror checklist status across `/tasks`, `docs/TASKS.md`, and `.agent/task/frontend-design-pipeline-v2.md`. Keep entries at `[ ]` until a manifest path (e.g., `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`) proving completion is attached.

## Foundation
- [ ] Collateral synchronized — `docs/design/PRD-frontend-design-pipeline-v2.md`, `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`, `tasks/index.json`, `.agent/task/frontend-design-pipeline-v2.md`, `docs/TASKS.md` reference Task 0412 with a recorded diagnostics manifest.
- [ ] Spec guard coverage — `node scripts/spec-guard.mjs --dry-run` updated to include `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.

## Pipeline Stages
- [ ] Style ingestion (Hifi) — Wire Hifi toolkit as a style ingestion stage that outputs `hifi_style_profile.json` (typography, palette, motion, spatial composition, background details, do_not_copy) under `artifacts/design/style-ingestion/`; record approvals + similarity level; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Design brief normalization — Stage `frontend-design-brief.json` with required fields `{ purpose, audience, tone, accessibility_constraints, technical_constraints, differentiation, reference_style_id? }` under `artifacts/design/brief/`; hash logged in manifest; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Aesthetic axes plan — Emit `frontend-aesthetic-plan.json` using axes `{ typography, color_theme, motion, spatial_composition, background_details }` plus `avoid` lists and snippet version; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Implementation + complexity metadata — Produce `implementation-metadata.json` (concept stage) linking plan to target frameworks/component density without generating code; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Aesthetics guardrail (“AI-slop lint”) — Generate `design-review-report.json` with originality/accessibility/brief-alignment/slop scores, pass/fail status, and recommendations; strictness/slop thresholds configurable; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Design diversity memory — Maintain bounded `frontend-design-history.json` per project/task with differentiators and penalties, mirrored to `out/0412-frontend-design-pipeline-v2/design/history.json`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Frontend aesthetics snippet library — Create versioned snippet file (`prompt-snippets/frontend-aesthetics-v1.md`) capturing axes guidance and “avoid AI slop” rules; reference snippetVersion in plans and guardrail reports; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.

## Artifacts, Manifest, Telemetry
- [ ] Artifact layout + writer — Stage all artifacts under `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/artifacts/design/**` and add summary writer output `out/0412-frontend-design-pipeline-v2/design/runs/<run>.json`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Manifest/schema updates — Add manifest sections for `design_plan`, `design_guardrail`, `design_history`, and Hifi style profile metadata with approvals/retention; update schemas/tests accordingly; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Metrics/telemetry — Emit metrics (`aesthetic_axes_completeness`, `originality_score`, `accessibility_score`, `brief_alignment_score`, `slop_risk`, `diversity_penalty`, `similarity_to_reference`, `style_overlap`, `style_overlap_gate`, `snippet_version`) into manifest and `out/**`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Retention/legal logging — Enforce retention windows (default 30 days, optional shorter for style profiles), record `do_not_copy` markers, and log approvals for Hifi ingestion/mock captures; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.

## Validation & Guardrails
- [ ] Style-overlap gate — Define and implement the <10% style-overlap heuristic (palette/typography/motion/spacing max similarity) for clone-informed runs; manifests + `design-review-report.json` include `style_overlap`, per-axis scores, and `style_overlap_gate` with failures blocking the guardrail; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Fresh vs clone-informed parity — Demonstrate both modes produce identical stage set with differing inputs; manifests capture mode + reference style id; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Guardrail efficacy — Test guardrail against intentionally bland “AI slop” mock (generic fonts/purple gradient) and against a compliant mock; slop risk differs and pass/fail recorded; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Diversity penalty check — With populated history, verify repeated palettes increase `diversity_penalty` and surface in guardrail report; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- [ ] Review hand-off — Run guardrails (`node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run review`) and cite latest manifest; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.

_Flip each `[ ]` to `[x]` only after attaching the exact `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json` path satisfying the acceptance criteria._
