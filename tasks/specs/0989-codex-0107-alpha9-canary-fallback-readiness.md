---
id: 20260302-0989-codex-0107-alpha9-canary-fallback-readiness
title: Codex 0.107.0-alpha.9 Canary + Fallback Removal Readiness
relates_to: docs/PRD-codex-0107-alpha9-canary-fallback-readiness.md
risk: high
owners:
  - Codex
last_review: 2026-03-02
---

## Summary
- Objective: run a fresh CO-scoped codex canary on `0.107.0-alpha.9` against stable `0.106.0`, then make an explicit fallback removal readiness decision.
- Scope: canary lanes, summary synthesis, and docs/checklist/index updates.
- Constraints: keep fallback behavior unchanged unless criteria are fully met.

## Technical Requirements
- Functional requirements:
  - Execute canary lanes for both channels (run runtime-mode canary before cloud canary commands):
    - runtime-mode canary,
    - required cloud contract,
    - fallback cloud contract,
    - review fallback,
    - unsupported combo fail-fast.
  - Produce `99-summary.json` per channel and combined comparison summary.
  - Record decision in `decision-go-no-go.md` including fallback removal readiness.
- Non-functional requirements (performance, reliability, security):
  - Non-destructive workspace workflow.
  - Reproducible logs and explicit pass/fail outcomes.
- Interfaces / contracts:
  - `npm run ci:cloud-canary`
  - `npm run review -- --runtime-mode appserver --manifest <manifest>`
  - `npx codex-orchestrator start frontend-testing --execution-mode cloud --runtime-mode appserver --format json --no-interactive --task <id>`

## Architecture & Data
- Architecture / design adjustments:
  - No architecture changes expected.
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - Codex CLI npm package (`0.106.0`, `0.107.0-alpha.9`).

## Validation Plan
- Tests / checks:
  - `node scripts/runtime-mode-canary.mjs`
  - `node scripts/delegation-guard.mjs --task 0989-codex-0107-alpha9-canary-fallback-readiness`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run lint`
  - `npm run test`
  - `npm run eval:test` (when fixtures exist)
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `TASK=0989-codex-0107-alpha9-canary-fallback-readiness NOTES="Goal: reviewer hand-off | Summary: alpha.9 parity + hold decisions recorded | Risks: fallback gate contract mismatch remains" npm run review -- --manifest .runs/0989-codex-0107-alpha9-canary-fallback-readiness/cli/2026-03-02T04-30-54-182Z-76ea4048/manifest.json`
- Rollout verification:
  - Compare stable/prerelease summaries and required lane exit codes.
- Monitoring / alerts:
  - Track fallback/error signals in canary outputs and manifest summaries.

## Outcome (2026-03-02)
- Stable/prerelease parity held across required-cloud rerun, review fallback, and unsupported-combo fail-fast lanes.
- Policy fallback gate command (`CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1`) failed for both channels in this run because the current fallback path clears `CODEX_CLOUD_ENV_ID` under `CLOUD_CANARY_EXPECT_FALLBACK=1`; prerelease advancement remains `hold`.
- Fallback removal readiness remains `hold`; keep CLI fallback/break-glass in place.

## Open Questions
- None.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-02.
