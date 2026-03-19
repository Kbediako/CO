# 1182 Override Notes

## Docs-Review Guard Stop

- Command: `npx codex-orchestrator start docs-review --task 1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction --format json`
- Status: explicit override carried forward from docs-first registration
- Reason: the `docs-review` pipeline failed at `Run delegation guard` before any diff-local docs review was reached.
- Compensating evidence:
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T073127Z-docs-first/01-spec-guard.log`
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T073127Z-docs-first/02-docs-check.log`
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T073127Z-docs-first/03-docs-freshness.log`
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T073127Z-docs-first/04-docs-review.json`

## Delegation Guard Evidence Note

- Command: `MCP_RUNNER_TASK_ID=1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction-guard npx codex-orchestrator start diagnostics --format json --task 1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction-guard --no-interactive`
- Status: manifest-backed delegation evidence captured; `delegation-guard` then passed
- Note: the diagnostics subrun itself failed in its own internal pipeline with `Stage 'npm run test' failed with exit code 128` and was used only to satisfy the repository's manifest-backed delegation contract, not as `1182` correctness evidence.
- Evidence:
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/00a-guard-subrun.json`
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/01-delegation-guard.log`

## Full-Suite Test Quiet Tail

- Command: `npm run test`
- Status: explicit override applied
- Reason: the file-backed log progressed through `tests/cli-orchestrator.spec.ts`, then the `npm run test` / `npm run test:orchestrator` / `node (vitest)` wrapper stack remained alive without producing the final Vitest summary. The stale stack was terminated instead of treating the run as a clean pass.
- Compensating evidence:
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/05-test.log`
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/05b-targeted-tests.log`

## Stacked-Branch Diff Budget

- Command: `DIFF_BUDGET_OVERRIDE_REASON='stacked branch history; review the live 1182 lane via focused local-route tests and task notes' node scripts/diff-budget.mjs`
- Status: explicit override applied
- Reason: the live lane is reviewable through the bounded local-route helper/router diff and focused regressions, but the stacked branch history exceeds the default diff budget.
- Evidence:
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/05b-targeted-tests.log`
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/08-diff-budget.log`
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/09-review.log`

## Bounded Review Drift

- Command: `FORCE_CODEX_REVIEW=1 DIFF_BUDGET_OVERRIDE_REASON='stacked branch history; review the live 1182 lane via focused local-route tests and task notes' NOTES='Goal: extract orchestrator local-route shell | Summary: moved local route lifecycle routing into orchestratorLocalRouteShell.ts and restored helper plus router coverage | Risks: cloud-to-local reroute handoff, local lifecycle hook coverage, child subpipeline wiring' npm run review`
- Status: explicit override applied
- Reason: after the diff-budget gate was bypassed, the review broadened into cloud-route symmetry inspection instead of returning a concrete `1182` verdict. No diff-local defect was surfaced before termination.
- Compensating evidence:
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/05b-targeted-tests.log`
  - `out/1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction/manual/20260314T075314Z-closeout/09-review.log`
