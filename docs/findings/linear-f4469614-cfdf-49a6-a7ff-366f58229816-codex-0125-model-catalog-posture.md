# CO-352 Codex 0.125 Model-Catalog Posture Finding

## Decision
Adopt `gpt-5.5` / `xhigh` as the current CO-local ChatGPT-auth model posture after the Codex CLI `0.125.0` audit.

The passing local, delegated, provider-worker, standalone-review fallback, and runtime-mode evidence is enough to move CO-local appserver/ChatGPT-auth posture away from `gpt-5.4` as the recommended operator model. The required cloud canary still failed with an exact blocker, so cloud execution and release-facing pins remain gated until `CO-358` resolves the unusable configured environment id. `explorer_fast` remains the only `gpt-5.3-codex-spark` file/codebase-search exception because live and bundled catalogs still diverge.

## Evidence Summary

| Surface | 0.125 evidence | Result | Decision impact |
| --- | --- | --- | --- |
| Package/release truth | `/opt/homebrew/bin/codex --version` = `codex-cli 0.125.0`; `npm view @openai/codex version dist-tags --json` reports `latest=0.125.0`; GitHub release `rust-v0.125.0` was published `2026-04-24T18:00:38Z` and notes refreshed `models.json` / fixtures. | Passed source-truth check. | Valid candidate for local posture adoption when paired with live smoke evidence. |
| Auth | `codex login status` exits `0` with `Logged in using ChatGPT`. | Passed local auth check. | Local ChatGPT-auth probes are meaningful for this host only. |
| Live catalog | `codex debug models` lists `gpt-5.5`, `gpt-5.4`, and `gpt-5.3-codex-spark`; `gpt-5.5` supports `xhigh`; spark is `supported_in_api=false`. | Passed availability check. | Supports CO-local `gpt-5.5` posture with the top-level/delegated smoke passes below. |
| Bundled catalog | `codex debug models --bundled` lists `gpt-5.5` and `gpt-5.4`; bundled `gpt-5.4` default reasoning is `xhigh`; bundled catalog did not list `gpt-5.3-codex-spark`. | Catalogs diverge. | Do not change `explorer_fast` or downstream/no-network assumptions from live catalog alone. |
| Top-level `gpt-5.5` | `codex exec --ephemeral --json -m gpt-5.5 -c 'model_reasoning_effort="xhigh"'` returned `CO-352-GPT55-TOPLEVEL-PASS`. | Passed. | Promote CO-local top-level posture to `gpt-5.5` / `xhigh` for ChatGPT-auth sessions with current access. |
| Delegated subagent | `codex exec --enable multi_agent -m gpt-5.5 -c 'model_reasoning_effort="xhigh"'` returned `CO352DELEGATEPASS` with completed `collab_tool_call` events. | Passed. | Delegated ChatGPT-auth `gpt-5.5` works for this lane; fallback to `gpt-5.4` only when access smoke fails. |
| Provider worker | Current CO-352 provider worker ran in appserver mode and accepted a same-issue docs child lane. | Passed lane evidence. | Appserver remains the normal local runtime path for provider-worker orchestration; this does not require cloud promotion. |
| Standalone review | Fallback docs-review manifest ran forced `npm run review` after MCP fallback and recorded a clean review outcome; the required cloud review path failed before task submission because the configured environment was not found. | Local fallback review passed; required cloud review failed. | Local review-wrapper evidence supports the CO-local posture; the required cloud failure is a cloud-lane blocker only. |
| Runtime-mode canary | `node scripts/runtime-mode-canary.mjs --task-id linear-f4469614-cfdf-49a6-a7ff-366f58229816-runtime-mode` passed `20/20` for default appserver, appserver success, forced fallback, and unsupported combo. | Passed. | Local appserver posture remains healthy. |
| Required cloud canary | `CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary` failed with `environment '6999395fcc448191b865917084f21c6f' not found`. | Failed required cloud gate. | Blocks cloud execution and release-facing pin promotion only; it is not evidence to keep CO-local posture on `gpt-5.4`. |
| Fallback cloud canary | `CODEX_CLOUD_ENV_ID="" CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary` passed with `cloud_fallback.mode_used=mcp` and `missing_environment`. | Passed fallback contract. | Fallback behavior is healthy but does not replace required cloud execution. |


## Evidence Paths
- Catalog and model canaries: `out/linear-f4469614-cfdf-49a6-a7ff-366f58229816/manual/0.125-model-posture/`
- Runtime-mode canary: `out/linear-f4469614-cfdf-49a6-a7ff-366f58229816/manual/0.125-model-posture/runtime-mode-canary/runtime-canary-summary.json`
- Docs child lane manifest: `.runs/linear-f4469614-cfdf-49a6-a7ff-366f58229816-docs-packet/cli/2026-04-24T20-45-55-787Z-73fa9234/manifest.json`
- Required cloud manifest: `.runs/linear-f4469614-cfdf-49a6-a7ff-366f58229816-cloud-required/cli/2026-04-24T20-53-34-738Z-cf054a86/manifest.json`
- Fallback cloud manifest: `.runs/linear-f4469614-cfdf-49a6-a7ff-366f58229816-cloud-fallback/cli/2026-04-24T20-54-06-599Z-bd863a12/manifest.json`

## Follow-Up
`codex-orchestrator doctor --cloud-preflight` reported cloud preflight as `ok` because `CODEX_CLOUD_ENV_ID` was configured, but the required cloud canary failed immediately because that environment id was not visible to `codex cloud exec`. Filed follow-up `CO-358` to tighten cloud preflight so configured-but-unusable environment ids fail before cloud/release gates.
