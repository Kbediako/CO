# Codex Version Policy (CO)

## Purpose
Define the current stable compatibility/adoption target for CO and keep newer CLI/model moves evidence-gated.

## Current Posture
- Current CO compatibility/adoption target remains stable Codex CLI `0.118.0` for the current upstream-aligned main baseline.
- Latest audited stable candidate is Codex CLI `0.122.0`; CO-269 holds promotion because the required cloud canary contract failed before task submission when environment `6999395fcc448191b865917084f21c6f` was not found, and the fallback contract still lacks clean success evidence because the fallback rerun intentionally cleared `CODEX_CLOUD_ENV_ID`, fell back to MCP, and then stopped on existing docs-freshness/spec-baseline debt before producing a clean success manifest.
- Release-facing downstream-smoke workflows (`core-lane`, `release`, and `pack-smoke-backstop`) pin `@openai/codex@0.122.0` after `CO-268` rebaselined `pack:smoke` from `codex marketplace add` to `codex plugin marketplace add`; this keeps marketplace smoke reproducible on the current stable command surface without promoting the active CO compatibility target.
- `cloud-canary` pins `@openai/codex@0.122.0` as the explicit audited candidate so canary evidence stays reproducible without floating to latest.
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
- 2026-04-16: `CO-199` classifies `rust-v0.121.0` sandbox/security deltas without promoting `0.121.0`:
  - Local-only: secure devcontainer posture, macOS private DNS, macOS Unix sockets, Windows elevated denial, WSL1 bubblewrap behavior, exec-server filesystem sandboxing, websocket token hash auth, `danger-full-access`, and `thread/shellCommand`.
  - Cloud-only: remote exec environment policy.
  - Not applicable to CO preflight: pinned inputs.
  - MCP sandbox-state metadata: shared metadata only; it does not expand tool authority or replace cloud canary evidence.
  - `doctor --cloud-preflight` now reports detectable local-only security advisories separately from cloud preflight blockers.
- 2026-04-21: `CO-269` audited official `rust-v0.122.0` release facts (`published_at=2026-04-20T18:38:40Z`), npm latest `@openai/codex@0.122.0` (`time.modified=2026-04-21T00:30:22.721Z`), and local `codex-cli 0.122.0` command/help surfaces (`timestamp=2026-04-21T01:50:53Z`). Local `codex exec`, `codex review --help`, `codex login --device-auth`, `codex app-server --help`, and `codex mcp --help` showed no P0/P1 regression. Evidence: `out/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3/manual/codex-0122-release-audit/`, `out/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3/manual/codex-0122-command-surface/`, and `out/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3/manual/codex-version-canary/compare/decision-go-no-go.md`.
- 2026-04-21: `CO-269` runtime-mode evidence passes on the post-build sample (`ready_for_default_flip=true`, all four scenario checks passed 1/1). Required cloud evidence still blocks promotion: the required canary failed before task submission because environment `6999395fcc448191b865917084f21c6f` was not found, and the fallback contract fell back to MCP for missing `CODEX_CLOUD_ENV_ID` but still terminated failed because the fallback rerun hit existing docs-freshness/spec-baseline debt before producing a clean success manifest. Evidence: `out/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3/manual/runtime-mode-canary/post-build-sample/runtime-canary-summary.json`, `out/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3/manual/cloud-canary-required/cloud-canary-required.log`, `out/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3/manual/cloud-canary-fallback/cloud-canary-fallback.log`, `.runs/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3-cloud-required/cli/2026-04-21T01-55-01-176Z-ec12a719/run-summary.json`, and `.runs/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3-cloud-fallback/cli/2026-04-21T01-56-29-071Z-a7ced7cf/run-summary.json`.
- 2026-04-21: `CO-269` directly compared marketplace capability across the workflow-candidate versions. `npx --yes @openai/codex@0.121.0 marketplace --help` exposes `add`, while `npx --yes @openai/codex@0.122.0 marketplace --help` falls back to top-level Codex help and does not expose the old marketplace surface. At the time of that posture lane, `scripts/pack-smoke.mjs` still failed closed when `codex marketplace add` was unavailable, so downstream marketplace smoke workflows stayed pinned to `0.121.0` pending a follow-up command-surface rebaseline. Evidence: `out/linear-a2949fd4-2319-4cd0-acd1-68e6404766f3/manual/codex-0122-command-surface/marketplace-capability-compare.log`, `scripts/pack-smoke.mjs`, and `tests/pack-smoke.spec.ts`.
- 2026-04-21: `CO-269` classified `rust-v0.122.0` deltas for CO as follows:
  - Adopt now: pin `cloud-canary` to explicit `@openai/codex@0.122.0` and document the workflow split so canary evidence no longer floats latest.
  - Superseded by `CO-268`: release-facing downstream-smoke workflows no longer need to stay on `@openai/codex@0.121.0` because `pack:smoke` now intentionally uses the `0.122.0` `codex plugin marketplace add` contract with evidence.
  - Hold: active-target promotion from `0.118.0` to `0.122.0` until the required cloud canary and fallback contract both complete with clean evidence in a configured environment.
  - No-op for current CO posture: standalone installer changes, TUI `/side` conversations, plan-mode fresh-context start, plugin browsing/marketplace UX expansion, tool-search/image-generation defaults, and general docs/chore refactors because this lane found no CO-specific regression or required workflow change beyond the audited candidate pin policy.
- 2026-04-21: `CO-268` completed the marketplace follow-up by proving local `codex-cli 0.122.0` exposes `codex plugin marketplace add` and `codex plugin marketplace remove`, while `codex marketplace add --help` fails, then rebaselining public docs, launcher recovery guidance, pack-smoke detection/invocation, focused tests, and release-facing smoke workflow pins to `@openai/codex@0.122.0`. This does not promote the active CO compatibility target from `0.118.0`; it only updates the marketplace-dependent smoke contract and preserves the `CO-196` packaged marketplace architecture.

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
