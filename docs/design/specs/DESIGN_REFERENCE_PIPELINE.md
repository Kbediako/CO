---
last_review: 2025-11-07
---

# Technical Spec — Design Reference Pipeline (Task 0401)

## Overview
- Objective: Implement an opt-in `design-reference` pipeline that stages high-fidelity design artifacts (DOM, CSS, screenshots, reference HTML, Storybook components, optional animations/video) and persists evidence into manifests and `out/**` outputs while respecting retention, privacy, and approval guardrails.
- In Scope: Pipeline selection/config loading, `ArtifactStager` enhancements, Playwright extractor, reference page builder, componentization inside `packages/design-system`, advanced asset generators (Framer Motion/FFmpeg), visual regression execution, manifest schema/writer updates, DesignArtifactWriter, guardrail tooling updates.
- Out of Scope: Automatic enrollment for all tasks, re-platforming Storybook, shipping a new analytics dashboard, bundling Playwright/FFmpeg binaries into core CI images.

## Requirements Mapping
| PRD Goal | Spec Section |
| --- | --- |
| Opt-in pipeline triggered by config or CLI flag | 3.1 |
| Enhanced ArtifactStager + staged reference outputs | 3.2, 3.3 |
| Componentization via `packages/design-system` workspace | 3.4 |
| Optional advanced assets + approvals/quotas | 3.5 |
| Visual regression coverage + manifest mirroring | 3.6, 4.2 |
| Manifest schema for `design_artifacts` + DesignArtifactWriter | 4.1, 4.2 |
| Guardrails for retention/privacy/spec freshness | 5.1, 5.2 |

## Architecture & Design

### 3.1 Pipeline Selection & Config Loading
- Configuration Source:
  - Primary file `design.config.yaml` with top-level keys:
    - `metadata.design.enabled` (boolean, default `false`).
    - `metadata.design.capture_urls` (array of absolute URLs or relative paths).
    - `metadata.design.breakpoints` (array of viewport configs `{ id, width, height, deviceScaleFactor? }`).
    - `metadata.design.mask_selectors` (array of CSS selectors to blur/redact).
    - `metadata.design.retention` (object with `days` default 30, optional `auto_purge=true`).
    - `metadata.design.privacy` (flags `allow_third_party`, `require_approval`).
    - `advanced` section toggles for `framer_motion`, `ffmpeg` with `quota_seconds` and `approver`.
  - CLI override: `--pipeline design-reference` or environment `DESIGN_PIPELINE=1` enabling the pipeline even if config disabled.
- Loader Implementation:
  - Extend existing config loader (`packages/shared/config/index.ts`, TBD exact module) to parse `design.config.yaml`; fall back to defaults when missing.
  - Normalize booleans/quotas; validate breakpoints and URLs (reject invalid protocols).
  - Persist resolved configuration snapshot into manifest metadata under `design_artifacts.config`.
- Pipeline Activation Logic:
  - Modify orchestrator pipeline registry to check both `config.metadata.design.enabled` and CLI/env overrides.
  - Propagate `CODEX_ORCHESTRATOR_RUN_ID` and `CODEX_ORCHESTRATOR_MANIFEST_PATH` into every stage via `runCommandStage`.
  - Provide dry-run logging that lists which stages will execute and referenced capture URLs.

### 3.2 ArtifactStager Enhancements
- Update `packages/shared/artifacts/stager.ts` (placeholder path) to accept new options: `{ relativeDir?: string, overwrite?: boolean }`.
- `relativeDir` appends to the computed run artifact root (`.runs/<task>/<run>/artifacts/`).
  - Example: `new ArtifactStager({ relativeDir: 'design/reference' })` writes to `.runs/<task>/<run>/artifacts/design/reference`.
- Ensure `ArtifactStager` sanitizes segments, prevents `../`, and creates directories lazily.
- Extend unit tests to cover relative directory usage and overwrites.
- Provide helper `stager.forDesign(stageName)` returning `relativeDir: design/<stageName>`.

### 3.3 Playwright Extractor Stage
- Stage Implementation:
  - Command invoked via `runCommandStage('design-extract', { cmd: 'node scripts/design/extract.js' ... })`.
  - Script responsibilities:
    - Ensure Playwright dependencies installed; if missing, instruct caller to run `npm run setup:design-tools`.
    - Iterate capture URLs per breakpoint; launch Playwright headless, apply privacy masks, capture DOM (`.json`), CSS (`.css`), screenshots (`.png`).
    - Log approvals when `allow_third_party` toggled true or when mask selectors are empty.
    - Stage outputs under `design/reference/playwright/<breakpoint>/<slug>/`.
    - Record metadata JSON summarizing capture context (URL, viewport, timestamp, approval id if required).
  - Error Handling:
    - Respect global approval policy: if Playwright install requires escalation, fail with actionable message.
    - Provide configurable retries and mark manifest `design_artifacts[].status`.

### 3.4 Reference Page Builder & Componentization
- Reference Builder:
  - Consume staged extracts and assemble `motherduck.html`, embedding CSS and resource links.
  - Stage HTML under `design/reference/motherduck.html` plus aggregated asset manifest.
  - Optionally generate normalized JSON describing layout structure for downstream componentization.
- Componentization Stage:
  - Pre-requisite: `DESIGN_PIPELINE=1` ensures environment includes design dependencies.
  - Use `npm --prefix packages/design-system install` lazily if `node_modules` missing.
  - Run `npm --prefix packages/design-system run generate:stories -- --input <staged-manifest>` to create Storybook stories matching captured components.
  - Stage generated components under `design/components/<component-name>/`.
  - Capture dependency metadata (package versions, install duration) for manifest logging.

### 3.5 Advanced Asset Generators
- Framer Motion:
  - Optional script `npm --prefix packages/design-system run generate:motion` producing animation JSON/JS.
  - Stage outputs under `design/assets/motion/`.
  - Enforce quota (max animations per run, default 20) defined in config; exceed -> skip with warning.
- FFmpeg Video:
  - Triggered when `advanced.ffmpeg.enabled=true`.
  - Pipeline checks for FFmpeg availability via `command -v ffmpeg`; if missing, instruct manual install or `npm run setup:design-tools`.
  - Render viewport walkthrough/gif per capture, stage under `design/assets/video/`.
  - Log runtime + codec info; enforce `quota_seconds` from config (abort when exceeded).
  - Record explicit approval metadata (approver name/id, timestamp) inside manifest entry.

### 3.6 Visual Regression Stage
- Command: `npm --prefix packages/design-system run test:visual`.
- Prepares baseline by referencing staged components; store diff artifacts under `design/visual-regression/<suite>/<test>.png`.
- Integrate `DesignArtifactWriter` to ingest pass/fail counts, diff thresholds, and link to baseline manifest.
- Pipeline should fail when regression suites produce blocking diffs unless `allow_regressions=true` in config overrides.

## Manifest & Persistence

### 4.1 Schema Updates
- Update `packages/shared/manifest/types.ts`:
  - Add `design_artifacts?: { stage: 'extract' | 'reference' | 'components' | 'motion' | 'video' | 'visual-regression'; relative_path: string; status: 'succeeded' | 'skipped' | 'failed'; approvals?: { id: string; actor: string; reason: string; timestamp: string }[]; quota?: { type: 'storage' | 'runtime'; limit: number; unit: 'MB' | 'seconds'; consumed: number }; expiry?: { date: string; policy: string }; privacy_notes?: string[]; config_hash?: string }[];`
  - Include `design_config_snapshot?: object` capturing normalized `design.config.yaml` (omit secrets).
  - Ensure type definitions enforce bounded array length (e.g., ≤200 entries) to protect manifest size.
- Update `packages/shared/manifest/writer.ts` to accept partial manifest updates:
  - Merge new design artifacts without clobbering existing sections.
  - Validate `expiry.date` is ISO-8601; compute via retention days when not provided.
  - Guarantee atomic writes (temp file + rename) since design assets may produce large manifests.

### 4.2 DesignArtifactWriter
- Location: `packages/shared/design-artifacts/writer.ts` (new module).
- Responsibilities:
  - Accept pipeline context, aggregated stage stats, and artifact descriptors.
  - Persist summary JSON under `out/<task-id>/design/runs/<run>.json` with structure:
    ```json
    {
      "task_id": "0401-design-reference",
      "run_id": "<run-id>",
      "manifest": "<manifest-path>",
      "stages": [...],
      "retention": { "days": 30, "auto_purge": true },
      "privacy": { "allow_third_party": false, "mask_selectors": [...] },
      "approvals": [...]
    }
    ```
  - Mirror aggregated metrics (asset counts, storage footprint) back into manifest `design_artifacts_summary`.
  - Provide helper `writeDesignSummary({ manifestPath, runId, summary })` returning relative output path.

## Implementation Plan
- Stage Execution Order:
  1. Load config & set environment variables.
  2. Extract assets (Playwright).
  3. Build reference page.
  4. Componentize via design-system workspace.
  5. Generate advanced assets conditionally.
  6. Run visual regression tests.
  7. Persist manifest/output summaries.
- Error Handling:
  - Each stage writes status (`succeeded`, `skipped`, `failed`) to manifest.
  - On failure, pipeline stops downstream stages unless `continue_on_failure=true` for non-blocking assets.
  - Partial success still writes `DesignArtifactWriter` summary with error list.
- Environment Variables:
  - `CODEX_ORCHESTRATOR_RUN_ID`, `CODEX_ORCHESTRATOR_MANIFEST_PATH` forwarded automatically.
  - Additional `DESIGN_PIPELINE=1` triggers design-system workspace commands.
  - Stage-specific: `DESIGN_CONFIG_PATH` points to resolved config file.

## Guardrails & Compliance

### 5.1 Spec Guard Integration
- Update `scripts/spec-guard.mjs` watch list to include `docs/design/specs/**`.
- Require `last_review` freshness; spec guard fails when older than 30 days.
- Document in checklist that `node scripts/spec-guard.mjs --dry-run` must pass before merging design changes.

### 5.2 Retention & Privacy Policies
- Retention enforcement strategies:
  - Record `expiry.date` for each artifact based on retention days; cleanup job removes expired assets.
  - Provide CLI reminder to run `npm run design:purge-expired` (TBD) if automatic cleanup not yet implemented.
- Privacy logging:
  - For any capture skipping mask selectors or enabling third-party resources, append `privacy_notes`.
  - Manifest should include `approvals` entries referencing review records stored in `.runs/<task-id>/<run>/manifest.json#approvals`.
  - Document expectation that all Playwright/FFmpeg runs require run-level approval logging.

### 5.3 Dependency Strategy
- Optional Setup:
  - Script `npm run setup:design-tools` installs Playwright binaries and FFmpeg wrappers; skipped in baseline CI.
  - `packages/design-system` dependencies installed lazily with `npm --prefix packages/design-system install`.
  - Document caches to minimize repeated installs (e.g., reuse `PLAYWRIGHT_BROWSERS_PATH` when defined).
- Fallback Paths:
  - When optional tools missing and not approved, pipeline logs skip reason and marks stage `skipped`.
  - Visual regression stage requires `packages/design-system`; failure to install marks run `failed` with guidance.

## Testing Strategy
- Unit Tests:
  - ArtifactStager relative dir tests.
  - Config loader validation for mandatory fields and defaults.
  - Manifest writer integration tests ensuring new sections persist.
- Integration Tests:
  - Pipeline smoke run with mocked Playwright/FFmpeg to validate stage sequencing and manifest output.
  - Visual regression harness using sample components in `packages/design-system`.
  - Retention policy test verifying expiry calculation.
- Tooling:
  - Extend `npm run eval:test` to include a design pipeline fixture when available (optional at launch).

## Open Questions
- What sanitization (HTML/CSS stripping, asset hashing) is required before staging to comply with privacy policies?
- Do we need per-artifact encryption or access controls when storing reference assets in `.runs/**`?
- Should we provide a CLI to fetch the latest `motherduck.html` from `out/<task-id>/design/runs/<run>.json` for downstream automation?

## Rollout
- Phase 1: Internal pilot with single project; manual retention cleanup.
- Phase 2: Broader rollout after retention automation & FFmpeg gating validated.
- Success requires documentation updates (`docs/design/PRD-design-reference-pipeline.md`, checklists) and at least one diagnostic run captured in manifest.
