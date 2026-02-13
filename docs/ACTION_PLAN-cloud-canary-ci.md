# ACTION_PLAN - Cloud Execution Canary CI Coverage (0958)

## Summary
- Goal: Introduce CI canary coverage for cloud execution mode with clear evidence and diagnostics.
- Scope: Workflow wiring, manifest assertions, and rollout policy.
- Assumptions: CI environment can provide cloud credentials for canary runs (or explicit credential-gated behavior is accepted).

## Milestones and Sequencing
1) Docs-first and task scaffolding
- PRD + TECH_SPEC + ACTION_PLAN + checklist mirrors.

2) Canary workflow integration
- Add cloud canary job/path and ensure non-interactive execution.

3) Assertion and diagnostics hardening
- Validate manifest/run-summary fields and improve operator-facing failure output.

4) Validation and handoff
- Run guardrails, capture evidence, and document policy decisions.

## Dependencies
- CI credential management for cloud access.
- Existing orchestrator cloud execution wiring and manifest schema.

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
- Rollback plan:
  - Disable canary gate path while retaining local/core lane behavior if instability appears.

## Risks and Mitigations
- Risk: CI credentials unavailable or flaky.
  - Mitigation: credential-gated path with explicit status and guidance.
- Risk: Cloud canary introduces noisy failures.
  - Mitigation: bounded retries, scoped assertions, and concise diagnostics.

## Evidence
- Planning scout / delegation: `.runs/0958-cloud-canary-ci-scout/cli/2026-02-13T12-05-36-992Z-d291cfe9/manifest.json`
- Docs-review (pre-implementation): `.runs/0958-cloud-canary-ci/cli/2026-02-13T12-07-32-909Z-8cf7dbba/manifest.json`
- Implementation-gate: `.runs/0958-cloud-canary-ci/cli/2026-02-13T13-09-22-859Z-a9289881/manifest.json`
- Cloud canary pass with branch pinning: `.runs/0958-cloud-canary-ci-local8/cli/2026-02-13T12-32-10-598Z-8519cfd2/manifest.json`

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-13
