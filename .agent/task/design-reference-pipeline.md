# Task List — Design Reference Pipeline (0401-design-reference)

## Context
- Link to PRD: `docs/design/PRD-design-reference-pipeline.md`
- Summary: Deliver an opt-in `design-reference` pipeline that extracts design assets via Playwright, composes a canonical reference page, componentizes artifacts inside `packages/design-system`, optionally emits advanced motion/video assets, and records evidence with retention/privacy guardrails in manifests and `out/**` outputs.

### Checklist Convention
- Keep `[ ]` until acceptance criteria is met. Flip to `[x]` only after attaching the manifest path from `.runs/0401-design-reference/cli/<run-id>/manifest.json` that proves completion.
- Mirror this checklist with `tasks/design-reference-pipeline.md` and `docs/TASKS.md`.

## Foundation
1. **Collateral synchronized**
   - Files: `docs/design/PRD-design-reference-pipeline.md`, `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, `tasks/index.json`, `docs/TASKS.md`, `.agent/task/design-reference-pipeline.md`.
   - Acceptance: Task 0401 references align, manifest placeholder `<manifest-path>` recorded.
   - [ ] Status: _(pending)_
2. **Pipeline toggles wired**
   - Files: `design.config.yaml` template, config loader.
   - Commands: Document `--pipeline design-reference`, `DESIGN_PIPELINE=1`.
   - [x] Status: `Completed — .runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`
3. **Setup tooling available**
   - Commands: `npm run setup:design-tools` installs Playwright/FFmpeg lazily; baseline CI unaffected.
   - [x] Status: `Completed — .runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`

## Pipeline Stages
1. **Playwright extractor**
   - Files: `scripts/design/extract.js`, `packages/shared/artifacts/stager.ts`.
   - Acceptance: DOM/CSS/screenshots staged under `design/reference/`, privacy approvals logged.
   - [x] Status: `Completed — .runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`
2. **Reference page builder**
   - Files: `scripts/design/build-reference.js`, staged `motherduck.html`.
   - Acceptance: Reference HTML + metadata staged with `relativeDir='design/reference'`.
   - [x] Status: `Completed — .runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`
3. **Componentization**
   - Files: `packages/design-system/**`.
   - Commands: `DESIGN_PIPELINE=1 npm --prefix packages/design-system run generate:stories`.
   - Acceptance: Component assets staged under `design/components/`.
   - [x] Status: `Completed — .runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`
4. **Advanced assets**
   - Files: scripts for Framer Motion + FFmpeg.
   - Acceptance: Config toggles enforce quotas; approvals recorded; stage output under `design/assets/`.
   - [x] Status: `Completed — .runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`

## Manifest & Guardrails
1. **Manifest schema updates**
   - Files: `packages/shared/manifest/types.ts`, `packages/shared/manifest/writer.ts`.
   - Acceptance: `design_artifacts` persisted with bounds + config snapshot.
   - [x] Status: `Completed — .runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`
2. **DesignArtifactWriter**
   - Files: `packages/shared/design-artifacts/writer.ts`.
   - Acceptance: `out/0401-design-reference/design/runs/<run>.json` produced with retention/privacy summary.
   - [x] Status: `Completed — .runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`
3. **Retention & privacy controls**
   - Files: docs/automation, cleanup scripts.
   - Acceptance: Retention policy + approval logging documented; purge path defined.
   - [x] Status: `Completed — .runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`
4. **Guardrail integration**
   - Files: `scripts/spec-guard.mjs`, CI definitions.
   - Commands: `npm --prefix packages/design-system run test:visual`.
   - Acceptance: Spec guard watches `docs/design/specs/**`; visual regression command in pipeline manifests.
   - [x] Status: `Completed — .runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`

## Verification & Approvals
1. **Visual regression evidence**
   - Files: `design/visual-regression/**`.
   - Acceptance: Pass/fail summary + diff artifacts staged with manifest link.
   - [x] Status: `Completed — .runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`
2. **Diagnostics run**
   - Commands: `npx codex-orchestrator start diagnostics --pipeline design-reference --format json`.
   - Acceptance: Manifest stored under `.runs/0401-design-reference/cli/<run-id>/manifest.json`.
   - [x] Status: `Completed — .runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`
3. **Reviewer hand-off**
   - Commands: `npm run review`.
   - Acceptance: Review references latest design-reference manifest; approvals logged.
   - [ ] Status: _(pending)_

## Notes
- Optional Playwright/FFmpeg installs require approval logging; record entries under `design_artifacts[].approvals`.
- Retain `<manifest-path>` placeholders until the first run generates evidence.
