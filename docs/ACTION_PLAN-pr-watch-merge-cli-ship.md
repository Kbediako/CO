# ACTION_PLAN - PR Watch-Merge CLI Command (0964)

## Summary
- Goal: Ship PR monitor/quiet-window/auto-merge as a first-class CLI command for npm/downstream users.
- Scope: docs-first scaffolding, delegation/docs-review evidence, command implementation, docs updates, validation, and PR lifecycle completion.
- Assumptions: `gh` CLI remains available/authenticated for monitor flows.

## Milestones and Sequencing
1) Docs-first scaffolding + mirrors + task registry entries.
2) Delegation scout evidence + docs-review manifest.
3) Implement `pr watch-merge` command with parity behavior.
4) Update tests and docs/skills/SOP references.
5) Run required guardrails and manual E2E.
6) Run standalone elegance review, resolve findings, and open PR.

## Dependencies
- Existing monitor logic + helper utilities.
- `gh` CLI status/review APIs.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
- Manual E2E:
  - `codex-orchestrator pr watch-merge --help`
  - `codex-orchestrator pr watch-merge --pr <id> --dry-run --timeout-minutes 1 --quiet-minutes 1`

## Risks and Mitigations
- Risk: command complexity introduces regressions in CLI entrypoint.
  - Mitigation: add focused command-surface tests and keep isolated handler.
- Risk: operator confusion between script and shipped command.
  - Mitigation: docs/skill updates with clear preferred path + fallback.
