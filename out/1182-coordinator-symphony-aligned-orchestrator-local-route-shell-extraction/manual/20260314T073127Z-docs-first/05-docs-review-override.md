# 1182 Docs-Review Override

- Command: `npx codex-orchestrator start docs-review --task 1182-coordinator-symphony-aligned-orchestrator-local-route-shell-extraction --format json`
- Status: explicit override applied
- Reason: the `docs-review` pipeline failed at `Run delegation guard` before any diff-local docs review was reached.
- Compensating evidence:
  - `spec-guard` passed (`01-spec-guard.log`)
  - `docs:check` passed (`02-docs-check.log`)
  - `docs:freshness` passed (`03-docs-freshness.log`)
  - the failed `docs-review` attempt and manifest path are captured in `04-docs-review.json`
