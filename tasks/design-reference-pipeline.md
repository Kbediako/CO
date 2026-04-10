# Task Checklist — Design Reference Pipeline (0401-design-reference)

> Export `MCP_RUNNER_TASK_ID=0401-design-reference` before launching orchestrator commands. Mirror checklist status across `/tasks`, `docs/TASKS.md`, and `.agent/task/design-reference-pipeline.md`. Keep entries at `[ ]` until the manifest path (e.g., `.runs/0401-design-reference/cli/<run-id>/manifest.json`) confirming completion is attached.
> Current repo truth after `CO-88`: the checked-in `packages/design-system` package is still a thin scaffold, and `npm --prefix packages/design-system run test:visual` is placeholder smoke rather than a shipped visual-regression suite. Treat this checklist as pipeline history and intent, not proof of a mature design-system surface on the current branch.

## Foundation
- [x] Collateral synchronized — `docs/design/PRD-design-reference-pipeline.md`, `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, `tasks/index.json`, `.agent/task/design-reference-pipeline.md`, `docs/TASKS.md` reference Task 0401 with `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`.
- [x] Pipeline toggles wired — `design.config.yaml` template added, config loader surfaces `metadata.design.enabled`, CLI `--pipeline design-reference`/`DESIGN_PIPELINE=1` documented; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Setup tooling — `npm run setup:design-tools` documented/tested to install Playwright/FFmpeg on demand without impacting baseline CI; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

## Pipeline Stages
- [x] Playwright extractor implemented — stages DOM/CSS/screenshots via enhanced `ArtifactStager(relativeDir='design/reference')`, logs privacy approvals; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Reference page builder shipped — generates `motherduck.html` + metadata under `design/reference/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Componentization stage recorded initial `packages/design-system` scaffold outputs; current checked-in package remains scaffold-level rather than a shipped Storybook/component surface. Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Advanced assets optionality — Framer Motion + FFmpeg paths gated by config, quotas enforced, approvals logged; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

## Manifest & Guardrails
- [x] Manifest schema updates — `packages/shared/manifest/types.ts` + `packages/shared/manifest/writer.ts` persist `design_artifacts` safely; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] DesignArtifactWriter output — writes `out/0401-design-reference/design/runs/<run>.json` summaries with retention + privacy fields; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Retention & privacy controls — automation or documentation covering expiry cleanup, mask selectors, approval logging for Playwright/FFmpeg; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Guardrail integration — `scripts/spec-guard.mjs` monitors `docs/design/specs/**`, pipeline executes `npm --prefix packages/design-system run test:visual` in CI; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

## Verification & Approvals
- [x] Visual review evidence — historical pipeline artifacts were staged under `design/visual-regression/`, but the current checked-in `packages/design-system` command remains placeholder smoke rather than a shipped diff suite. Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Diagnostics run — `npx codex-orchestrator start diagnostics --pipeline design-reference --format json` recorded with manifest link; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Reviewer hand-off — `npm run review` cites latest design-reference manifest and approvals; Evidence: `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`.

_Flip each `[ ]` to `[x]` only after attaching the exact `.runs/0401-design-reference/cli/<run-id>/manifest.json` path that satisfies the acceptance criteria._
