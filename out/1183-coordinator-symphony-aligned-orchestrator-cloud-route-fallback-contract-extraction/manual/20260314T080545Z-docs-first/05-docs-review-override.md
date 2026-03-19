# 1183 Docs-Review Override

- Command: `npx codex-orchestrator start docs-review --task 1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction --format json --no-interactive`
- Status: explicit override applied
- Reason: the `docs-review` pipeline failed at `Run delegation guard` before any diff-local docs review was reached.
- Compensating evidence:
  - `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/20260314T080545Z-docs-first/01-spec-guard.log`
  - `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/20260314T080545Z-docs-first/02-docs-check.log`
  - `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/20260314T080545Z-docs-first/03-docs-freshness.log`
  - `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/20260314T080545Z-docs-first/04-docs-review.json`
