---
id: 20260414-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25
title: CO: add provider/control-host throughput and freshness gauge
status: done
owner: Codex
created: 2026-04-14
last_review: 2026-05-16
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md
related_action_plan: docs/ACTION_PLAN-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md
related_tasks:
  - tasks/tasks-linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25.md
review_notes:
  - 2026-04-14: Rework reset closed previous PR `#474`, removed the old workpad, recreated branch `linear/co-177-provider-control-freshness-gauge-rework-20260414` from `origin/main` at `080f372ac`, and created replacement workpad `a80d573b-b97b-4c75-83e2-0ae528cff4e3`.
  - 2026-04-14: Required active-turn parallelization decision for the Rework reset was `forbid_parallel` / `parent_only_mutation`; PR closure, workpad deletion, and branch reset were parent-owned mutations with no safe independent child-lane scope before the fresh baseline existed.
  - 2026-04-14: Live issue context confirmed state `Ready`, team started state `In Progress`, no existing workpad/comments/attachments/PR, then moved the issue to `In Progress`.
  - 2026-04-14: Pre-turn decomposition matrix found safe `fixture-contract-scout`; recorded `parallelize_now` / `independent_scope_available` and launched a bounded child lane for artifact-shape research.
  - 2026-04-14: Child lane `fixture-contract-scout` completed successfully at `.runs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-fixture-contract-scout/cli/2026-04-14T05-09-39-568Z-2cf54703/manifest.json` and was rejected by the parent because it produced an empty patch and no usable report.
  - 2026-04-14: Issue-quality review approved this as a replay-only provider/control-host freshness and throughput gauge; scope explicitly rejects live polling, scheduler redesign, CO-176 duplication, and CO-156 request-headroom gate duplication.
  - 2026-04-14: Audited docs-review rerun passed after the supported `npm run docs:archive-tasks` line-budget repair; evidence `.runs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-co-177-docs-review-r2/cli/2026-04-14T05-20-05-166Z-23f9d876/manifest.json`, review telemetry `status=succeeded`, `review_outcome=clean-success`.
  - 2026-04-14: Required validation floor passed from clean commit `454c4f4f3`; standalone review execution reached `failed-boundary` only because the bounded reviewer launched a validation suite (`command-intent` / `validation-suite`), so parent performed manual correctness and elegance fallback with no blocking findings.
  - 2026-04-14: PR feedback resolved by requiring `run_id` before terminal reconciliation matching and selecting the newest proof-level Linear budget snapshot for fallback headroom checks; focused regressions and full validation floor reran green.
  - 2026-05-16: CO-545 strict spec-guard audit reclassified this stale Apr 14/15 row as inactive done; live `node bin/codex-orchestrator.js linear issue-context --issue-id 1d94880c-44bb-46cd-8fcd-ec8df8245d25 --format json` verified CO-177 is Linear Done/completed. No completed_at was inferred or fabricated.
---

# Technical Specification

## Context

CO provider/control-host health is currently visible only by combining several surfaces: CO STATUS, provider polling health, provider issue observability, Linear shared-budget state, provider manifests/proofs, worker audit JSONL, status snapshots, and run metrics. That is enough for manual diagnosis, but not enough for agents or CI/eval consumers to fail fast when evidence is stale, contradictory, or lagging.

CO-177 adds one read-only gauge over those local artifacts. It must consume existing or sanitized files only, emit machine-readable JSON with source paths, and classify overall health without increasing live Linear/GitHub request volume.

## Requirements

1. Add a read-only gauge/eval command that accepts a local artifact root or explicit artifact paths and emits JSON.
2. Consume existing local artifact families where present:
   - `provider-intake-state.json`
   - provider manifests and provider proofs, including `provider-linear-worker-proof.json`
   - worker audit JSONL
   - control endpoint metadata/status snapshots
   - provider polling health and provider issue observability snapshots
   - Linear shared-budget state
   - retry/backoff queue evidence
   - child-lane ledger/proof records
3. Emit JSON fields for claim queue age, last successful refresh age, polling health, claim-to-start latency, start-to-first-heartbeat latency, active heartbeat age, terminal reconciliation lag, retry/backoff age, child-lane-cap pressure, and stale-source verdict.
4. Distinguish `healthy`, `degraded`, `stale`, `contradictory`, and `unknown` at component and overall levels.
5. Include sanitized fixtures for healthy plus stale refresh, active manifest with stale proof, terminal proof with active claim, low Linear headroom, and stale retry queue.
6. Fail when stale or contradictory control-host/status evidence is rendered healthy, using a deterministic CLI exit behavior for strict checks.
7. Document operator interpretation and the artifact paths agents should cite when reporting a failure.
8. Keep all behavior replay-only; no new live API polling or request-budget consumption.

## Issue-Shaping Contract
- User-request translation carried forward: add a machine-readable provider/control-host throughput and freshness gauge for CO operational health, using existing/sanitized artifacts only.
- Protected terms / exact artifact and surface names: CO STATUS, `provider-intake-state.json`, provider manifests, `provider-linear-worker-proof.json`, worker audit JSONL, control endpoint metadata, provider polling health, provider issue observability, Linear shared-budget state, claim queue age, refresh age, heartbeat age, terminal reconciliation lag, child-lane cap pressure, stale-source verdict.
- Nearby wrong interpretations to reject: existing unit tests or CO STATUS rendering checks are sufficient; provider scheduling should be redesigned; polling should increase; CO-176 provider-adoption evals or CO-156 Linear request-headroom gates should be duplicated.
- Explicit non-goals carried forward: no live polling increase, no provider-adoption eval duplication, no request-headroom gate duplication, no scheduler/child-lane/merge closeout redesign, and no raw private transcript fixtures.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth |
| --- | --- | --- | --- |
| Artifact consumption | Useful evidence exists across multiple local artifacts but must be manually correlated. | The issue requires one replayable gauge. | Gauge discovers/reads local artifacts and emits per-source evidence paths. |
| State vocabulary | Existing surfaces expose statuses but not one unified verdict. | Output must distinguish healthy, stale, contradictory, degraded, and unknown. | Component and overall verdicts use that vocabulary with deterministic precedence. |
| Freshness and throughput fields | Queue, refresh, heartbeat, retry, and reconciliation evidence exists in separate shapes. | Required fields are claim queue age, refresh age, polling health, claim/start/heartbeat latencies, terminal lag, retry age, cap pressure, and stale-source verdict. | JSON includes each field with value, unit, source path, and missing/unknown reason where needed. |
| Failure coverage | Existing tests focus individual behavior. | Required degraded fixtures cover stale refresh, stale proof, terminal proof with active claim, low headroom, and stale retry queue. | Fixture suite proves each case cannot render healthy. |
| Request volume | Local artifacts already record health signals. | No higher-frequency live polling. | Gauge is filesystem-only and safe for CI/eval replay. |

## Readiness Gate
- Not done if: the gauge is static-only, lacks state distinctions, fails to catch stale/contradictory cases, adds polling, lacks JSON consumers, or lacks operator citation docs.
- Pre-implementation issue-quality review evidence: approved on 2026-04-14 after live issue-context and workpad bootstrap. The issue is not plausibly narrower than the request because it includes artifact replay, JSON output fields, degraded fixtures, strict failure behavior, and operator docs.
- Safeguard ownership split: parent owns docs, implementation, tests, Linear mutation, and final review. Historical child lane `fixture-contract-scout` owned only `out/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25/fixture-contract-scout.md` and was rejected as empty/no usable report before the Rework reset.

## Technical Requirements
- Functional: parse artifact timestamps/statuses, compute ages/latencies relative to a deterministic `--now` when supplied, classify component health, compute overall verdict, print JSON, and support strict failure for stale/contradictory verdicts.
- Non-functional: deterministic replay, sanitized fixture support, clear source-path provenance, no network/API calls, tolerant optional artifact handling, and focused tests for degraded cases.
- Interfaces / contracts: `codex-orchestrator control-host freshness-gauge --artifact-root <path> --format json [--strict]`; one reusable evaluator module; fixture test helpers; operator docs section with citation map.

## Architecture & Data
- Architecture / design adjustments: add a small artifact reader plus evaluator. Keep data extraction separate from verdict precedence, so tests can cover both parser and classification behavior.
- Data model changes / migrations: none. The gauge reads existing artifacts and sanitized fixtures only.
- External dependencies / integrations: none beyond Node filesystem and existing repo CLI/test tooling.

## Validation Plan
- Tests / checks:
  - focused unit tests for parser/evaluator and fixture verdicts
  - CLI fixture smoke proving JSON fields and strict non-zero behavior
  - required repo validation floor before review handoff
  - manifest-backed standalone review and explicit elegance pass
- Rollout verification: run the gauge against sanitized fixtures and, where safe, the workspace `.runs` artifact root; record output paths in the task checklist/workpad.
- Monitoring / alerts: future CO STATUS/eval dashboards can consume the JSON output; this lane only documents that integration path and does not wire a live dashboard.

## Open Questions
- None blocking. Thresholds should be conservative defaults with CLI overrides only where they improve fixture determinism and operator replay.

## Approvals
- Reviewer: docs-review child stream `linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-co-177-docs-review-r2`
- Date: 2026-04-14
- Evidence: `.runs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-co-177-docs-review-r2/cli/2026-04-14T05-20-05-166Z-23f9d876/manifest.json`; review telemetry `status=succeeded`, `review_outcome=clean-success`
