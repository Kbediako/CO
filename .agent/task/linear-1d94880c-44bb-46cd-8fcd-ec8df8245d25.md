# Task Checklist - linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25

- Linear Issue: `CO-177` / `1d94880c-44bb-46cd-8fcd-ec8df8245d25`
- MCP Task ID: `linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25`
- Primary PRD: `docs/PRD-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`
- TECH_SPEC: `tasks/specs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`

## Docs
- [x] Live issue context inspected, issue moved `Ready` -> `In Progress`, one workpad created, `parallelize_now` recorded, and `fixture-contract-scout` child lane launched/completed/rejected. Evidence: Linear workpad `2e886b80-6fd6-46d9-9a0c-883b40c5011b`; child lane manifest `.runs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-fixture-contract-scout/cli/2026-04-14T05-09-39-568Z-2cf54703/manifest.json`.
- [x] Issue-quality review captured in the canonical spec. Evidence: `tasks/specs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`.
- [x] Docs packet registered in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Audited docs-review completed before implementation. Evidence: `.runs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-co-177-docs-review-r2/cli/2026-04-14T05-20-05-166Z-23f9d876/manifest.json`; review telemetry `status=succeeded`, `review_outcome=clean-success`.

## Implementation
- [x] Read-only gauge/eval command consumes existing local artifacts and sanitized fixtures without live polling.
- [x] Gauge JSON emits claim queue age, last successful refresh age, polling health, claim-to-start latency, start-to-first-heartbeat latency, active heartbeat age, terminal reconciliation lag, retry/backoff age, child-lane-cap pressure, and stale-source verdict.
- [x] Overall/component verdicts distinguish `healthy`, `degraded`, `stale`, `contradictory`, and `unknown`.
- [x] Operator documentation explains interpretation and artifact citation paths.

## Validation
- [x] Sanitized healthy/degraded fixtures include stale refresh, active manifest with stale proof, terminal proof with active claim, low Linear headroom, stale retry queue, child-lane cap pressure, stale refresh with a recent intake write, nested status Linear budget, retry claims tied to terminal failed runs, stale last-success with failed polling completion, and missing active worker proof evidence.
- [x] Focused parser/evaluator/CLI tests pass. Evidence: `npx vitest run orchestrator/tests/ProviderControlHostFreshnessGauge.test.ts` passed 28 tests; strict CLI healthy exit `0`; strict CLI contradictory exit `1`.
- [x] Required validation floor passed after the latest missing-evidence P2 review fixes: `npx tsc -p tsconfig.build.json --noEmit --pretty false`, `npm run build`, `npm run lint`, `npm run test` (340 files / 3849 tests), `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `DIFF_BUDGET_OVERRIDE_REASON=... node scripts/diff-budget.mjs`, and `npm run pack:smoke`.
- [x] Manifest-backed standalone review rerun after final P2 fixes. Evidence: `.runs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25/cli/2026-04-14T07-50-37-426Z-aadb2487/review/telemetry.json` reported `status=succeeded`, `review_outcome=bounded-success`, and `termination_boundary.kind=command-intent`; saved output contained no formal actionable P0-P3 findings.
- [x] Final elegance/minimality pass completed after the review rerun. Evidence: final missing-evidence fixes stayed local to refresh/proof evaluation and focused fixtures; no avoidable abstraction or unrelated scope kept.
- [x] Final PR feedback cleanup passed local validation. Evidence: CodeRabbit `readState` simplification applied without behavior change; invalid `--now` strictness was already present and covered; `npx vitest run orchestrator/tests/ProviderControlHostFreshnessGauge.test.ts`, `npx tsc -p tsconfig.build.json --noEmit --pretty false`, `npm run build`, `npm run lint`, and `npm run test` (340 files / 3849 tests) passed.

## Handoff
- [x] PR attached to the Linear issue before review-state transition. Evidence: PR #474 / Linear attachment `59ef361b-66f7-4b56-99d1-2c0ffb52c36b`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: `git fetch origin refs/heads/main:refs/remotes/origin/main && git merge --ff-only origin/main` returned `Already up to date`.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` or explicit waiver with evidence.
- [ ] Workpad refreshed with final validation/review status before `In Review`.

## Progress Log
- 2026-04-14: Opened parent lane, created docs-first packet, recorded required `parallelize_now` decision, and launched child lane `fixture-contract-scout` with file scope `out/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25/fixture-contract-scout.md`.
- 2026-04-14: Repaired the `docs/TASKS.md` line-budget failure with `npm run docs:archive-tasks` (`451 -> 450` lines), reran audited docs-review, and recorded clean docs-review evidence before implementation.
- 2026-04-14: Implemented the read-only gauge command, audit JSONL parsing, fixtures, operator docs, and focused tests.
- 2026-04-14: Committed `454c4f4f3` and reran the full required validation floor from a clean tree; standalone review execution failed only the bounded command-intent wrapper boundary after attempting a validation suite, then manual review/elegance fallback found no blocking findings.
- 2026-04-14: Addressed PR review feedback by requiring `run_id` before terminal-proof/active-claim contradiction matching and by choosing the newest proof Linear budget snapshot; added focused regressions and reran the required local validation floor.
- 2026-04-14: Addressed standalone-review P2 findings by excluding intake top-level `updated_at` from refresh-success candidates, selecting nested `rate_limits.linear_budget` from combined CO STATUS datasets, and excluding retry states from active/queued claim checks while keeping retry/backoff metrics; reran focused gauge tests, TypeScript, build, lint, full tests, guards, docs checks, stewardship, diff budget, and pack smoke.
- 2026-04-14: Addressed follow-up standalone-review P2 findings by rejecting failed polling completions as successful refresh evidence and reporting `unknown` when a running intake claim lacks matching active worker proof; added focused regressions and reran focused gauge tests, TypeScript, build, lint, full tests, guards, docs checks, stewardship, diff budget, and pack smoke.
- 2026-04-14: Reran manifest-backed standalone review after final P2 fixes; wrapper completed with `review_outcome=bounded-success` via `command-intent` retry boundary and no formal actionable findings in the saved output. Manual elegance pass kept the final changes narrow.
- 2026-04-14: Addressed final CodeRabbit minor feedback by simplifying `readState`; verified the existing invalid-`--now` regression and unknown/start-to-heartbeat threads as already fixed; reran focused gauge tests, TypeScript, build, lint, and the full test suite.

## Relevant Files
- `docs/PRD-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`
- `docs/TECH_SPEC-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`
- `docs/ACTION_PLAN-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`
- `docs/guides/provider-control-host-freshness-gauge.md`
- `orchestrator/src/cli/control/providerControlHostFreshnessGauge.ts`
- `orchestrator/src/cli/controlHostFreshnessGaugeCliShell.ts`
- `orchestrator/tests/ProviderControlHostFreshnessGauge.test.ts`
- `orchestrator/tests/fixtures/provider-control-host-freshness/`
- `tasks/specs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`
- `tasks/tasks-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`

## Notes
- Intent checksum / parity matrix status: carried in PRD and canonical spec.
- Approvals needed: docs-review before implementation; standalone review plus elegance pass before review handoff.
- Subagent usage: `linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-fixture-contract-scout` child lane launched under the same issue, completed successfully, then was rejected as empty/no usable report.
