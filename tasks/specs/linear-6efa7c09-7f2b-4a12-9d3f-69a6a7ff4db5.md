---
id: 20260402-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5
title: CO: Deduplicate trailing JSON-tail parsing across child-stream and delegation server
status: in_progress
owner: Codex
created: 2026-04-02
last_review: 2026-04-02
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md
related_action_plan: docs/ACTION_PLAN-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md
related_tasks:
  - tasks/tasks-linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5.md
review_notes:
  - 2026-04-02: Opened from Linear issue `CO-50` in the provider-worker workspace using issue id `6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5`.
  - 2026-04-02: Live `linear issue-context` confirmed the CO workflow states (`Ready`, `In Progress`, `In Review`, `Merging`, `Rework`), showed no attached PR and no existing workpad, and the issue was transitioned from `Ready` to `In Progress` before active coding.
  - 2026-04-02: The workspace started detached at `1f28ecbf5`; branch `linear/co-50-deduplicate-json-tail-parser` was created before repo edits, and the single active workpad comment was created as `0d776a35-2857-4c4a-9542-561c8f58604d`.
  - 2026-04-02: Current code truth matches the issue report: `providerLinearChildStreamShell.ts` owns a strict `parseTrailingJsonObject(...)` helper, while `delegationServer.ts` still carries nearby but separate `parseSpawnOutput(...)` logic.
  - 2026-04-02: Pre-implementation standalone self-review approves the narrow shared-helper plan: extract the parser into a shared utility, keep provider-worker and delegation-server return contracts unchanged, and add focused regression coverage in the two existing seam test files.
  - 2026-04-02: The first audited `docs-review` child run failed immediately because the new CO-50 packet had not yet been added to `docs/docs-freshness-registry.json`; the follow-up registry fix was local to the new packet and did not change implementation scope.
  - 2026-04-02: The rerun succeeded via `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5-co-50-docs-review/cli/2026-04-02T08-32-47-430Z-05430a37/manifest.json`, and `review/telemetry.json` recorded `status: succeeded`, `review_outcome: clean-success`, `termination_boundary: null`.
  - 2026-04-02: A continuation `docs-relevance-advisory` child stream succeeded via `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5-co-50-turn1-scope-check/cli/2026-04-02T12-05-09-295Z-ecebe29f/manifest.json`; its summary was advisory-only (`spec-guard command not found`) and did not block the lane.
  - 2026-04-02: Focused parser regressions passed via `npx vitest run orchestrator/tests/ProviderLinearChildStreamShell.test.ts orchestrator/tests/DelegationServer.test.ts`, and the required validation floor passed through `npm run pack:smoke`.
  - 2026-04-02: `npm run test` exited cleanly after a patience-first late-tail watch. The previously recorded "hang" was a false diagnosis caused by silent late-suite files; `tests/run-review.spec.ts` completed in `338818ms`, `tests/cli-command-surface.spec.ts` completed in `376754ms`, and Vitest reported `306` passing files / `2802` passing tests in `378.25s`.
  - 2026-04-02: Manifest-backed standalone review completed with `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5/cli/2026-04-02T12-02-41-663Z-eca2eae2/review/telemetry.json` reporting `status: succeeded`, `review_outcome: bounded-success`, and `termination_boundary.kind: relevant-reinspection-dwell`; no concrete findings were recorded before the wrapper's bounded dwell stop.
---

# Technical Specification

## Context

`CO-37` fixed the provider-worker `linear child-stream` parse seam only, because the review handoff intentionally stayed narrow. That left `providerLinearChildStreamShell.ts` with a local trailing-JSON helper while `delegationServer.ts` retained similar spawn-output parsing logic. The follow-up issue is therefore not about new behavior in either product surface. It is about preventing parser drift by moving the common trailing JSON-tail extraction into one shared helper while preserving the current fail-closed contract.

## Requirements

1. Extract the trailing JSON object parsing flow into a shared helper used by both `providerLinearChildStreamShell.ts` and `delegationServer.ts`.
2. Preserve fail-closed behavior:
   - object-only parse
   - trailing `}` guard
   - full-string parse first
   - line-suffix scan for the final JSON object only if the full-string parse fails
3. Keep the provider-worker `parseProviderChildRunResult(...)` contract unchanged: successful parse still feeds the current child-run normalization and path confinement logic, and failed parse still returns `null`.
4. Keep the delegation-server `parseSpawnOutput(...)` contract unchanged: successful parse still returns a `Record<string, unknown>`, and failed parse still returns `{}`.
5. Add or update focused regression coverage so both seams prove:
   - success with prelude logs before a valid final JSON object
   - fail-closed handling for malformed or truncated output
6. Stay bounded to the parser extraction, the two call sites, tests, and truthful docs/task updates.

## Planned Interaction Contract

- Shared helper contract:
  - input: raw stdout string
  - output: `Record<string, unknown> | null`
  - behavior:
    - trim input
    - reject immediately when the trimmed output does not end with `}`
    - try parsing the full trimmed string first
    - if that fails, scan suffixes that begin on lines whose trimmed content starts with `{`
    - return the first successfully parsed object suffix, else `null`
- Call-site adaptations:
  - provider-worker child-stream keeps `null` as parse failure
  - delegation-server spawn parsing converts `null` to `{}` to preserve its current outer contract

## Pre-change Baseline

- `orchestrator/src/cli/providerLinearChildStreamShell.ts` already uses `parseTrailingJsonObject(...)` and therefore enforces the trailing-tail posture expected by the issue acceptance criteria.
- `orchestrator/src/cli/delegationServer.ts` still uses local `safeJsonParse(...)` plus `parseSpawnOutput(...)` logic, which is similar but not sourced from the same helper.
- `orchestrator/tests/ProviderLinearChildStreamShell.test.ts` already covers:
  - valid trailing child-run JSON after prelude logs
  - malformed final JSON failure
- `orchestrator/tests/DelegationServer.test.ts` currently covers success extraction after prelude logs, but not the malformed-output failure case required by this issue.

## Validation Plan

- audited `linear child-stream --pipeline docs-review` before implementation
- focused `ProviderLinearChildStreamShell.test.ts` coverage for prelude-log success and malformed-output failure
- focused `DelegationServer.test.ts` coverage for prelude-log success and malformed-output failure
- required repo validation floor after implementation
- manifest-backed standalone review plus explicit elegance/minimality pass before review handoff

## Manifest Evidence

- Workpad comment: `0d776a35-2857-4c4a-9542-561c8f58604d`
- Docs-review manifest: `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5-co-50-docs-review/cli/2026-04-02T08-32-47-430Z-05430a37/manifest.json`
- Docs-review telemetry: `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5-co-50-docs-review/cli/2026-04-02T08-32-47-430Z-05430a37/review/telemetry.json`
- Continuation advisory manifest: `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5-co-50-turn1-scope-check/cli/2026-04-02T12-05-09-295Z-ecebe29f/manifest.json`
- Standalone review telemetry: `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5/cli/2026-04-02T12-02-41-663Z-eca2eae2/review/telemetry.json`
- Elegance review refresh note: `out/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5/manual/20260402T122300Z-elegance-review-refresh/00-elegance-review.md`
- Source issue:
  - `CO-37` / `97aef5e3-dadb-4909-9b00-68c698f10f93`
- Source PR:
  - `#325`
