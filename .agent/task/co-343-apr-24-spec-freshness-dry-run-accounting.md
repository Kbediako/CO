# Agent Task Mirror - CO-343

- Linear Issue: `CO-343`
- MCP Task ID: `co-343-apr-24-spec-freshness-dry-run-accounting`
- PRD: `docs/PRD-co-343-apr-24-spec-freshness-dry-run-accounting.md`
- TECH_SPEC: `docs/TECH_SPEC-co-343-apr-24-spec-freshness-dry-run-accounting.md`
- ACTION_PLAN: `docs/ACTION_PLAN-co-343-apr-24-spec-freshness-dry-run-accounting.md`
- Checklist: `tasks/tasks-co-343-apr-24-spec-freshness-dry-run-accounting.md`

## Scope
Resolve the Apr 24 stale active-spec and docs-freshness blocker found during CO-341 validation. Keep CO-341 posture changes separate.

## Guardrails
- Do not weaken `spec-guard` or docs freshness policy.
- Do not broaden rolling freshness caps/windows.
- Do not treat a dry-run that prints failures as clean validation evidence.
- Use non-dry-run `node scripts/spec-guard.mjs` for terminal closeout.

## Evidence
- Classification: `docs/findings/co-343-apr-24-docs-freshness-classification.md`
- CO-341 relationship comment: Linear `CO-341`

## Current Status
- CO-343 is created and active.
- Exact stale rows are classified.
- Spec guard, docs:freshness, and docs:freshness:maintain now pass after the exact stale-row refresh.
- Linear closeout remains pending until the parent CO-341 PR lane reaches terminal state.
