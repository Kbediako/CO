# ACTION_PLAN - Release + Cloud + RLM Hardening (0962)

## Summary
- Goal: Ship approved high-impact reliability and workflow improvements with minimal friction.
- Scope: docs-first scaffolding, CI/workflow hardening, symbolic/runtime/test updates, process docs updates, validation + review.
- Assumptions: existing release and cloud canary lanes stay in place; this is hardening, not replacement.

## Milestones and Sequencing
1) Docs-first setup and mirrors (`PRD`, `TECH_SPEC`, `ACTION_PLAN`, task checklist, index entries).
2) Delegation scout evidence + docs-review manifest capture before implementation.
3) CI hardening updates (`release.yml`, `cloud-canary.yml`, `cloud-canary-ci.mjs`) with explicit release acceptance checks:
   - canonical tag resolution for push/manual triggers
   - manual dispatch validation for non-tag refs
   - signed/lightweight tag enforcement
   - prerelease dist-tag mapping away from `latest`
4) Runtime/test updates (`symbolic` deliberation logging gate, `rlmRunner` logger cleanup, test coverage updates).
5) Workflow/docs ergonomics updates (micro-task path + downstream skills release/install guidance).
6) Guardrail validation, standalone elegance review, PR open/poll/merge.

## Dependencies
- Existing release workflow + npm publishing permissions.
- Existing cloud canary CI lane and Codex CLI availability.

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
  - Revert the task branch; no irreversible data migrations.

## Risks and Mitigations
- Risk: release guard changes block valid legacy flows.
  - Mitigation: keep push-tag flow unchanged and add explicit manual dispatch guidance.
- Risk: deliberation artifact logging toggle reduces debugging visibility.
  - Mitigation: provide explicit env knob and keep summary metrics in state.
- Risk: docs/process updates add confusion.
  - Mitigation: centralize guidance in `docs/AGENTS.md` and dedicated docs pages.

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-14
