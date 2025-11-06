# Task Checklist — Design Reference Pipeline (0401-design-reference)

> Export `MCP_RUNNER_TASK_ID=0401-design-reference` before launching orchestrator commands. Mirror checklist status across `/tasks`, `docs/TASKS.md`, and `.agent/task/design-reference-pipeline.md`. Keep entries at `[ ]` until the manifest path (e.g., `.runs/0401-design-reference/cli/<run-id>/manifest.json`) confirming completion is attached.

## Foundation
- [ ] Collateral synchronized — `docs/design/PRD-design-reference-pipeline.md`, `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, `tasks/index.json`, `.agent/task/design-reference-pipeline.md`, `docs/TASKS.md` reference Task 0401 with `<manifest-path>`.
- [ ] Pipeline toggles wired — `design.config.yaml` template added, config loader surfaces `metadata.design.enabled`, CLI `--pipeline design-reference`/`DESIGN_PIPELINE=1` documented; Evidence: `<manifest-path>`.
- [ ] Setup tooling — `npm run setup:design-tools` documented/tested to install Playwright/FFmpeg on demand without impacting baseline CI; Evidence: `<manifest-path>`.

## Pipeline Stages
- [ ] Playwright extractor implemented — stages DOM/CSS/screenshots via enhanced `ArtifactStager(relativeDir='design/reference')`, logs privacy approvals; Evidence: `<manifest-path>`.
- [ ] Reference page builder shipped — generates `motherduck.html` + metadata under `design/reference/`; Evidence: `<manifest-path>`.
- [ ] Componentization stage delivered — `packages/design-system` workspace bootstrapped with `DESIGN_PIPELINE=1`, staged Storybook components recorded; Evidence: `<manifest-path>`.
- [ ] Advanced assets optionality — Framer Motion + FFmpeg paths gated by config, quotas enforced, approvals logged; Evidence: `<manifest-path>`.

## Manifest & Guardrails
- [ ] Manifest schema updates — `packages/shared/manifest/types.ts` + `packages/shared/manifest/writer.ts` persist `design_artifacts` safely; Evidence: `<manifest-path>`.
- [ ] DesignArtifactWriter output — writes `out/0401-design-reference/design/runs/<run>.json` summaries with retention + privacy fields; Evidence: `<manifest-path>`.
- [ ] Retention & privacy controls — automation or documentation covering expiry cleanup, mask selectors, approval logging for Playwright/FFmpeg; Evidence: `<manifest-path>`.
- [ ] Guardrail integration — `scripts/spec-guard.mjs` monitors `docs/design/specs/**`, pipeline executes `npm --prefix packages/design-system run test:visual` in CI; Evidence: `<manifest-path>`.

## Verification & Approvals
- [ ] Visual regression evidence — captured diffs + pass/fail summaries staged under `design/visual-regression/`; Evidence: `<manifest-path>`.
- [ ] Diagnostics run — `npx codex-orchestrator start diagnostics --pipeline design-reference --format json` recorded with manifest link; Evidence: `<manifest-path>`.
- [ ] Reviewer hand-off — `npm run review` cites latest design-reference manifest and approvals; Evidence: `<manifest-path>`.

_Flip each `[ ]` to `[x]` only after attaching the exact `.runs/0401-design-reference/cli/<run-id>/manifest.json` path that satisfies the acceptance criteria._
