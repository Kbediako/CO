# PRD — Design Reference Pipeline (Task 0401)

## Summary
- Problem Statement: Front-end teams lack a reproducible pipeline for capturing high-fidelity design references, resulting in manual screenshot diffs, unsourced component snapshots, and missing privacy controls for staged assets.
- Desired Outcome: Provide an opt-in `design-reference` pipeline that extracts DOM/CSS/screenshots via Playwright, builds a canonical reference page, componentizes the output inside `packages/design-system`, generates advanced motion/video assets when enabled, performs visual regression checks, and mirrors summarized evidence into manifests and run artifacts.

## Goals
- Activate the pipeline when `design.config.yaml` sets `metadata.design.enabled=true` or when CLI runs with `--pipeline design-reference`, honoring repository guardrails and approval policies.
- Extend `ArtifactStager` to accept `relativeDir` so extract/build/component stages can stage assets under `.runs/<task>/<run>/artifacts/design/**` without manual path stitching.
- Produce a canonical `motherduck.html` reference page plus componentized assets under `packages/design-system` using on-demand workspace installs (`DESIGN_PIPELINE=1` with `npm --prefix`).
- Support optional advanced assets (Framer Motion animations, optional FFmpeg video renders) with explicit quotas and approvals recorded in the manifest.
- Run Playwright-driven visual regression tests prior to completion and mirror summarized results to `out/<task>/design/runs/<run>.json` via a `DesignArtifactWriter`.
- Document and enforce artifact retention/expiry/privacy rules, including logging approvals for Playwright/FFmpeg usage.

## Non-Goals
- Shipping a default design pipeline for every run; pipeline remains opt-in and tied to `design.config.yaml` or CLI flag overrides.
- Replacing existing Storybook workflows or enforcing component naming conventions beyond staged outputs.
- Bundling FFmpeg or Playwright binaries directly into CI images; installs happen through `npm run setup:design-tools` when needed.
- Delivering brand-new manifest aggregation dashboards; scope is manifest schema extensions and per-run summaries.

## Documentation & Evidence
- Run Manifest Link: `<manifest-path>` (design-reference pipeline diagnostic run to be attached once available).
- Metrics / State Snapshots: `out/0401-design-reference/design/state.json` (placeholder for pipeline summary), `.runs/0401-design-reference/metrics.json` (initialize during first pipeline execution).

## Stakeholders
- Product: Design Platform Enablement (unassigned)
- Engineering: Experience Foundations (unassigned)
- Design Systems: packages/design-system maintainers (unassigned)
- Security & Privacy: Data Governance partner responsible for artifact retention reviews (unassigned)

## Metrics & Guardrails
- Primary Success Metrics:
  - ≥90% of design runs stage reference assets with valid metadata entries in `design_artifacts`.
  - Playwright extractor flake rate ≤5% per month (tracked via manifest outcomes).
  - Visual regression suite detects ≥95% of intentional UI changes introduced during pilot projects.
- Guardrails / Error Budgets:
  - Staged assets must be deleted automatically after the configured retention window (`design.config.yaml > retention.days`, default 30) unless a reviewer approves an extension.
  - Playwright captures respect privacy flags (`metadata.design.mask_selectors`, `allow_third_party=false` by default) and log approvals when overrides occur.
  - FFmpeg rendering requires explicit opt-in (`advanced.ffmpeg.enabled=true`) and records approval context plus duration quota in `design_artifacts`.
  - `node scripts/spec-guard.mjs --dry-run` monitors `docs/design/specs/**` to prevent stale design specs.

## User Experience
- Personas:
  - Design engineers responsible for translating Figma references into production-ready components.
  - Front-end developers validating regressions across responsive breakpoints.
  - Design system maintainers reviewing evidence before accepting automated component snapshots.
- User Journeys:
  - A designer sets `metadata.design.enabled=true` in `design.config.yaml`, runs `npx codex-orchestrator start diagnostics --pipeline design-reference`, and receives staged CSS/DOM/screenshots plus `motherduck.html` with manifest evidence.
  - A front-end developer enables `DESIGN_PIPELINE=1 npm --prefix packages/design-system run test:visual` to validate componentized Storybook stories against extracts.
  - A reviewer inspects `out/0401-design-reference/design/runs/<run>.json` to confirm retention policies and approval logs before promoting assets.

## Technical Considerations
- Configuration:
  - `design.config.yaml` schema includes `metadata.design` (enabled flag, breakpoints array, capture URLs, privacy masks, retention quotas) and `pipelines.design-reference` overrides (CLI flag parity).
  - Pipeline stages receive `CODEX_ORCHESTRATOR_RUN_ID` and `CODEX_ORCHESTRATOR_MANIFEST_PATH` from `runCommandStage`, ensuring staged files and writer outputs stay traceable.
- Pipeline Flow:
  1. Playwright Extractor — launches via optional setup script (`npm run setup:design-tools`), stages DOM/CSS/screenshots under `artifacts/design/reference/`, records capture metadata and approvals.
  2. Reference Page Builder — composes `motherduck.html` using staged assets with `ArtifactStager(relativeDir='design/reference')`.
  3. Componentization Stage — bootstraps `packages/design-system` when `DESIGN_PIPELINE=1`, runs targeted story generators, stages results to `artifacts/design/components`.
  4. Advanced Asset Generation — optionally creates animations/video under `artifacts/design/assets`, conditioned on `advanced.*` flags.
  5. Visual Regression Tests — execute `npm --prefix packages/design-system run test:visual`, writing reports to `artifacts/design/visual-regression`.
  6. DesignArtifactWriter — aggregates summarized evidence and writes `out/0401-design-reference/design/runs/<run>.json`.
- Manifest & Persistence:
  - Add bounded `design_artifacts` section to `packages/shared/manifest/types.ts` with per-stage entries (`type`, `relativePath`, `quota`, `approvals`, `expiry`, `privacy_notes`).
  - Update `packages/shared/manifest/writer.ts` to persist the new section, ensuring backward compatibility when absent.
  - DesignArtifactWriter mirrors summary stats plus retention metadata to `out/<task>/design/runs/<run>.json`.
- Guardrails:
  - `scripts/spec-guard.mjs` includes `docs/design/specs/**` in the watch list.
  - Document retention/expiry and privacy expectations within pipeline docs; approvals recorded in manifests and `.runs/<task>/<run>/manifest.json`.
  - Instructions require referencing manifest evidence in checklists before flipping statuses.

## Dependencies & Risks
- Dependencies:
  - Optional Playwright and FFmpeg binaries installed via `npm run setup:design-tools`; guard pipeline to skip gracefully when tools unavailable.
  - `packages/design-system` Next.js/Storybook workspace maintained as an on-demand dependency to avoid bloating baseline CI.
  - Manifest schema update requires coordination with downstream analytics that consume manifest JSON.
- Risks:
  - High storage usage if retention policies are misconfigured; mitigation via quota checks and automatic cleanup capability.
  - Privacy concerns if selectors or third-party embeds leak sensitive data; guard via default masks and approval logging.
  - FFmpeg licensing/performance variability across environments; open question around bundling vs. relying on system installs.

## Open Questions
- Should FFmpeg be vendored for consistent codecs, or should we rely on system packages with manifest warnings when missing?
- What sanitization rules apply to captured HTML/CSS before staging (e.g., strip PII, hashed URLs)?
- How do we expose retention override approvals (`design_artifacts[].approval_id`) for audit tooling consuming `out/<task>/design/runs/<run>.json`?

## Approvals
- Product: _(pending — attach approver + `<manifest-path>` once review completes)_
- Engineering: _(pending — attach approver + `<manifest-path>` once review completes)_
- Design Systems: _(pending — attach approver + `<manifest-path>` once review completes)_
- Privacy: _(pending — attach approver + `<manifest-path>` once review completes)_
