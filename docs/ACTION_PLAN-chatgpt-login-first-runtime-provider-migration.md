# ACTION_PLAN - ChatGPT-Login-First Runtime Provider Migration (0981)

## Summary
- Goal: execute W0-W6 runtime migration with docs-first discipline, delegated stream evidence, and operational safety.
- Scope: runtime provider contracts, appserver MVP/fallback, callsite migrations (review/RLM/frontend), observability, validation, and guarded default-flip decision.
- Assumptions: local Codex CLI supports `app-server` and `login status` commands; fallback to CLI runtime remains available as break-glass.

## Milestones & Sequencing
1) Docs-first + registration
- Create PRD + TECH_SPEC + ACTION_PLAN + task checklist mirrors.
- Register task/spec in `tasks/index.json`, add `docs/TASKS.md` snapshot, and update docs freshness registry.
- Capture docs-review manifest before runtime code edits.

2) W0-W1 foundation
- Introduce provider seam/contracts + CLI provider adapter with no behavior change.
- Add runtime mode resolution (flag/env/config precedence) and orthogonality with execution mode.
- Add manifest/status/run-summary runtime observability fields.

3) W2-W4 provider MVP + migrations
- Implement appserver provider preflight/session MVP and deterministic fallback to CLI provider.
- Migrate review path first, then RLM + frontend testing via provider APIs.
- Preserve existing startup-loop/stall/timeout protections and delegation behavior.

4) W5 hardening
- Keep cloud preflight/task execution provider-neutral.
- Enforce fail-fast for unsupported mode combinations.
- Capture canary and fallback evidence for decisioning.

5) W6 decision and cleanup
- If parity/canary evidence is sufficient, flip default runtime mode to appserver.
- Keep `runtimeMode=cli` break-glass and document rollback.
- If evidence is insufficient, record blocked/default-flip deferral with explicit next actions.

## Dependencies
- Existing CLI orchestration runtime services and manifest schema/types.
- `scripts/run-review.ts`, `orchestrator/src/cli/rlmRunner.ts`, `orchestrator/src/cli/frontendTestingRunner.ts`.
- Validation guards and review wrapper flows.

## Validation
- Required gates (ordered):
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` when downstream CLI/package/skills/review-wrapper surfaces are touched.
- Evidence/log path: `out/0981-chatgpt-login-first-runtime-provider-migration/manual/`.
- Rollback plan:
  - Force `runtimeMode=cli` via env/config.
  - Revert default-flip commit only if needed.

## Risks & Mitigations
- Risk: appserver login/preflight instability.
  - Mitigation: deterministic fallback metadata + break-glass CLI runtime.
- Risk: execution/runtime mode conflation.
  - Mitigation: independent parsers, explicit manifest fields, fail-fast unsupported combos.
- Risk: schema drift/regression.
  - Mitigation: additive schema changes, regenerated manifest types, compatibility tests.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-26
