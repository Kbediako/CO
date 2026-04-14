# ACTION_PLAN - CO: add provider/control-host throughput and freshness gauge

## Summary
- Goal: add a read-only provider/control-host throughput and freshness gauge that replays existing local/sanitized artifacts and classifies stale, degraded, contradictory, unknown, and healthy evidence.
- Scope: docs-first packet, one Linear workpad, required same-issue child-lane research, parser/evaluator command, sanitized fixtures, regression tests, operator docs, validation, review, elegance, PR attachment, and review drain.
- Assumptions:
  - Existing provider/control-host artifacts already carry enough timestamps and statuses for the requested freshness/throughput fields.
  - Missing optional artifact classes should be explicit `unknown` sources, while stale/contradictory evidence must dominate the verdict.
  - This lane stays read-only and does not increase Linear/GitHub polling.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve CO STATUS, `provider-intake-state.json`, provider manifests, `provider-linear-worker-proof.json`, worker audit JSONL, control endpoint metadata, provider polling health, provider issue observability, Linear shared-budget state, claim queue age, refresh age, heartbeat age, terminal reconciliation lag, child-lane cap pressure, stale-source verdict, and replay-only local artifacts.
- Not done if: the gauge checks only static paths, cannot distinguish healthy/stale/contradictory/degraded/unknown states, renders stale or contradictory evidence healthy, adds live polling, duplicates CO-176 or CO-156, or lacks operator citation docs.
- Pre-implementation issue-quality review: approved. The packet preserves the full issue-shaping contract and explicitly rejects narrower status-rendering-only or broader scheduling/redesign interpretations.

## Milestones & Sequencing
1. Completed: Rework reset from the live issue state: close previous PR `#474`, remove the old workpad, create fresh branch `linear/co-177-provider-control-freshness-gauge-rework-20260414` from `origin/main`, create replacement workpad `a80d573b-b97b-4c75-83e2-0ae528cff4e3`, and record `forbid_parallel` / `parent_only_mutation` for the reset turn.
2. Completed: register PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` while preserving current-main CO-179 mirrors.
3. Completed: replay only CO-177-scoped parser/evaluator, CLI shell, fixtures, tests, and operator docs from the closed attempt onto the fresh branch.
4. Next: run focused gauge tests and the required validation floor on the Rework branch.
5. Next: run manifest-backed standalone review, explicit elegance pass, PR creation/attachment, feedback sweep, and `pr ready-review` before `In Review`.

## Dependencies
- Existing provider/control-host artifact formats under `.runs/**`, provider issue observability, provider polling health, Linear budget state, child-lane ledger/proof records, CLI command routing, test fixtures, and docs freshness registry.

## Validation
- Checks / tests:
  - `codex-orchestrator linear child-stream --pipeline docs-review --stream co-177-docs-review --format json`
  - focused gauge parser/evaluator fixture tests
  - direct gauge CLI fixture runs with JSON output and failure behavior
  - required floor: delegation guard, spec guard, build, lint, test, docs check/freshness, repo stewardship, and diff budget
  - `FORCE_CODEX_REVIEW=1 npm run review`
  - `npm run pack:smoke` if CLI/package/skills/review-wrapper surfaces are touched
- Rollback plan:
  - revert the gauge command/parser/tests/docs packet together. No live control-host/provider state migration should be required because the feature is replay-only.

## Risks & Mitigations
- Artifact drift: keep parsers permissive for optional fields, emit source-level `unknown`, and test degraded/contradictory fixtures.
- False healthy verdicts: make stale/contradictory findings dominate the overall verdict and add fixture regressions for each required false-healthy case.
- Polling creep: keep the command filesystem-only and document that live API refresh belongs out of scope.

## Approvals
- Reviewer: docs-review child stream `linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-co-177-docs-review-r2`
- Date: 2026-04-14
- Evidence: `.runs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-co-177-docs-review-r2/cli/2026-04-14T05-20-05-166Z-23f9d876/manifest.json`; review telemetry `status=succeeded`, `review_outcome=clean-success`
