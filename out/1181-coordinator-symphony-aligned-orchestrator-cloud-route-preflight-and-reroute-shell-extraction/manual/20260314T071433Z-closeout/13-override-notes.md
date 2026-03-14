# 1181 Override Notes

## Docs-Review Guard Stop

- Command: `npx codex-orchestrator start docs-review --task 1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction --format json`
- Status: explicit override carried forward from docs-first registration
- Reason: the `docs-review` pipeline failed at `Run delegation guard` before any diff-local docs review was reached.
- Compensating evidence:
  - `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/20260314T070207Z-docs-first/01-spec-guard.log`
  - `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/20260314T070207Z-docs-first/02-docs-check.log`
  - `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/20260314T070207Z-docs-first/03-docs-freshness.log`
  - `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/20260314T070207Z-docs-first/04-docs-review.json`

## Stacked-Branch Diff Budget

- Command: `DIFF_BUDGET_OVERRIDE_REASON='stacked branch history; review the live 1181 lane via focused cloud-route tests and task notes' node scripts/diff-budget.mjs`
- Status: explicit override applied
- Reason: the live lane is reviewable through the focused cloud-route helper diff and targeted regressions, but the stacked branch history exceeds the default diff budget.
- Evidence:
  - `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/20260314T071433Z-closeout/05b-targeted-tests.log`
  - `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/20260314T071433Z-closeout/08-diff-budget.log`
  - `out/1181-coordinator-symphony-aligned-orchestrator-cloud-route-preflight-and-reroute-shell-extraction/manual/20260314T071433Z-closeout/09-review.log`
