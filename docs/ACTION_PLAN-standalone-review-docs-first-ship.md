# ACTION_PLAN — Standalone Review + Docs-First Shipping (0953)

## Summary
- Goal: Ship standalone review + docs-first guidance updates with clear, consistent terminology and required artifacts.
- Scope: Documentation, templates, skills, task checklists, and registry updates.
- Assumptions: No code changes required; version bump already captured for release packaging.

## Milestones & Sequencing
1) Draft PRD + TECH_SPEC + ACTION_PLAN + tasks checklist for 0953.
2) Update templates and guidance to require PRD/TECH_SPEC/ACTION_PLAN + tasks; remove mini-spec terminology from core docs.
3) Run conflict audit and standalone review; record approvals in specs/checklists.
4) Refresh instruction stamps and registry entries; finalize evidence and checkmarks.

## Dependencies
- Delegation MCP availability for subagent evidence.
- Docs-freshness registry updates for new templates/docs.

## Validation
- Checks / tests: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `node scripts/diff-budget.mjs` (override if needed), `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run review` (or `codex review --uncommitted` for standalone checks).
- Evidence: capture manifests for delegation/subagent runs and review gates; mirror approvals in PRD/TECH_SPEC + task checklists.
- Rollback plan: Revert doc/template changes and restore prior guidance if needed.

## Risks & Mitigations
- Risk: Conflicting guidance persists in legacy docs. Mitigation: Add explicit “legacy mini-spec = TECH_SPEC” note in SOPs.
- Risk: Delegation guard blocks subagent runs when instruction stamps are stale. Mitigation: refresh stamps before delegation.

## Approvals
- Reviewer:
- Date:
