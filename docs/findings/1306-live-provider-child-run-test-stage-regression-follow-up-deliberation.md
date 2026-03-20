# Findings - 1306 Live Provider Child-Run Test-Stage Regression Follow-Up

## Scope
- Reviewed the current live `CO-2` child-run manifest/log pair and the two failing local test surfaces on top of the `1305` branch state.

## Findings
1. The live child run is not blocked by a missing command lifecycle terminal event. `.runs/linear-856c1318-524f-4db3-8d4a-b357ec51c304/cli/2026-03-19T11-53-42-683Z-10f53643/manifest.json` is terminal with `status=failed`, `status_detail=stage:test:failed`, and `commands[3].exit_code=1`, while `commands/04-test.ndjson` contains both `exec:end` and `command:end`.
2. The `RlmCodexRuntimeShell` regression is narrow. The implementation forces non-interactive mode with nullish coalescing, so empty-string env vars survive instead of normalizing to the intended `1/1/0` defaults.
3. The `delegation-guard` regression is a negative-path diagnostic issue. The script evaluates provider-child proof before it knows whether the current task is actually a sanctioned provider child, so a top-level provider-started fallback run without launch provenance also emits a misleading `parent_run_id` failure.
4. The next lane should stay bounded to those two regressions. The provider-started control-host ledger contract added in `1305` is already working live and should not be reopened unless the rerun disproves that after the test-stage fix.

## Decision
- Proceed with a narrow `1306` implementation lane focused on:
  - empty-string non-interactive env normalization in `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`
  - truthful top-level provider-started negative diagnostics in `scripts/delegation-guard.mjs`
  - focused test updates plus full validation and live rerun
