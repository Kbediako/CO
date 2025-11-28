# PRD — CO Frontend Design Pipeline v2 (Task 0412-frontend-design-pipeline-v2)

## Summary
- Problem Statement: Our current design flows either clone sites verbatim or start from scratch without consistent aesthetic guardrails. We lack a unified pipeline that can (a) synthesize new, distinctive frontends from briefs and (b) ingest reference sites via the Hifi toolkit to reuse their aesthetic language without copying code, branding, or logos.
- Desired Outcome: Deliver a “Frontend Design Pipeline v2” with two modes—Fresh Designs and Clone-Informed Designs—that share a common backbone: style ingestion → brief normalization → aesthetic axes planning → implementation + complexity matching → aesthetics guardrail (“AI-slop lint”) → design diversity memory → snippet library. Every run produces reusable artifacts (style profiles, normalized briefs, aesthetic plans, guardrail reports, design history) and manifests that log evidence and approvals.

## Goals
- Provide dual pipeline modes:
  - **Fresh Designs:** derive the aesthetic plan directly from a normalized brief plus the frontend aesthetics snippet.
  - **Clone-Informed Designs:** invoke Hifi as a style ingestion stage to emit a `hifi_style_profile.json` that informs the aesthetic plan without copying source code/branding.
- Normalize briefs into a reusable `frontend-design-brief.json` capturing purpose, audience, tone, constraints (incl. accessibility), and one strong differentiator; include optional `reference_style_id` pointing to the ingested Hifi style profile.
- Plan aesthetics along explicit axes—typography, color/theme (CSS vars), motion, spatial composition, backgrounds/visual details—outputting `frontend-aesthetic-plan.json` with rationale and “avoid AI slop” constraints.
- Add an “implementation_and_complexity_match” concept stage that binds the plan to UI generation and records complexity metadata in `implementation-metadata.json` (even if code generation is out of scope for this PRD).
- Ship an “aesthetics_guardrail” stage (AI-slop lint) that scores originality, accessibility, brief alignment, and negative constraints; output `design-review-report.json` with pass/fail and deltas.
- Introduce “design_diversity_memory” to track prior runs in `frontend-design-history.json` (per project/task) to avoid visual convergence.
- Publish a reusable `frontend_aesthetics_snippet_library` (versioned prompt snippet + metadata) so other pipelines/skills can depend on the same aesthetic guidelines.
- Log manifests/metrics for all stages under `.runs/0412-frontend-design-pipeline-v2/**` and summaries under `out/0412-frontend-design-pipeline-v2/**`, aligned with existing design pipelines.

## Non-Goals
- Implementing runtime UI generation or wiring new stages into orchestrator code in this iteration; scope is documentation and schemas only.
- Shipping new visual diff infrastructure or FFmpeg/Playwright changes beyond referencing Hifi outputs as inputs.
- Duplicating brand assets, wordmarks, logos, or unique shapes from references; clone-informed mode is “inspired by” aesthetics only.
- Replacing existing design-reference or hi-fi toolkit pipelines; this pipeline builds on them for style ingestion but does not supersede their capture mechanics.

## Modes & Key Scenarios
- Personas: design platform engineers, front-end feature teams, and reviewers.
- Scenarios:
  - **Fresh dashboard from brief:** Ingest a design brief, normalize it, derive an aesthetic plan from the brief + snippet library, run guardrails, and record history to keep the dashboard distinct from prior runs.
  - **Clone-informed restyle of internal tool:** Use Hifi to ingest a target URL, emit `hifi_style_profile.json`, merge it with the normalized brief, and generate an aesthetic plan that borrows typography, spacing, and motion cues without copying brand assets.
  - **Design review with guardrails:** Run the aesthetics guardrail on a generated mock to catch AI slop (generic fonts, default purple gradients, unintentional convergence) and log pass/fail in `design-review-report.json`.
  - **Diversity enforcement:** When a team runs multiple iterations for the same product, consult `frontend-design-history.json` to penalize convergence and prompt differentiators.

## Pipeline Backbone (Shared by Both Modes)
1. **style_ingestion (Hifi)** — optional in Fresh mode; required in Clone-Informed mode. Produces `hifi_style_profile.json` summarizing typography, palette, motion cues, spacing scale, component silhouettes, and “do-not-copy” markers for branding assets.
2. **design_brief_normalization** — produces `frontend-design-brief.json` with fields `{ purpose, audience, tone, accessibility_constraints, technical_constraints, differentiation, reference_style_id? }`.
3. **aesthetic_axes_plan** — produces `frontend-aesthetic-plan.json` with axes `{ typography, color_theme (CSS vars), motion, spatial_composition, background_details }`, each with rationale, constraints, and “avoid AI slop” checks.
4. **implementation_and_complexity_match (concept)** — binds the aesthetic plan to future UI generation, emitting `implementation-metadata.json` (complexity level, component density, interactivity expectations, target frameworks) for parity with codegen.
5. **aesthetics_guardrail / AI-slop lint** — produces `design-review-report.json` with scores (originality, accessibility, adherence to brief, negative constraints) and pass/fail gates.
6. **design_diversity_memory** — maintains `frontend-design-history.json` per task/project to avoid aesthetic convergence; stores prior differentiators and banned tropes.
7. **frontend_aesthetics_snippet_library** — versioned prompt snippet + metadata to keep typography/color/motion/background guidance consistent across pipelines.

## Legal & Ethical Constraints
- Hifi-derived assets may inform typography, spacing, motion timing, and color harmonies but must not copy logos, wordmarks, proprietary illustrations, or unique shapes; reference styles are “inspiration only.”
- Record any approvals for site capture within manifests; enforce retention policies inherited from design pipelines to purge raw captures while keeping derived style profiles.
- Accessibility constraints (color contrast, motion-reduction fallbacks) are mandatory for both modes and must be documented in the brief and guardrail outputs.

## Documentation & Evidence
- Run Manifest Link: `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json` (attach once diagnostics/spec-guard run exists).
- Metrics / State Snapshots: `.runs/0412-frontend-design-pipeline-v2/metrics.json`, `out/0412-frontend-design-pipeline-v2/state.json` (initialized in first pipeline run).

## Stakeholders
- Product/Design Platform: TBD
- Engineering (Design Systems & Orchestrator): TBD
- Compliance/Privacy: TBD (approvals required for Hifi captures and style profile retention)
- Accessibility Review: TBD

## Metrics & Guardrails
- Success Metrics: ≥90% of runs emit valid `frontend-aesthetic-plan.json`; ≥95% of guardrail runs flag AI-slop violations (generic fonts/gradients) when seeded with intentionally bland inputs; clone-informed runs show <10% style overlap with prior project history per `frontend-design-history.json` heuristics.
- Guardrails: Spec guard freshness (`node scripts/spec-guard.mjs --dry-run`); manifests capture approvals for Hifi ingestion; guardrail reports must pass contrast/accessibility checks; legal constraints enforced via “do-not-copy” markers in style profiles.

## Technical Considerations
- Modes differ only in how the aesthetic plan is derived: Fresh uses normalized brief + snippet library; Clone-Informed augments the brief with `hifi_style_profile.json`.
- Artifacts live under `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/artifacts/design/**` with summaries mirrored to `out/0412-frontend-design-pipeline-v2/design/runs/<run>.json`.
- Snippet library should be versioned (e.g., `frontend-aesthetics-snippets/<version>.md`) so other skills can pin to a stable guideline.
- Diversity memory requires bounded history (e.g., last N runs) to avoid bloating manifests while still enforcing differentiation.

## Open Questions
- What similarity thresholds should we enforce between clone-informed plans and their references (e.g., cosine similarity across palette/typography embeddings)?
- Should the guardrail block runs when differentiation is weak, or only warn and require reviewer approval?
- How long should `hifi_style_profile.json` be retained relative to raw captures—same retention as design-reference pipeline (30 days) or shorter?

## Approvals
- Product/Design: _(pending — attach approver + `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json` once review completes)_
- Engineering: _(pending — attach approver + `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json` once review completes)_
- Compliance/Privacy: _(pending — attach approver + `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json` once review completes)_
