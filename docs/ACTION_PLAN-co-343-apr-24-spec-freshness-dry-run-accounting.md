# ACTION_PLAN - CO-343 Apr 24 Spec Freshness and Dry-Run Accounting

## Summary
- Goal: clear the Apr 24 current-date spec/docs freshness blocker with exact ownership and review evidence.
- Scope: CO-343 docs packet, classification note, freshness metadata refresh, owner metadata, and validation evidence.
- Non-goal: CO-341 posture implementation changes.

## Steps
1. Create CO-343 docs-first packet and registry entries.
2. Record the Apr 24 stale spec/docs classification.
3. Refresh only the classified stale spec frontmatters and docs-freshness registry rows.
4. Re-home live rolling freshness owner metadata to CO-343.
5. Rerun `spec-guard`, `docs:freshness`, `docs:freshness:maintain`, and diff whitespace checks.
6. Update CO-341 checklist wording so the earlier dry-run failure is not counted as clean validation evidence.
7. Close CO-343 only after terminal validation is green.

## Risks
- Risk: date-only refresh hides content drift. Mitigation: classification names the rows and confirms they remain active historical/operator surfaces.
- Risk: CO-341 scope expands. Mitigation: code posture files remain separate; CO-343 owns only freshness/accounting.
- Risk: terminal owner reuse repeats. Mitigation: `docs/docs-catalog.json` points the live owner to CO-343 for this refresh.

## Validation
- `node scripts/spec-guard.mjs`
- `MCP_RUNNER_TASK_ID=linear-4a684a5e-64b0-47fb-835a-d792eba29071 npm run docs:freshness`
- `MCP_RUNNER_TASK_ID=linear-4a684a5e-64b0-47fb-835a-d792eba29071 npm run docs:freshness:maintain`
- `git diff --check`
