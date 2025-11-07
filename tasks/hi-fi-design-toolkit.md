# Task Checklist — Hi-Fi Design Toolkit (0410-hi-fi-design-toolkit)

> Export `MCP_RUNNER_TASK_ID=0410-hi-fi-design-toolkit` before running diagnostics or guardrail commands. Mirror every checklist change with `docs/TASKS.md` and `.agent/task/hi-fi-design-toolkit.md`. Keep `[ ]` until the proving manifest (e.g., `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json`) is attached inline.

## Foundation
- [x] Collateral minted — `docs/design/PRD-hi-fi-design-toolkit.md`, `docs/design/specs/HI_FI_DESIGN_TOOLKIT.md`, `tasks/index.json`, `.agent/task/hi-fi-design-toolkit.md`, `docs/TASKS.md` reference Task 0410; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json` (diagnostics run 2025-11-07T03:19:35Z).
- [x] External toolkit synchronized — vendored `/home/jr_ga/code/ASABEKO/autonomous-hi-fi-design-starter` into `packages/design-reference-tools/` with snapshot notes in `VENDOR.md`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.
- [x] Compliance permits imported — copied `compliance/permit.json` from the starter into repo root and referenced by PRD/spec; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.

## Pipeline Enablement
- [x] Extractor stage wired — `scripts/design/pipeline/toolkit/extract.ts` wraps `pnpm -C tools/extractor extract`, enforces permits + approvals, and stages context assets under `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/artifacts/design-toolkit/context`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Tokens + style guide stage — `tokens.ts` + `styleguide` wrapper emit token bundles + Markdown docs, update manifest metrics (`token_count`, `styleguide_pages`); Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Reference & self-correction stage — `reference.ts` + optional `self-correct` loops log diff reductions, FFmpeg approvals, and staged outputs under `design-toolkit/reference`/`diffs`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Publish integration — toolkit outputs merged into `packages/design-system` (tokens + components) with `npm --prefix packages/design-system run test:visual` captured in manifest; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.

## Guardrails & Evidence
- [x] Manifest/schema updates — `packages/shared/manifest/types.ts` + writer persist `design_toolkit_artifacts`, `DesignArtifactWriter` emits `out/0410-hi-fi-design-toolkit/design/runs/<run>.json`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Retention/privacy automation — retention window + purge command documented (`npm run design:purge-expired`), approvals for Playwright recorded inside manifest `approvals`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Diagnostics run — `npx codex-orchestrator start hi-fi-design-toolkit --format json` recorded with manifest path mirrored across task docs; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Reviewer hand-off — `npm run review` executed once guardrails + specs approved, citing `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json` and approvals; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.

_Flip entries only after attaching the exact manifest path proving completion._
