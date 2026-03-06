# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Oversight + Live Linear Advisory Adapters (1014)

## Summary
- Goal: ship the first real Telegram + Linear provider adapters on top of CO's existing control core.
- Scope: one active-run Telegram polling bridge plus one advisory-only live Linear resolver.
- Assumptions:
  - provider tokens remain external/env-scoped,
  - no public inbound endpoint is required for 1014,
  - the current control core and dynamic-tool bridge stay authoritative.

## Milestones & Sequencing
1. Docs-first registration
- Create PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror.
- Capture explicit Symphony-reference boundary and adapter-only scope.
- Register 1014 in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.

2. Linear live advisory implementation
- Add a `ControlServer`-owned async live-provider evaluation path while preserving static dispatch pilot behavior.
- Project tracked Linear issue metadata plus a bounded recent-activity slice into compatibility payloads.
- Add targeted tests for static/live/fail-closed behavior.

3. Telegram polling oversight implementation
- Add bot polling bridge with allowed-chat filtering and run-scoped offset persistence.
- Add read-only command handlers and bounded pause/resume control handlers.
- Add targeted tests and a manual simulation matrix.

4. Validation + closeout
- Run docs-review.
- Run targeted validation plus required repo gates for the owned diff.
- Run explicit elegance review.
- Commit the coherent 1014 slice and update closeout evidence.

## Dependencies
- Closed boundary/policy lanes:
  - `0998`
  - `1000`
  - `1009`
  - `1010`
  - `1001`
  - `1013`
- External credentials already prepared:
  - Telegram bot token
  - Linear API key

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
  - `npm run pack:smoke` if downstream-facing surfaces are touched
- Rollback plan:
  - disable the Telegram bridge env/config,
  - disable the dispatch pilot or remove Linear live binding env/config,
  - verify compatibility payloads fall back to control-core-only behavior.

## Risks & Mitigations
- Authority creep:
  - keep Telegram on existing transport controls and keep Linear recommendation-only.
- Provider replay/auth mismatch:
  - reuse CO request/intent traceability and nonce/idempotency contracts at the adapter edge.
- Active-item identity drift:
  - keep the CO run/task identifier authoritative and attach live Linear metadata as tracked/advisory context only.
- Bot/run coupling:
  - keep 1014 single-run scoped and explicitly defer multi-run/global routing.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
