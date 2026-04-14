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
- [x] Sanitized healthy/degraded fixtures include stale refresh, active manifest with stale proof, terminal proof with active claim, low Linear headroom, and stale retry queue.
- [x] Focused parser/evaluator/CLI tests pass. Evidence: `npm run test:orchestrator -- orchestrator/tests/ProviderControlHostFreshnessGauge.test.ts`; strict CLI healthy exit `0`; strict CLI contradictory exit `1`.
- [ ] Required validation floor passes or has explicit bounded fallback evidence: delegation guard, spec guard, build, lint, test, docs check/freshness, repo stewardship, diff budget, standalone review, elegance pass, and pack smoke if required.

## Handoff
- [ ] PR attached to the Linear issue before review-state transition.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` or explicit waiver with evidence.
- [ ] Workpad refreshed with final validation/review status before `In Review`.

## Progress Log
- 2026-04-14: Opened parent lane, created docs-first packet, recorded required `parallelize_now` decision, and launched child lane `fixture-contract-scout` with file scope `out/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25/fixture-contract-scout.md`.
- 2026-04-14: Repaired the `docs/TASKS.md` line-budget failure with `npm run docs:archive-tasks` (`451 -> 450` lines), reran audited docs-review, and recorded clean docs-review evidence before implementation.
- 2026-04-14: Implemented the read-only gauge command, audit JSONL parsing, fixtures, operator docs, and focused tests.

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
