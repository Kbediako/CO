# PRD — Hi-Fi Design Toolkit (Task 0410)

## Summary
- Problem Statement: The design reference pipeline produces raw captures, but teams still lack an automated path to convert those captures into reusable tokens, documentation, and component libraries. Today each team reimplements CSS extraction, tokenization, and self-correction flows, often without manifest evidence or retention controls.
- Desired Outcome: Launch a standalone "hi-fi design toolkit" pipeline that orchestrates CSS extraction, token generation, reference page creation, style guide docs, self-correction loops, and package updates using the autonomous hi-fi design starter. The pipeline must log approvals, surface artifacts under `.runs/0410-hi-fi-design-toolkit/**`, and publish summaries to `out/0410-hi-fi-design-toolkit/design/runs/<run>.json` so downstream agents can act without bespoke setup.

## Goals
- Provide CLI/pipeline entrypoints (`npx codex-orchestrator start diagnostics --pipeline hi-fi-design-toolkit`) that wrap the external toolkit commands (`pnpm -C tools/extractor extract|tokens|refpage|self-correct`, `pnpm -C tools/styleguide build`, `pnpm -C packages/design-tokens build`) with orchestrator telemetry and approval logging.
- Match the existing design-reference toggle UX: `design.config.yaml > pipelines.hi_fi_design_toolkit.enabled` determines defaults, while `--pipeline hi-fi-design-toolkit`, `DESIGN_PIPELINE=1`, or a helper `DESIGN_TOOLKIT=1` env forces the run when CI/local users need it regardless of config.
- Mirror evidence across manifests and task mirrors by exporting `MCP_RUNNER_TASK_ID=0410-hi-fi-design-toolkit` for every run and capturing manifests under `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json`.
- Define retention/privacy guardrails that inherit from `design.config.yaml` plus `compliance/permit.json` (ported from the starter) so only approved sources are extracted and sensitive selectors are masked before staging tokens or reference HTML; token names remain readable (no hashing) because we only process assets under our control and approvals live alongside manifests.
- Integrate outputs back into `packages/design-system` (token + component updates) with clear review gates and manifest links per staged package change.
- Document success metrics, approval expectations, and diagnostics requirements (spec guard, lint/test hooks) so implementation can begin immediately once this PRD is approved.

## Non-Goals
- Rebuilding the autonomous hi-fi toolkit from scratch; we will wrap the upstream commands and adapt staging paths but not fork major logic.
- Shipping net-new visual diff infrastructure beyond what the starter already provides; we focus on orchestrating existing extractor/self-correction flows.
- Introducing auto-deployments to production Storybook or apps; scope stops at staged artifacts and manifest evidence.

## Deliverables & Evidence
- Run Manifest Link: `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json` (attach actual run ID once diagnostics execute with `MCP_RUNNER_TASK_ID=0410-hi-fi-design-toolkit`).
- Metrics / State Snapshots: `.runs/0410-hi-fi-design-toolkit/metrics.json`, `out/0410-hi-fi-design-toolkit/state.json`, and per-run summaries in `out/0410-hi-fi-design-toolkit/design/runs/<run>.json`.
- Artifact Roots: `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/artifacts/design-toolkit/**` (staged CSS/DOM, tokens, reference HTML, style guides, diff reports) and mirrored tokens/components under `packages/design-system/**` with manifest references.
- Checklist Mirrors: `tasks/hi-fi-design-toolkit.md`, `docs/TASKS.md`, `.agent/task/hi-fi-design-toolkit.md` remain `[ ]` until the manifest path above is recorded.

## Success Metrics & Guardrails
- ≥90% of hi-fi toolkit runs must emit a valid token bundle (`tokens.json` + CSS vars) recorded in `design_artifacts.metrics.token_count`.
- Self-correction loop should reduce pixel diffs below 1.5% mean error within two iterations; failures require manifest notes plus follow-up task creation.
- All extraction commands must reference entries in `compliance/permit.json`; missing entries block the run and alert reviewers.
- Playwright extraction, FFmpeg captures, and any third-party resource loads require approvals logged in the manifest `approvals` array referencing reviewer, timestamp, and rationale.
- `node scripts/spec-guard.mjs --dry-run` must run (and pass) before requesting implementation review; failures mean the spec’s `last_review` date is stale or required docs missing.

## Pipeline Scope
1. **Context Acquisition (external toolkit)** — wrap `pnpm -C tools/extractor extract --url <source> --out .runs/.../artifacts/design-toolkit/context` with orchestrator environment variables and `design.config.yaml` inputs (capture URLs, breakpoints, mask selectors).
2. **Token & Style Guide Generation** — call `pnpm -C tools/extractor tokens` and `pnpm -C tools/styleguide build` using extractor outputs; stage token JSON, CSS variables, and Markdown style guides, then update `packages/design-system` token sources.
3. **Reference Page + Self-Correction Loop** — invoke `pnpm -C tools/extractor refpage` and optional `self-correct` runs referencing Playwright diffs (requires approvals and manifest entries per iteration, including `self_correction.provider` + `approval_id` whenever a remote/hosted browser service is used); stage outputs under `design-toolkit/reference/**` and `design-toolkit/diffs/**`.
4. **Toolkit Publication** — copy generated tokens/components into `packages/design-system` workspaces, run `pnpm -C packages/design-system lint|test` or existing `npm --prefix` equivalents, and summarize results via `DesignArtifactWriter` additions dedicated to Task 0410.

## User Experience
- **Design Platform engineers** trigger the pipeline via CLI or orchestrator diagnostics, confirm approved sources via `compliance/permit.json`, and review staged tokens/style guides.
- **Front-end feature teams** pull the staged components and tokens from `packages/design-system`, referencing manifest IDs for traceability.
- **Reviewers** rely on `out/0410-hi-fi-design-toolkit/design/runs/<run>.json` to confirm approvals, retention windows, and privacy mask usage before flipping checklist items to `[x]`.

## Dependencies & Risks
- Requires vendoring `/home/jr_ga/code/ASABEKO/autonomous-hi-fi-design-starter` into `packages/design-reference-tools/` (single build graph, no submodules) and wiring adapters under `scripts/design/toolkit/**`; licensing/compliance review needed before distribution.
- Playwright/FFmpeg installs remain optional but must not affect baseline CI; `npm run setup:design-tools` will be reused, with new quotas logged for video diff/self-correction steps.
- `compliance/permit.json` must be synced from the starter so we can validate extraction targets; missing or outdated permits block runs.
- Pipeline integration depends on `packages/design-system` staying installable; we must guard against workspace drift by running `npm --prefix packages/design-system run test:visual` within the toolkit pipeline.

## Guardrails & Approvals
- Document required approvals for: Playwright scraping, FFmpeg video diffs, any third-party font/image downloads, and remote/hosted self-correction services. Each stage must capture `approval_id` in the manifest, cite the CLI command executed, and set `self_correction.provider` + `approval_id` inside the config snapshot whenever a non-local browser service is involved.
- Retention defaults to 30 days (inherit from `design.config.yaml > metadata.design.retention`) with optional overrides recorded per artifact; automatic purge tasks must delete expired reference snapshots from `.runs/**`.
- `compliance/permit.json` becomes mandatory reading before runs; the PRD owner logs the permit manifest path inside this document once approved.
- Mode changes (`mcp` vs `cloud`) follow the orchestrator autonomy SOP; any override requires recording the manifest path in `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json#approvals`.

## Decisions
- **Toggle UX** — Keep parity with existing pipelines: `design.config.yaml` controls the default, while CLI flag `--pipeline hi-fi-design-toolkit` or env overrides (`DESIGN_PIPELINE=1`, optional `DESIGN_TOOLKIT=1`) force execution for diagnostics/CI regardless of config state.
- **Token naming** — No hashing/redaction. Extracted token names stay readable because the toolkit only processes properties we control and manifests already log privacy approvals.
- **Remote self-correction** — Treat hosted self-correction like other advanced asset stages: log an approval entry per run, identify the provider via `self_correction.provider`, and capture the `approval_id` inside both the manifest and config snapshot for reviewer audits.

## Approvals
- Product: _(pending — attach approver + `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json` once review completes)_
- Engineering: _(pending — attach approver + `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json` once review completes)_
- Design Systems: _(pending — attach approver + `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json` once review completes)_
- Privacy/Compliance: _(pending — attach approver + `.runs/0410-hi-fi-design-toolkit/cli/<run-id>/manifest.json` once review completes)_
