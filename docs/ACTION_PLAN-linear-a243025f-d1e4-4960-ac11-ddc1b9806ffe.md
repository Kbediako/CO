# ACTION_PLAN - CO-462 run-review override-prefixed mock cleanup

## Summary
- Goal: ensure run-review test cleanup terminates fake Codex review mocks when config overrides precede the `review` subcommand.
- Scope: docs-first packet, focused test helper/regression, focused validation, process-health proof, workpad/review/PR handoff.
- Assumptions:
  - `tests/run-review.spec.ts` owns the current cleanup helper
  - direct `codex-mock.sh review` behavior from CO-205 remains valid
  - the new variant is command-shape matching, not provider-worker admission

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `run-review`, `tests/run-review.spec.ts`, `codex-mock.sh`, `-c mcp_servers.delegation.enabled=true review`, `process-health checks`, `CO-205`.
- Not done if:
  - override-prefixed mocks are not covered
  - exact-path cleanup broadens to unrelated user processes
  - process-health evidence is missing
  - implementation drifts into provider-worker admission or queue recovery
- Pre-implementation issue-quality review: 2026-05-05 provider worker confirmed a bounded CO-205 follow-up variant after live Linear `issue-context`.
- Fallback / refactor decision: this touches a process cleanup seam; remove the direct-only matching gap and retain exact fake-binary cleanup as supported test-harness safety behavior.
- Durable retention evidence: exact fake-binary cleanup remains covered by focused tests and exists only for sandbox fake Codex review processes.
- Large-refactor check: no larger process-supervisor refactor is needed for this single command-shape gap.

## Milestones & Sequencing
1. Register docs-first packet and task mirrors for CO-462.
2. Run pre-implementation docs-review child stream.
3. Inspect current cleanup helper and focused CO-205 regression.
4. Add override-prefixed fake Codex review cleanup regression.
5. Implement the smallest matching change that preserves strict cleanup scope.
6. Run focused validation and passive process-health scan.
7. Run required guard/review/elegance gates, update workpad, then create/attach PR for review handoff.

## Dependencies
- `tests/run-review.spec.ts`
- CO-205 docs/test context
- local `ps` process inspection
- Linear workpad and provider-worker review handoff helpers

## Validation
- Checks / tests:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - docs-review child stream before implementation
  - focused `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts`
  - `node scripts/spec-guard.mjs --dry-run`
  - passive process-health scan for `codex-mock.sh` / `run-review`
  - standalone review and elegance pass before review handoff
- Rollback plan:
  - revert helper/regression together if matching becomes broader than exact sandbox fake-binary review commands
  - leave docs packet only if it still truthfully captures the narrower follow-up issue

## Risks & Mitigations
- Risk: process matching overreaches and kills unrelated user commands.
  - Mitigation: keep exact binary path plus recognized config override flags and a `review` subcommand requirement.
- Risk: regression becomes flaky because process cleanup races.
  - Mitigation: reuse existing polling/reap helper constants and existing CO-205 cleanup pattern.
- Risk: implementation broadens into provider-worker process health.
  - Mitigation: preserve provider/Linear surfaces as explicit non-goals.

## Approvals
- Docs-first packet: provider worker, 2026-05-05, produced; docs-review child stream completed `status=succeeded`, `review_outcome=clean-success`.
- Implementation review: codex-orchestrator review, 2026-05-05, completed `status=succeeded`, `review_outcome=bounded-success`; explicit elegance pass completed with no change.
