# Task List — Frontend Design Pipeline v2 (0412-frontend-design-pipeline-v2)

## Context
- Link to PRD: `docs/design/PRD-frontend-design-pipeline-v2.md`
- Link to Spec: `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`
- Summary: Define a dual-mode frontend design pipeline (Fresh vs Clone-Informed) that ingests Hifi style profiles, normalizes briefs, plans aesthetics across explicit axes, runs an AI-slop guardrail, maintains design diversity history, and publishes a reusable frontend aesthetics snippet library.

### Checklist Convention
- Keep `[ ]` until acceptance criteria is met. Flip to `[x]` only after attaching the manifest path from `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json` that proves completion.
- Mirror this checklist with `tasks/frontend-design-pipeline-v2.md` and `docs/TASKS.md`.

## Foundation
1. **Collateral synchronized**
   - Files: `docs/design/PRD-frontend-design-pipeline-v2.md`, `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`, `tasks/index.json`, `docs/TASKS.md`, `.agent/task/frontend-design-pipeline-v2.md`.
   - Acceptance: Task 0412 references aligned and diagnostics manifest recorded.
   - [ ] Status: `Pending`
2. **Spec guard coverage**
   - Commands: `node scripts/spec-guard.mjs --dry-run`.
   - Acceptance: Spec guard monitors `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`.
   - [ ] Status: `Pending`

## Pipeline Stages
1. **Style ingestion (Hifi)**
   - Files: `hifi_style_profile.json` under `artifacts/design/style-ingestion/`.
   - Acceptance: Profile captures typography/palette/motion/spatial/background + `do_not_copy`; approvals logged.
   - [ ] Status: `Pending`
2. **Design brief normalization**
   - Files: `frontend-design-brief.json`.
   - Acceptance: Required fields populated; hash stored in manifest.
   - [ ] Status: `Pending`
3. **Aesthetic axes plan**
   - Files: `frontend-aesthetic-plan.json`.
   - Acceptance: Axes + `avoid` lists + snippet version recorded.
   - [ ] Status: `Pending`
4. **Implementation + complexity metadata**
   - Files: `implementation-metadata.json`.
   - Acceptance: Captures density/interaction/framework targets; no code emitted.
   - [ ] Status: `Pending`
5. **Aesthetics guardrail (AI-slop lint)**
   - Files: `design-review-report.json`.
   - Acceptance: Originality/accessibility/brief-alignment/slop scores with pass/fail.
   - [ ] Status: `Pending`
6. **Design diversity memory**
   - Files: `frontend-design-history.json` + `out/0412-frontend-design-pipeline-v2/design/history.json`.
   - Acceptance: Bounded history prevents convergence; penalties surface in guardrail.
   - [ ] Status: `Pending`
7. **Frontend aesthetics snippet library**
   - Files: `prompt-snippets/frontend-aesthetics-v1.md`.
   - Acceptance: Versioned snippet published and referenced by plans/guardrails.
   - [ ] Status: `Pending`

## Artifacts, Manifest, Telemetry
1. **Artifact layout + writer**
   - Files: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/artifacts/design/**`, `out/0412-frontend-design-pipeline-v2/design/runs/<run>.json`.
   - Acceptance: Summary writer emits stage paths + retention/approvals.
   - [ ] Status: `Pending`
2. **Manifest/schema updates**
   - Files: manifest types/writer updates for `design_plan`, `design_guardrail`, `design_history`, and Hifi style profile metadata.
   - Acceptance: Tests cover schema bounds and backward compatibility.
   - [ ] Status: `Pending`
3. **Metrics/telemetry**
   - Metrics: `aesthetic_axes_completeness`, `originality_score`, `accessibility_score`, `brief_alignment_score`, `slop_risk`, `diversity_penalty`, `similarity_to_reference`, `style_overlap`, `style_overlap_gate`, `snippet_version`.
   - Acceptance: Captured in manifest + `out/**`.
   - [ ] Status: `Pending`
4. **Retention/legal logging**
   - Acceptance: Retention windows enforced; approvals + `do_not_copy` markers recorded.
   - [ ] Status: `Pending`

## Validation & Guardrails
1. **Fresh vs clone-informed parity**
   - Acceptance: Both modes run identical stages; manifests show mode + reference style id.
   - [ ] Status: `Pending`
2. **Style-overlap gate**
   - Acceptance: Clone-informed runs compute `style_overlap` (palette/typography/motion/spacing max similarity) and fail guardrail when >0.10; manifests and `design-review-report.json` include per-axis scores and `style_overlap_gate`.
   - [ ] Status: `Pending`
3. **Guardrail efficacy**
   - Acceptance: AI-slop mock fails with elevated `slop_risk`; compliant mock passes.
   - [ ] Status: `Pending`
4. **Diversity penalty check**
   - Acceptance: Reused palettes trigger `diversity_penalty` surfaced in guardrail report.
   - [ ] Status: `Pending`
5. **Review hand-off**
   - Commands: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run review`.
   - Acceptance: Latest manifest referenced across mirrors.
   - [ ] Status: `Pending`
