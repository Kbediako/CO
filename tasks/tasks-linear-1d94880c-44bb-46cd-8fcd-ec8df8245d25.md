# Task Checklist - linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25

- Linear Issue: `CO-177` / `1d94880c-44bb-46cd-8fcd-ec8df8245d25`
- MCP Task ID: `linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25`
- Primary PRD: `docs/PRD-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`
- TECH_SPEC: `tasks/specs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`

## Docs
- [x] Rework reset completed: previous PR `#474` closed, old workpad removed, branch recreated from `origin/main` at `080f372ac`, and replacement workpad created. Evidence: Linear workpad `a80d573b-b97b-4c75-83e2-0ae528cff4e3`.
- [x] Required active-turn parallelization decision recorded for the reset turn. Evidence: `forbid_parallel` / `parent_only_mutation` because PR closure, workpad deletion, and branch reset are parent-owned mutations.
- [x] Issue-quality review captured in the canonical spec. Evidence: `tasks/specs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`.
- [x] Docs packet registered in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Audited docs-review completed before implementation. Evidence: `.runs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-co-177-docs-review-r2/cli/2026-04-14T05-20-05-166Z-23f9d876/manifest.json`; review telemetry `status=succeeded`, `review_outcome=clean-success`.

## Implementation
- [x] Read-only gauge/eval command consumes existing local artifacts and sanitized fixtures without live polling.
- [x] Gauge JSON emits claim queue age, last successful refresh age, polling health, claim-to-start latency, start-to-first-heartbeat latency, active heartbeat age, terminal reconciliation lag, retry/backoff age, child-lane-cap pressure, and stale-source verdict.
- [x] Overall/component verdicts distinguish `healthy`, `degraded`, `stale`, `contradictory`, and `unknown`.
- [x] Operator documentation explains interpretation and artifact citation paths.

## Validation
- [x] Sanitized healthy/degraded fixtures include stale refresh, missing refresh timestamps, active manifest with stale proof, terminal proof with active claim, low Linear headroom, missing budget suppression, stale retry queue, child-lane cap pressure, stale refresh with a recent intake write, nested status Linear budget, retry claims tied to terminal failed runs, stale last-success with failed polling completion, missing active worker proof evidence, worker-audit-only and manifest-only auxiliary evidence, timestamp-less artifact tie-breaks, and duplicate run-id manifest freshness selection.
- [x] Focused parser/evaluator/CLI tests pass on the Rework branch. Evidence: `npx vitest run orchestrator/tests/ProviderControlHostFreshnessGauge.test.ts` passed 35 tests; CLI smoke returned healthy strict exit `0`, contradictory strict exit `1`, missing refresh timestamp `unknown`, missing budget suppression `healthy`, manifest-only `unknown`, and child-lane cap pressure `degraded`.
- [x] Required validation floor passes on the Rework branch. Evidence: `npx tsc -p tsconfig.build.json --noEmit --pretty false`, `npm run build`, `npm run lint`, `npm run test` (340 files / 3865 tests), `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `DIFF_BUDGET_OVERRIDE_REASON=... node scripts/diff-budget.mjs`, and `npm run pack:smoke`.
- [x] Manifest-backed standalone review and explicit elegance/minimality pass complete before the new review handoff. Evidence: review telemetry `status=succeeded`, `review_outcome=bounded-success`, `termination_boundary.kind=command-intent`; saved output has no formal `[P]` findings after the final P2 fixes. Manual elegance pass retained the narrow evaluator/helper/test fixture changes without added abstraction.

## Handoff
- [x] New PR opened and attached to the Linear issue before review-state transition. Evidence: PR `#477` (`linear/co-177-provider-control-freshness-gauge-rework-20260414`) attached to CO-177; previous PR `#474` is closed as part of the Rework reset.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: branch is based on current `origin/main` `080f372ac` before the final review handoff.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` or explicit waiver with evidence.
- [ ] Workpad refreshed with final validation/review status before `In Review`.

## Progress Log
- 2026-04-14: Rework reset completed from current issue state: closed PR `#474`, deleted old workpad, created fresh branch `linear/co-177-provider-control-freshness-gauge-rework-20260414` from `origin/main` at `080f372ac`, created replacement workpad `a80d573b-b97b-4c75-83e2-0ae528cff4e3`, and recorded the required `forbid_parallel` / `parent_only_mutation` decision for parent-owned reset work.
- 2026-04-14: Replayed only CO-177-scoped docs, evaluator, CLI shell, fixtures, and tests from the closed attempt onto the fresh branch; preserved current-main CO-179 docs and CO STATUS attach/supervision changes.
- 2026-04-14: Committed the fresh Rework implementation, reran the full local validation floor, and confirmed `npm run test` passes after the commit removed the review-wrapper large-uncommitted-scope test interference.
- 2026-04-14: Opened parent lane, created docs-first packet, recorded required `parallelize_now` decision, and launched child lane `fixture-contract-scout` with file scope `out/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25/fixture-contract-scout.md`.
- 2026-04-14: Repaired the `docs/TASKS.md` line-budget failure with `npm run docs:archive-tasks` (`451 -> 450` lines), reran audited docs-review, and recorded clean docs-review evidence before implementation.
- 2026-04-14: Implemented the read-only gauge command, audit JSONL parsing, fixtures, operator docs, and focused tests.
- 2026-04-14: Committed `454c4f4f3` and reran the full required validation floor from a clean tree; standalone review execution failed only the bounded command-intent wrapper boundary after attempting a validation suite, then manual review/elegance fallback found no blocking findings.
- 2026-04-14: Addressed PR review feedback by requiring `run_id` before terminal-proof/active-claim contradiction matching and by choosing the newest proof Linear budget snapshot; added focused regressions and reran the required local validation floor.
- 2026-04-14: Addressed final Codex review feedback by preserving contradictory terminal proof/active claim verdicts even when sanitized terminal artifacts omit timestamps; added a focused regression and reran build, lint, focused gauge tests, TypeScript, and the full test suite.
- 2026-04-14: Addressed follow-up Codex review feedback by matching proof manifests by `run_id` for explicit path layouts and excluding terminal proofs from child-lane cap pressure; added focused regressions and reran build, lint, focused gauge tests, TypeScript, and the full test suite.
- 2026-04-14: Addressed CodeRabbit artifact-root validation feedback by rejecting file paths passed to `--artifact-root` / `--run-dir`; added a focused CLI regression and reran build, lint, focused gauge tests, TypeScript, and the full test suite.
- 2026-04-14: Merged latest `origin/main` into the branch after GitHub marked the PR behind; reran build, lint, and full tests on the merged branch.
- 2026-04-14: Addressed standalone-review P2 findings by excluding intake top-level `updated_at` from refresh-success candidates, selecting nested `rate_limits.linear_budget` from combined CO STATUS datasets, and excluding retry states from active/queued claim checks while keeping retry/backoff metrics; reran focused gauge tests, TypeScript, build, lint, full tests, guards, docs checks, stewardship, diff budget, and pack smoke.
- 2026-04-14: Addressed follow-up standalone-review P2 findings by rejecting failed polling completions as successful refresh evidence and reporting `unknown` when a running intake claim lacks matching active worker proof; added focused regressions and reran focused gauge tests, TypeScript, build, lint, full tests, guards, docs checks, stewardship, diff budget, and pack smoke.
- 2026-04-14: Reran manifest-backed standalone review after final P2 fixes; wrapper completed with `review_outcome=bounded-success` via `command-intent` retry boundary and no formal actionable findings in the saved output. Manual elegance pass kept the final changes narrow.
- 2026-04-14: Addressed final CodeRabbit minor feedback by simplifying `readState`; verified the existing invalid-`--now` regression and unknown/start-to-heartbeat threads as already fixed; reran focused gauge tests, TypeScript, build, lint, and the full test suite.
- 2026-04-14: Addressed final Codex P2 feedback by requiring at least one core freshness source before healthy verdicts and selecting timestamp-less artifacts deterministically by path; added focused regressions and reran focused gauge tests, TypeScript, build, lint, and the full test suite.
- 2026-04-14: Addressed follow-up Codex P2 feedback by selecting duplicate run-id manifests by freshness with a stable path tie-break for proof matching and claim latency; added a focused regression and reran focused gauge tests, TypeScript/build, lint, full tests, and docs:check.
- 2026-04-14: Addressed the latest manifest-backed standalone-review P2 findings by counting pending child lanes until parent acceptance/rejection/invalidation and by treating provider manifests as auxiliary evidence rather than core freshness sources; added manifest-only regression coverage and reran focused gauge tests, TypeScript, build, lint, full tests, guards, docs checks, stewardship, diff budget, pack smoke, and CLI smokes.
- 2026-04-14: Addressed the next manifest-backed standalone-review P2 findings by making missing refresh timestamps an explicit `unknown` finding and by treating absent Linear budget `suppression` as neutral instead of suppressed; added focused fixtures/regressions and reran focused gauge tests, TypeScript, build, lint, full tests, guards, docs checks, stewardship, diff budget, pack smoke, and CLI smokes.
- 2026-04-14: Reran manifest-backed standalone review after the final P2 fixes; wrapper completed with `review_outcome=bounded-success` via command-intent retry, and the saved output contains no formal `[P]` findings after the fix set. Manual elegance pass kept the solution limited to evaluator predicates, source provenance, and focused fixtures.
- 2026-04-14: Addressed PR feedback by preferring proof attempt/current-turn start timestamps before manifest `started_at` for start-to-heartbeat latency, added resumed-attempt regression coverage, and aligned the handoff checklist with PR `#477` attachment plus current `origin/main` evidence.

## Relevant Files
- `docs/PRD-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`
- `tasks/specs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`
- `docs/ACTION_PLAN-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`
- `docs/guides/provider-control-host-freshness-gauge.md`
- `orchestrator/src/cli/control/providerControlHostFreshnessGauge.ts`
- `orchestrator/src/cli/controlHostFreshnessGaugeCliShell.ts`
- `orchestrator/tests/ProviderControlHostFreshnessGauge.test.ts`
- `orchestrator/tests/fixtures/provider-control-host-freshness/`
- `tasks/index.json`
- `.agent/task/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md`

## Notes
- Intent checksum / parity matrix status: carried in PRD and canonical spec.
- Approvals needed before handoff: fresh validation, standalone review, elegance pass, PR attachment, feedback sweep, and ready-review drain.
- Historical subagent usage from the closed attempt: `linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-fixture-contract-scout` child lane launched under the same issue, completed successfully, then was rejected as empty/no usable report.
