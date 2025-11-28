---
last_review: 2025-11-27
---

# Technical Spec — CO Frontend Design Pipeline v2 (Task 0412-frontend-design-pipeline-v2)

## Overview
- Objective: Define the dual-mode “Frontend Design Pipeline v2” that supports Fresh Designs and Clone-Informed Designs on a shared backbone: style ingestion (Hifi) → brief normalization → aesthetic axes planning → implementation/complexity binding (concept) → aesthetics guardrail (“AI-slop lint”) → design diversity memory → versioned snippet library.
- Scope: Stage purposes, inputs/outputs, artifact paths, manifest interactions, schema sketches, configuration knobs, telemetry/metrics, snippet storage/versioning, retention/legal constraints.
- Out of Scope: Shipping runtime UI/code generation or wiring stages into orchestrator pipelines; this spec documents design + schema only.

## Requirements Mapping
| PRD Goal | Spec Section |
| --- | --- |
| Dual modes (Fresh vs Clone-Informed) on shared backbone | 3.1, 3.2 |
| Hifi style ingestion → `hifi_style_profile.json` | 3.1 |
| Brief normalization → `frontend-design-brief.json` | 3.2 |
| Aesthetic axes plan → `frontend-aesthetic-plan.json` | 3.3 |
| Implementation/complexity metadata (concept) → `implementation-metadata.json` | 3.4 |
| Aesthetics guardrail (“AI-slop lint”) → `design-review-report.json` | 3.5 |
| Design diversity memory → `frontend-design-history.json` | 3.6 |
| Frontend aesthetics snippet library (versioned) | 4.1 |
| Manifest/out placement + metrics | 4.2, 5 |
| Legal/ethical constraints + retention | 4.3 |

## Architecture & Stage Design

### 3.1 Stage: style_ingestion (Hifi)
- Purpose: Treat Hifi (site cloning toolkit) as a **style ingestion** stage that converts captured DOM/CSS/screens into a derived aesthetic summary without reusing source code or branding.
- Inputs:
  - Required for Clone-Informed mode: target URL(s), approvals, Hifi run manifest path, optional similarity level (`low|medium|high` inspiration).
  - Optional for Fresh mode: empty or skipped.
- Outputs:
  - `hifi_style_profile.json` staged under `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/artifacts/design/style-ingestion/`.
  - Shape (JSON sketch):
    ```json
    {
      "id": "style-profile-<timestamp>",
      "source_url": "https://example.com",
      "ingestion_run": "<hifi-manifest-path>",
      "typography": { "families": [], "weights": [], "pairing_rules": [] },
      "color_theme": { "palette": [], "css_vars": {}, "contrast_notes": [] },
      "motion": { "timings": [], "easing": [], "interaction_patterns": [] },
      "spatial_composition": { "grid": {}, "spacing_scale": [], "layout_rules": [] },
      "background_details": { "textures": [], "gradients": [], "shapes": [] },
      "do_not_copy": { "logos": [], "wordmarks": [], "unique_shapes": [] },
      "similarity_level": "medium"
    }
    ```
- Additional metadata: `do_not_copy` is always populated (logos/wordmarks/unique shapes) and `similarity_level` (`low|medium|high`) is recorded for telemetry; manifests store a `design_style_profile` entry with approvals and retention (default 30 days, override `style_profile_days` allowed).
- Invariants: No raw brand assets stored; `do_not_copy` lists anything proprietary. Reference retention inherits Hifi/Design pipeline defaults (30 days) unless shorter window specified.
- Manifest hooks: Manifest metadata should link the profile path and approvals (same structure used in design pipelines).

### 3.2 Stage: design_brief_normalization
- Purpose: Normalize user-provided briefs into a structured, reusable format.
- Inputs: Free-form brief text, optional reference_style_id from style ingestion, explicit constraints (accessibility, technical, differentiation).
- Outputs: `frontend-design-brief.json` staged under `artifacts/design/brief/`.
- Schema sketch:
  ```json
  {
    "id": "brief-<timestamp>",
    "purpose": "dashboard for ops",
    "audience": "internal support agents",
    "tone": "confident, clear, minimal motion",
    "accessibility_constraints": { "contrast": "AA", "motion_reduction": true, "keyboard_first": true },
    "technical_constraints": { "framework": "Next.js", "design_tokens": "packages/design-system" },
    "differentiation": "bold data glyphs, angled panel edges",
    "reference_style_id": "style-profile-<timestamp>"
  }
  ```
- Invariants: Accessibility + differentiation required; reference_style_id optional (Fresh mode omits it). Include a deterministic `hash` and `id` for cross-run reconciliation.
- Manifest: Record resolved brief hash and path in manifest `design_plan.brief`.

### 3.3 Stage: aesthetic_axes_plan
- Purpose: Plan the frontend aesthetic along explicit axes and embed negative constraints (“avoid AI slop”).
- Inputs: Normalized brief + (optional) `hifi_style_profile.json` + frontend aesthetics snippet version id.
- Outputs: `frontend-aesthetic-plan.json` staged under `artifacts/design/aesthetic-plan/`.
- Schema sketch:
  ```json
  {
    "id": "aesthetic-plan-<timestamp>",
    "snippet_version": "v1",
    "axes": {
      "typography": { "choice": "...", "rationale": "...", "avoid": ["default system font"] },
      "color_theme": { "css_vars": { "--bg": "#0b1c2c" }, "palette": [], "avoid": ["default purple gradient"] },
      "motion": { "timings": "...", "reductions": "...", "avoid": ["jittery hover spam"] },
      "spatial_composition": { "grid": "...", "density": "...", "avoid": ["edge-to-edge content with no gutters"] },
      "background_details": { "treatment": "...", "avoid": ["flat white on purple"] }
    },
    "differentiators": ["one bold differentiator"],
    "constraints": { "accessibility": "AA", "legal": ["no logos"], "tech": ["tokens source packages/design-system"] }
  }
  ```
- Snippet source: `snippet_version` references `prompt-snippets/frontend-aesthetics-v1.md` and includes explicit “avoid AI slop” bullets per axis.
- Invariants: Every axis includes a positive plan + `avoid` list. Fresh vs Clone-Informed differs only by presence of Hifi-derived cues in rationale.
- Manifest: Persist plan path + snippet version; metrics include `aesthetic_axes_completeness` (percentage of populated axes).

### 3.4 Stage: implementation_and_complexity_match (concept)
- Purpose: Bind the aesthetic plan to downstream UI generation without implementing code now.
- Inputs: `frontend-aesthetic-plan.json`, platform constraints (framework, density target).
- Outputs: `implementation-metadata.json` under `artifacts/design/implementation/`.
- Schema sketch:
  ```json
  {
    "complexity": "medium",
    "component_density": "5-7 per viewport",
    "interaction_level": "inline filters, live charts",
    "framework_targets": ["Next.js", "Vite"],
    "token_source": "packages/design-system",
    "telemetry_hooks": ["aesthetics_guardrail", "diversity_check"]
  }
  ```
- Invariants: Describes expectations only; no code emission. Manifest records presence for parity testing later.

### 3.5 Stage: aesthetics_guardrail (“AI-slop lint”)
- Purpose: Score generated designs against aesthetic rules and negative constraints.
- Inputs: Rendered mock or code snapshot + `frontend-aesthetic-plan.json` + snippet version.
- Outputs: `design-review-report.json` under `artifacts/design/guardrail/` with shape:
  ```json
  {
    "scores": { "originality": 0.82, "accessibility": 0.9, "brief_alignment": 0.88, "slop_risk": 0.1 },
    "checks": {
      "typography": { "pass": true, "notes": [] },
      "color_theme": { "pass": true, "contrast": "AA" },
      "motion": { "pass": false, "notes": ["prefers-reduced-motion ignored"] }
    },
    "recommendations": ["swap hover scale for opacity fade"],
    "style_overlap": {
      "palette": 0.08,
      "typography": 0.12,
      "motion": 0.04,
      "spacing": 0.06,
      "overall": 0.12,
      "threshold": 0.1,
      "gate": "fail",
      "comparison_window": ["<history-run-id>"]
    },
    "snippet_version": "v1",
    "status": "pass" // or "fail"
  }
  ```
- Invariants: Must include contrast/accessibility notes; flags over-reliance on generic fonts/colors; pass/fail logged to manifest `design_guardrail`.
- Config knobs: `guardrail.strictness` (low/medium/high), `slop_threshold` (0–1).
- Style-overlap gate: compute per-axis similarities plus `style_overlap` (max across axes) and `style_overlap_gate` (`pass|fail`); clone-informed runs fail when `style_overlap > 0.10`, fresh runs log the score without blocking.

### 3.6 Stage: design_diversity_memory
- Purpose: Prevent visual convergence across runs for the same task/project.
- Inputs: Current plan + prior history file.
- Outputs: `frontend-design-history.json` under `artifacts/design/history/` and mirrored summary to `out/0412-frontend-design-pipeline-v2/design/history.json`.
- Schema sketch:
  ```json
  {
    "project": "0412-frontend-design-pipeline-v2",
    "runs": [
      { "run_id": "<run>", "brief_id": "<brief>", "plan_id": "<plan>", "differentiators": [], "penalties": ["overused purple gradient"], "timestamp": "..." }
    ],
    "bounds": { "max_entries": 20 }
  }
  ```
- Invariants: Bounded length (e.g., 20 entries) with eviction strategy (drop oldest). Guardrail uses this to adjust originality scores and compute `diversity_penalty`; mirror to `out/**/design/history.json` so the summary survives raw artifact expiry.

## Assets, Locations, and Versioning

### 4.1 Frontend Aesthetics Snippet Library
- Location proposal: `prompt-snippets/frontend-aesthetics-v1.md` (new top-level folder justified to host reusable, versioned prompt snippets distinct from stamped prompt packs). Each snippet includes `snippetVersion`, axes guidance, “avoid AI slop” rules, and accessibility defaults.
- Content: Explicit do/do-not lists for typography, color/theme, motion, spatial composition, and background details; clone-informed guidance to reuse rhythm/palette without copying logos/wordmarks; defaults to AA contrast and motion-reduction fallbacks.
- Versioning: Semantic versions (`v1`, `v1.1`, etc.) referenced inside `frontend-aesthetic-plan.json` and `design-review-report.json`.
- Dependencies: Other skills/pipelines can import by version to maintain consistency.

### 4.2 Artifact & Manifest Placement
- `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/artifacts/design/`:
  - `style-ingestion/hifi_style_profile.json`
  - `brief/frontend-design-brief.json`
  - `aesthetic-plan/frontend-aesthetic-plan.json`
  - `implementation/implementation-metadata.json`
  - `guardrail/design-review-report.json`
  - `history/frontend-design-history.json`
- `out/0412-frontend-design-pipeline-v2/design/runs/<run>.json`: summary writer aggregates stage paths, scores, approvals, and retention notes.
- Manifest integration:
  - `design_plan`: `{ mode, brief: { path, hash, id }, aesthetic_plan: { path, snippet_version }, implementation: { path }, reference_style_id?, style_profile_id?, generated_at }`
  - `design_guardrail`: `{ report_path, status, scores, style_overlap { palette, typography, motion, spacing, overall, threshold, gate, comparison_window }, snippet_version, strictness, slop_threshold }`
  - `design_history`: `{ path, mirror_path, entries, max_entries, updated_at }`
  - `design_style_profile`: `{ id, relative_path, similarity_level, source_url?, ingestion_run?, do_not_copy, retention_days, expiry, approvals }`
  - `design_metrics`: telemetry mirror of guardrail + history (`aesthetic_axes_completeness`, `originality_score`, `accessibility_score`, `brief_alignment_score`, `slop_risk`, `diversity_penalty`, `similarity_to_reference`, `style_overlap`, `style_overlap_gate`, `snippet_version`)
  - `approvals`: include Hifi ingestion + any mock capture approvals.

### 4.3 Retention, Privacy, Legal
- Retention: Inherit design pipeline defaults (30 days) with config override `design.retention.days`; shorter window allowed for `hifi_style_profile.json`. Summaries in `out/**` remain after raw artifacts expire.
- Legal/Ethical: Always populate `do_not_copy` in style profiles; guardrail checks fail if logos/wordmarks or unique shapes appear in derived plan. Approvals for site ingestion recorded in manifests, matching compliance SOPs from Hifi toolkit.

## Telemetry & Metrics
- Metrics recorded per run (manifest + `out/.../runs/<run>.json`):
  - `aesthetic_axes_completeness` (0–1)
  - `slop_risk` (0–1)
  - `originality_score`, `accessibility_score`, `brief_alignment_score`
  - `diversity_penalty` (0–1) derived from history overlap
  - `similarity_to_reference` (clone-informed only; capped by `similarity_level`)
  - `style_overlap` (0–1) computed as the maximum of:
    - palette cosine similarity across the top 8 colors (Lab embeddings),
    - typography cosine similarity across the top 3 families/weights (embedding space),
    - motion bucket Jaccard overlap (timing/easing categories),
    - spacing scale cosine similarity (top 6 normalized values).
  - `style_overlap_gate`: `"pass"` | `"fail"`; clone-informed runs fail the guardrail when `style_overlap > 0.10`. Fresh runs record the score but do not gate.
  - `snippet_version`
- Per-axis overlap values (palette/typography/motion/spacing) are mirrored inside `design-review-report.json` and manifest `design_guardrail` to validate guardrail efficacy and diversity penalties.
- Manifest should include timestamps for each stage start/end and any approvals used.

## Configuration Knobs
- `design.pipeline_mode`: `fresh` | `clone-informed` (default `fresh`).
- `design.hifi.similarity_level`: `low` | `medium` | `high` inspiration; affects guardrail penalties.
- `design.guardrail.strictness`: `low` | `medium` | `high`.
- `design.guardrail.slop_threshold`: float 0–1.
- `design.history.max_entries`: default 20.
- `design.snippet.version`: default `v1`.
- `design.retention.days`: default 30; optional `style_profile_days` for Hifi profiles.

### 4.4 Style-Overlap Heuristic (Clone-Informed)
- Comparison window: current plan vs last N=10 history entries (or fewer) for the same project/task.
- Components:
  - Palette: embed top 8 colors into Lab space; cosine similarity on normalized vectors.
  - Typography: embed top 3 families/weights; cosine similarity.
  - Motion: bucket timing/easing categories; Jaccard overlap.
  - Spatial: normalize top 6 spacing values; cosine similarity.
- `style_overlap` = max(palette_sim, typography_sim, motion_overlap, spacing_sim). Guardrail blocks clone-informed runs when `style_overlap > 0.10`; manifests and `design-review-report.json` record the per-axis scores, the overall value, and `style_overlap_gate`.
- Out file: include `style_overlap`, axis scores, gate status, mode (`fresh|clone-informed`), and reference run ids used for comparison. Fresh runs record values for telemetry only.

## Testing & Validation (for future implementation)
- Schema validation: JSON schema/unit tests for each artifact (brief, style profile, aesthetic plan, guardrail report, history).
- Mode parity: Ensure Fresh vs Clone-Informed runs produce the same stage set; only inputs differ.
- Guardrail efficacy: Fixture mocks intentionally containing “AI slop” (generic fonts/purple gradients) must fail with high `slop_risk`.
- Diversity checks: History with repeated palettes triggers `diversity_penalty` in guardrail report.
- Spec freshness: `node scripts/spec-guard.mjs --dry-run` must include this file (`docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`).

## Rollout Notes
- Docs-first: No runtime code changes in this iteration; implementation tasks will wire pipelines, schemas, and writers.
- Add task mirrors (`tasks/frontend-design-pipeline-v2.md`, `.agent/task/frontend-design-pipeline-v2.md`, `tasks/index.json`, `docs/TASKS.md`) referencing `.runs/0412-frontend-design-pipeline-v2/cli/<run-id>/manifest.json`.
- Snippet library folder (`prompt-snippets/`) to be introduced with versioned file `frontend-aesthetics-v1.md` and metadata stamp; tasks will justify creation and guardrail coverage.
