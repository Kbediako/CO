# Codex Version Policy (CO)

## Purpose
Define the current stable compatibility/adoption target for CO and keep newer CLI/model moves evidence-gated.

## Current Posture
- Current CO compatibility/adoption target remains stable Codex CLI `0.118.0` for the current upstream-aligned main baseline.
- Latest audited stable candidate is Codex CLI `0.121.0`; CO-195 holds promotion because the provider workspace lacks `CODEX_CLOUD_ENV_ID`, so the required cloud canary contract cannot execute.
- The `0.118.0` posture keeps the previously recorded runtime/cloud evidence gates and adds a current local CLI help re-audit for onboarding-sensitive surfaces: `codex exec` now accepts a prompt argument plus piped stdin (stdin appends as a `<stdin>` block), `codex login --device-auth` is available, and `codex review --help` exposes `[PROMPT]` alongside `--uncommitted` / `--base` / `--commit`.
- Current model posture is `gpt-5.4` for top-level, delegated subagent, and review surfaces.
- Keep `explorer_fast` as the only explicit `gpt-5.3-codex-spark` exception for file/codebase search only.
- When authenticating through ChatGPT, keep delegated and review surfaces on `gpt-5.4` unless a fresh provider lane explicitly validates `gpt-5.4-codex`.
- Newer stable/prerelease Codex builds may run only in task-scoped lanes with captured evidence.
- Local appserver remains the expected default runtime path after the `CO-22` canary.
- Provider workers should keep the current `codex exec` / `codex exec resume` supervision seam for now; app-server is promoted to a richer control-substrate candidate, not an immediate supervision replacement.
- Treat `thread/shellCommand` as a sensitive unsandboxed surface; it is not part of the default provider-worker authority model.
- Manual Codex re-review requests are quota-aware: send at most one `@codex` ping per PR head SHA, then wait for a new head before re-requesting.
- Codex review quota exhaustion is an operational availability event, not an adoption/promotion signal; if it blocks review, use the merge-waiver path documented in `AGENTS.md` and `docs/AGENTS.md` (checks green, unresolved actionable threads = `0`, waiver evidence recorded).
- Do not newly promote, re-promote, or carry forward the `0.118.0` string after baseline drift unless the candidate posture has recorded results for `node scripts/runtime-mode-canary.mjs`, `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`, and `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary`.

## Candidate Audit Notes
- 2026-04-14: `CO-180` audited local `codex-cli 0.120.0` after baseline drift. The command-surface audit found no P0/P1 regression for `codex exec`, `codex exec resume`, `codex review`, or `codex login --device-auth`; raw logs are under `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/codex-0120-audit/` and `.runs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/codex-0120-audit/`.
- 2026-04-14: the runtime-mode canary passed after building `dist`; the first canary attempt failed only because the package canary packs with `--ignore-scripts` and `dist/bin/codex-orchestrator.js` was absent before `npm run build`. Passing evidence is under `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/runtime-mode-canary-r2/`.
- 2026-04-14: promotion is held because the required cloud canary contract could not execute in this provider workspace without `CODEX_CLOUD_ENV_ID`. The cloud fallback run produced a successful local fallback manifest with `cloud_fallback.mode_used=mcp`, but the CI wrapper still exited failed under `CODEX_CLOUD_CANARY_REQUIRED=1` because the missing environment remains a required configuration blocker. Required/fallback logs are under `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/cloud-canary-required/` and `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/cloud-canary-fallback/`; fallback manifest: `.runs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/cli/2026-04-14T10-13-58-564Z-94eab37d/manifest.json`.
- 2026-04-14: `CO-183` expanded the candidate audit to official `rust-v0.119.0` and `rust-v0.120.0` release notes plus local help surfaces. The documented adoption target stayed at `0.118.0` because the required cloud canary had not passed or been explicitly waived. Evidence is under `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/codex-0120-release-audit/`.
- 2026-04-14: `CO-183` classified the release-note deltas as follows: MCP resources/custom-server/file uploads/elicitations are adopt-as-compatible; MCP `outputSchema` is held for CO delegation tools because current outputs are pass-through control results with variable shapes and broad schemas would be false precision; `tool_search` ordering is no-op for CO wrappers; app-server and exec-server remote control stay behind the guarded resident-session authority seam; Realtime v2 / Agent Turn API is no-op for CO; scoped review prompt transport, runtime-mode canary, cloud-required canary, and cloud-fallback canary remain evidence gates recorded in the task packet.
- 2026-04-16: `CO-195` audited official `rust-v0.121.0`, OpenAI changelog, npm `@openai/codex latest=0.121.0`, and local `codex-cli 0.121.0` command surfaces. Local `codex exec`, `codex exec resume`, `codex review --help`, `codex login --device-auth`, `codex marketplace add --help`, app-server, MCP, and cloud help surfaces showed no P0/P1 regression. Runtime-mode canary passed 20/20. Promotion remains held because `CODEX_CLOUD_ENV_ID` is absent. The required cloud canary exited at preflight, and the fallback canary produced a successful local MCP fallback manifest while the required wrapper still exited failed under the missing-env configuration blocker. Evidence: `out/linear-4122489e-1a3b-43cf-a181-e98ada0a55e1/manual/codex-version-canary/compare/decision-go-no-go.md`, `out/linear-4122489e-1a3b-43cf-a181-e98ada0a55e1/manual/codex-0121-release-audit/`, `out/linear-4122489e-1a3b-43cf-a181-e98ada0a55e1/manual/runtime-mode-canary/`, `out/linear-4122489e-1a3b-43cf-a181-e98ada0a55e1/manual/cloud-canary-required/`, and `out/linear-4122489e-1a3b-43cf-a181-e98ada0a55e1/manual/cloud-canary-fallback/`.
- 2026-04-16: `CO-199` classifies `rust-v0.121.0` sandbox/security deltas without promoting `0.121.0`. Local-only rows are secure devcontainer posture, macOS private DNS, macOS Unix sockets, Windows elevated denial, WSL1 bubblewrap behavior, exec-server filesystem sandboxing, websocket token hash auth, `danger-full-access`, and `thread/shellCommand`; cloud-only is remote exec environment policy; pinned inputs are not applicable to CO preflight; MCP sandbox-state metadata is shared metadata only and does not expand tool authority. `doctor --cloud-preflight` now reports detectable local-only security advisories separately from cloud preflight blockers.

## Required Evidence Gates
For any change to the current `0.118.0` / `gpt-5.4` posture, or any promotion of a newer Codex build in CO:
1. Local appserver path passes on the candidate Codex CLI + model posture.
2. Delegated/review surfaces are verified on the actual auth provider in use; for ChatGPT auth, keep `gpt-5.4` unless new compatibility evidence exists for `gpt-5.4-codex`.
3. Runtime-mode canary passes (`node scripts/runtime-mode-canary.mjs`).
4. Cloud canary required contract passes (`CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`).
5. Cloud fallback contract behavior remains correct (`CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary`).
6. No P0/P1 regression versus the current stable baseline.

## Cadence
- Re-verify the current posture when auth/provider behavior changes materially.
- Run canary on each newer stable/prerelease candidate considered for CO.
- Run weekly backstop canary while CO is actively adopting a non-baseline Codex build.

## Rollback
- Any failed required gate, provider compatibility regression, or P0/P1 signal triggers immediate HOLD and rollback to the last verified stable posture.
- Record rollback decision in:
  - `docs/TASKS.md`
  - `tasks/index.json`
  - task checklists under `tasks/` and `.agent/task/`

## Evidence Paths
- Manifests: `.runs/<task-id>/cli/<run-id>/manifest.json`
- Logs/summaries: `out/<task-id>/manual/`
- Handover notes: `out/handovers/`
- Decision summary: `out/<task-id>/manual/codex-version-canary/compare/decision-go-no-go.md`
