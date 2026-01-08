---
last_review: 2026-01-08
---

# Technical Spec — Hi-Fi Design Toolkit (Task 0410)

## Overview
- Objective: Ship a standalone hi-fi design toolkit pipeline that wraps the autonomous hi-fi design starter commands, orchestrates CSS extraction through token publication, logs approvals/retention data, and publishes evidence usable by downstream agents without manual setup.
- Scope: Config-driven pipeline activation, CLI surface area, stage wrappers (context acquisition, token/styleguide generation, reference/self-correction, toolkit publication), manifest/schema updates, approval logging, retention/privacy enforcement, integration with `packages/design-system`, testing/rollout hooks, and spec guard coverage.
- Out of Scope: Reimplementing extractor logic, delivering production deployment automation, or bypassing existing orchestrator guardrails.

## Requirements Mapping
| PRD Goal | Spec Section |
| --- | --- |
| Pipeline entrypoints wrapping external toolkit commands | 3.1, 3.2 |
| Manifests + artifacts under `.runs/0410-hi-fi-design-toolkit/**` with MCP env routing | 3.1, 3.6 |
| Retention/privacy guardrails + permit validation | 3.3, 3.7 |
| Integration with `packages/design-system` tokens/components | 3.4, 3.5 |
| Success metrics + approvals + diagnostics (spec guard) | 3.6, 4.1, 5 |

## Architecture & Design

### 3.1 Pipeline Activation & Configuration
- Config entry: add `pipelines.hi_fi_design_toolkit` to `design.config.yaml` with `enabled`, `sources[]`, and optional overrides (breakpoints, mask selectors, retention) — identical opt-in semantics to the current design-reference pipeline so users keep the same mental model.
- Live asset overrides: optional `live_assets` block per source toggles `keep_scripts`, `allow_remote_assets`, and `max_stylesheets` so reviewers can capture full-motion experiences when compliance approves it.
- Activation logic:
  - Export `MCP_RUNNER_TASK_ID=0410-hi-fi-design-toolkit` before invoking orchestrator commands.
  - CLI: `npx codex-orchestrator start diagnostics --pipeline hi-fi-design-toolkit --format json` or env overrides (`DESIGN_PIPELINE=1`, helper `DESIGN_TOOLKIT=1`) force enablement even when config leaves the pipeline off, mirroring design-reference behavior.
  - Registry entry adds a new pipeline definition referencing staged commands in `scripts/design/pipeline/toolkit/*.ts` (new module) while reusing shared helpers (`context.ts`, `state.ts`).
- Inputs: `design.config.yaml` drives capture URLs, breakpoints, mask selectors, retention windows, privacy approval requirements, and references to `compliance/permit.json` entries per URL.

### 3.2 Context Acquisition Stage (Extractor Wrapper)
- New script `scripts/design/pipeline/toolkit/extract.ts` wraps `pnpm -C tools/extractor extract` from the external starter.
  - Resolves each `capture_url` -> ensures permit exists in `compliance/permit.json` (imported schema). Missing entry marks stage `failed` and instructs reviewer to update compliance docs.
  - Sets env:
    - `TOOLKIT_OUT=.runs/0410-hi-fi-design-toolkit/cli/<run-id>/artifacts/design-toolkit/context`
    - `PLAYWRIGHT_BROWSERS_PATH` forwarded when `npm run setup:design-tools` already executed.
    - `DESIGN_TOOLKIT_MASK_SELECTORS` derived from config.
  - For each breakpoint, executes `pnpm -C tools/extractor extract --url ... --out $TOOLKIT_OUT/<slug>/<breakpoint>`; stage metadata appended to manifest (`design_toolkit_artifacts` array) with approvals for Playwright usage.

### 3.3 Tokenization & Style Guide Stage
- Script `scripts/design/pipeline/toolkit/tokens.ts` orchestrates two commands:
  1. `pnpm -C tools/extractor tokens --in context/<slug>/raw.css --out tokens/<slug>`.
  2. `pnpm -C tools/styleguide build --tokens tokens/<slug>/tokens.json --out styleguide/<slug>`.
- Outputs staged under `.runs/.../artifacts/design-toolkit/tokens/**` and `styleguide/**` respectively, referenced from manifest entries with `token_count`, `semantic_alias_count`, and `styleguide_pages` metrics.
- Retention: inherits `metadata.design.retention.days` but allows overrides via `pipelines.hi_fi_design_toolkit.retention`. Each artifact stores `expiry` timestamp and optional `privacy_notes` describing scrubbed selectors.
- Token names remain unredacted so Storybook/style guide outputs stay human-readable; privacy controls rely on approvals + masking selectors rather than hashing.

### 3.4 Reference Page & Self-Correction Stage
- Script `scripts/design/pipeline/toolkit/reference.ts` runs:
  - `pnpm -C tools/extractor refpage --snapshot context/<slug>/computed.json --css context/<slug>/raw.css --out reference/<slug>`.
  - Optional `pnpm -C tools/extractor self-correct --reference-url ... --candidate file:reference/<slug>/index.html --work diffs/<slug>` controlled by config flag `self_correction.enabled` with max iterations to control runtime.
- Self-correction writes diff images/video (when FFmpeg enabled) under `diffs/<slug>`; Stage must log approvals for Playwright, FFmpeg, and any remote/hosted self-correction provider. When a non-local provider runs, config snapshot must include `self_correction.provider` and `self_correction.approval_id` so manifests + reviewers can trace the decision.
- Each iteration writes manifest entries capturing `iteration`, `error_rate_before`, `error_rate_after`, runtime, and approvals.

### 3.5 Toolkit Publication & Integration with packages/design-system
- Script `scripts/design/pipeline/toolkit/publish.ts` consumes tokens/styleguide outputs and updates:
  - `packages/design-system/tokens/src/hi-fi/<slug>.json` (source of truth) by copying sanitized tokens and referencing manifest ID.
  - `packages/design-system/src/components/hi-fi/**` generated via existing component scaffolds (leveraging the reference pipeline’s `componentize.ts` helper with `DESIGN_PIPELINE=1`).
  - Runs `npm --prefix packages/design-system run build:tokens`, `run lint`, and `run test:visual` gated by config to confirm integration.
- Stage writes `design_toolkit_components` summary to manifest with `component_count`, `storybook_story_count`, `visual_regressions_detected`, and attaches log files under `artifacts/design-toolkit/publish/logs/**`.

### 3.6 Manifest Schema & Evidence Logging
- Extend `packages/shared/manifest/types.ts` with `design_toolkit_artifacts` containing:
  ```ts
  type DesignToolkitArtifact = {
    id: string;
    stage: 'extract' | 'tokens' | 'styleguide' | 'reference' | 'self-correct' | 'publish';
    relativePath: string;
    approvals: ApprovalRecord[];
    retention: { days: number; expiry: string; autoPurge: boolean };
    metrics?: Record<string, number | string>;
    privacyNotes?: string[];
  };
  ```
- `DesignArtifactWriter` gains an additional section `design_toolkit_summary` capturing run-level metrics (token counts, diff reductions, approval ids). Outputs saved to `out/0410-hi-fi-design-toolkit/design/runs/<run>.json` and aggregated into `out/0410-hi-fi-design-toolkit/state.json`.
- All stages push logs to manifest `logs` array referencing CLI commands executed, start/end timestamps, exit codes, and `MCP_RUNNER_TASK_ID`.

### 3.7 Approvals, Retention, and Compliance
- Integrate `compliance/permit.json` (copied from the external starter) into workspace root; add schema validation step prior to extraction (fails fast if missing).
- Approvals matrix:
  - **Playwright extraction** — requires manifest entry referencing reviewer + reason; stage ensures `privacy.requireApproval=true` before running when `allow_third_party=false`.
  - **FFmpeg/video diffs** — require `advanced.ffmpeg.enabled=true` and `quota_seconds` within limit; stage refuses to continue if quota 0 or approval absent.
  - **Self-correction remote services** (if configured) — require a dedicated approval entry per run, with `self_correction.provider` + `approval_id` recorded in the config snapshot and manifest metadata alongside any data residency notes.
- Retention automation: add new CLI `npm run design:purge-expired` to remove `.runs/0410-hi-fi-design-toolkit/**` artifacts past expiry; pipeline logs when cleanup last ran and stores manifest pointer inside metrics file.

### 3.8 Orchestrator Autonomy Integration
- Each pipeline run inherits SOP requirements from `.agent/SOPs/orchestrator-autonomy.md`: manifests stored under `.runs/<task>/cli/<run-id>/manifest.json`, approvals mirrored, guardrail commands executed before review (`node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` when fixtures exist).
- Diagnostics command produces a manifest path recorded in both `tasks/hi-fi-design-toolkit.md` and `.agent/task/hi-fi-design-toolkit.md` before flipping `[ ]` states.

### 3.9 External Toolkit Synchronization
- Track the vendored autonomous hi-fi design starter snapshot in `packages/design-reference-tools/VENDOR.md` alongside `packages/design-reference-tools/` (no submodules). Record upstream commit hash + license/permit references in manifest `external_sources`, and ensure MCP runs remain self-contained.
- Provide checksum verification for the vendored directory to detect drift; mismatches fail the pipeline with remediation steps (rerun the sync script with the approved commit). Compliance data (license, permit) rides along.

## Testing Strategy
- Unit Tests: cover new config parsing, manifest schema serialization, permit validation, retention calculations, and CLI wrapper argument generation.
- Integration Tests:
  - Smoke run using sanitized fixture site to exercise extract→tokens→styleguide path (mock Playwright/FFmpeg to keep CI fast).
  - Self-correction loop test verifying error rate reduction logged correctly.
  - Publish stage test that injects synthetic tokens/components into `packages/design-system` and asserts `npm --prefix packages/design-system run test:visual` invocation + manifest entry.
- Tooling: extend `npm run eval:test` with fixture referencing `.runs/0410-hi-fi-design-toolkit/eval/` to ensure pipeline compatibility.

## Rollout Plan
1. **Phase 0 (Docs)** — Approve this PRD/spec pair, ensure `tasks/index.json` and checklist mirrors list Task 0410.
2. **Phase 1 (Adapter & Diagnostics)** — Implement sync + wrapper scripts, run diagnostics once to populate `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json`, capture evidence in tasks.
3. **Phase 2 (Publish Path)** — Enable tokens/components publication plus retention automation; require manifest approvals before shipping to design-system owners.
4. **Phase 3 (Autonomy Pilot)** — Run pipeline against two pilot properties, collect metrics in `out/0410-hi-fi-design-toolkit/design/runs/<run>.json`, and iterate on guardrails based on reviewer feedback.

## Spec Guard & Freshness
- `node scripts/spec-guard.mjs --dry-run` already watches `docs/design/specs/**`; add Task 0410 to the guard manifest by referencing this file’s `last_review` date (set to 2026-01-08).
- Implementation PRs touching toolkit code must refresh `last_review` (≤30 days) and attach the guard manifest path when seeking approval.
- Guard fail resolution: update spec sections impacted, rerun spec guard, record manifest path in checklists before proceeding.

## Open Questions
- How do we enforce permit updates when new brands are added? (Proposal: pipeline fails with actionable message referencing `compliance/permit.json` and the diff to submit.)
- Do we need encryption-at-rest for staged extractor outputs? If so, integrate with repository secrets service before implementation.

## Run Notes & Next Targets

### 2025-11-07 — Cognition.ai spike
- **Manifest reference**: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T08-50-51-966Z-c2554f30/manifest.json` (captured prior to purging `.runs/**` so future reviewers can cite the evidence even though the large artifacts were deleted).
- **Playwright snapshot improvements**:
  - Snapshotper rewrites Cognition’s remote asset URLs to stable local references, letting reviewers open `context/cognition-home/inline.html` offline and ensuring self-correction never calls the live site after capture time.
  - DOM/CSS capture seeds palette + typography extraction, producing IBM Plex-based stacks and 12 key colors inside `tokens/cognition-home/tokens.json` and the generated style guide.
  - Stage emits `sections.json` + `palette.json`, giving downstream agents structured hooks for hero/content modules while keeping privacy masks enforced by permits.
  - Compliance gate behaved correctly — the run stalled until `https://cognition.ai` was whitelisted in `compliance/permit.json`, validating the approval workflow.
- **Outstanding gaps**: section detection collapsed the page into a single block, gradient/shadow tokens are missing, animation masks need canvas/video coverage, only the desktop homepage was captured, and semantic aliases (`cta`, `surface`, etc.) still need to be derived from usage counts.
- **Cleanup action**: after recording these notes, `.runs/0410-hi-fi-design-toolkit/2025-11-07T*/**`, `.runs/0410-hi-fi-design-toolkit/cli/*`, and `out/0410-hi-fi-design-toolkit/design/runs/*.json` were deleted so the workspace returns to the baseline state.

### 2025-11-07 — Soil Net capture (live assets enabled)
- **Manifest reference**: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T12-41-35-270Z-1f9139d2/manifest.json` (Soil Net portal, live scripts/styles preserved, publish disabled).
- **Capture summary**:
  - Single `soil-net` source with desktop (1440×900) + mobile (428×926) breakpoints, no mask selectors so header logos + scroll hooks stay intact for fidelity testing.
  - Permit `soil-net-2025-11-07` now authorizes live assets + optional video capture. Manifest approvals show `playwright-soil-net`; FFmpeg remains off but can be toggled later.
  - `live_assets.keep_scripts=true` and `max_stylesheets=24` ensure scroll-triggered animations, carousels, and sticky nav transitions replay when serving the reference folder locally.
- **Next steps**: derive semantic token aliases (CTA, surface, border), add localization metadata for Japanese sections, and trial `self_correction.enabled=true` + screenshot diffs to keep the live-clone fidelity without hitting soil-net.jp during downstream publish stages.
