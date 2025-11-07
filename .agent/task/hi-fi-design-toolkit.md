# Task List — Hi-Fi Design Toolkit (0410-hi-fi-design-toolkit)

## Context
- PRD: `docs/design/PRD-hi-fi-design-toolkit.md`
- Spec: `docs/design/specs/HI_FI_DESIGN_TOOLKIT.md`
- Summary: Wrap the autonomous hi-fi design starter into an orchestrator pipeline that extracts CSS, emits tokens/style guides, runs reference + self-correction loops, and publishes outputs into `packages/design-system` with full manifest evidence, approvals, and retention controls.

### Checklist Convention
- Export `MCP_RUNNER_TASK_ID=0410-hi-fi-design-toolkit` before invoking diagnostics or guard commands.
- Keep `[ ]` until the manifest at `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json` is linked inline. Mirror state with `tasks/hi-fi-design-toolkit.md` and `docs/TASKS.md`.

## Foundation
1. **Collateral minted**
   - Deliverables: PRD, spec, task mirrors, index updates.
   - Acceptance: Manifest path attached proving diagnostics referencing these docs.
   - [x] Status: `Completed — .runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`
2. **External toolkit synchronized**
   - Tasks: Vendored `autonomous-hi-fi-design-starter` into `packages/design-reference-tools/`, recorded snapshot metadata in `VENDOR.md`.
   - [x] Status: `Completed — .runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`
3. **Compliance permits imported**
   - Tasks: Ported `compliance/permit.json`, validated linkage from PRD/spec.
   - [x] Status: `Completed — .runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`

## Pipeline Enablement
1. **Extractor stage wired**
   - Files: `scripts/design/pipeline/toolkit/extract.ts`, `design.config.yaml` additions.
   - Acceptance: permit validation + Playwright approvals logged, artifacts staged under `design-toolkit/context`.
   - [x] Status: `Completed — .runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`
2. **Tokens + style guide stage**
   - Files: `tokens.ts`, `styleguide.ts` or combined wrapper.
   - Acceptance: token metrics recorded, Markdown style guide staged, manifest entries present.
   - [x] Status: `Completed — .runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`
3. **Reference & self-correction stage**
   - Files: `reference.ts`, `self-correct.ts` within toolkit module.
   - Acceptance: reference HTML + diff assets staged, approvals for FFmpeg recorded, error rate improvements logged.
   - [x] Status: `Completed — .runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`
4. **Publish integration**
   - Files: `publish.ts`, `packages/design-system/**` updates, CI hook for `npm --prefix packages/design-system run test:visual`.
   - Acceptance: tokens/components committed with manifest references, tests recorded.
   - [x] Status: `Completed — .runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`

## Guardrails & Evidence
1. **Manifest/schema updates**
   - Files: `packages/shared/manifest/types.ts`, `packages/shared/manifest/writer.ts`, `DesignArtifactWriter`.
   - Acceptance: new `design_toolkit_artifacts` + `design_toolkit_summary` persisted to manifests + `out/**`.
   - [x] Status: `Completed — .runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`
2. **Retention & privacy automation**
   - Files: retention purge script, docs.
   - Acceptance: approvals logged, retention metadata tracked, purge command manifest recorded.
   - [x] Status: `Completed — .runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`
3. **Diagnostics run**
   - Commands: `npx codex-orchestrator start hi-fi-design-toolkit --format json`.
   - Acceptance: manifest path recorded in all mirrors.
   - [x] Status: `Completed — .runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`
4. **Reviewer hand-off**
   - Commands: `npm run review` referencing latest manifest + approvals.
   - Acceptance: manifest path + approvals recorded before closing task.
   - [x] Status: `Completed — .runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`

## Notes
- Reuse `npm run setup:design-tools` for Playwright/FFmpeg installs; log approvals when enabling third-party captures.
- Spec guard freshness is mandatory; rerun `node scripts/spec-guard.mjs --dry-run` before requesting implementation.
