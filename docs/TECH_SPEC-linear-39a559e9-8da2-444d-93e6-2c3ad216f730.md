---
id: 20260421-linear-39a559e9-8da2-444d-93e6-2c3ad216f730
title: CO STATUS observability recover direct co-status json current endpoint timeout
relates_to: docs/PRD-linear-39a559e9-8da2-444d-93e6-2c3ad216f730.md
risk: high
owners:
  - Codex
last_review: 2026-04-21
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-39a559e9-8da2-444d-93e6-2c3ad216f730.md`
- PRD: `docs/PRD-linear-39a559e9-8da2-444d-93e6-2c3ad216f730.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-39a559e9-8da2-444d-93e6-2c3ad216f730.md`
- Task checklist: `tasks/tasks-linear-39a559e9-8da2-444d-93e6-2c3ad216f730.md`

## Traceability
- Linear issue: `CO-296` / `39a559e9-8da2-444d-93e6-2c3ad216f730`
- Linear URL: https://linear.app/asabeko/issue/CO-296/co-status-observability-recover-direct-co-status-format-json-when
- Source anchor: `ctx:sha256:19f75315765e156751acd52be9fc6dbabd7288795c4a9a58e685bb892d5ca5e0#chunk:c000001`
- Parent provider-worker manifest: `../../.runs/linear-39a559e9-8da2-444d-93e6-2c3ad216f730/cli/2026-04-21T18-54-09-717Z-7a8c49bd/manifest.json`
- Live issue-context read: `CO-296` / `39a559e9-8da2-444d-93e6-2c3ad216f730` was rechecked before moving from `Ready` to `In Progress`; the exact issue wording is carried by the worker prompt and source anchor above.

## Summary
- Objective: recover or truthfully classify direct `co-status --format json` failures when the current resolved `/ui/data.json` endpoint hangs on an otherwise healthy control-host.
- Scope:
  - same-endpoint `/ui/data.json` timeout handling on the direct JSON path
  - preservation of `CO-246` stale/dead endpoint recovery semantics
  - focused regression coverage for current-endpoint timeout behavior
  - explicit boundaries against `CO-179` attach restart/rotation and `CO-211` refresh-stuck churn
- Constraints:
  - no redesign of attach mode, queue truth, provider intake, or selected-run projection
  - no suppression of genuine host-health alarms
  - no high-frequency polling loop or request-burn workaround

## Issue-Shaping Contract
- User-request translation carried forward: this lane owns current resolved `/ui/data.json` same-endpoint hangs/timeouts for direct `co-status --format json` when local host evidence remains healthy. It is not the stale/dead endpoint `ECONNREFUSED` recovery lane (`CO-246`), not the attach restart/rotation lane (`CO-179`), and not refresh-stuck / `restart_required` churn (`CO-211`).
- Protected terms / exact artifact and surface names:
  - `co-status --format json`
  - current resolved `/ui/data.json`
  - healthy control-host
  - 15s attach timeout budget
  - same-endpoint hang / timeout
  - bounded recovery or truthful classification
  - `control-host ui request timeout after 15000ms`
  - `stuck=false`
  - `restart_required=false`
  - `coStatusCliShell.ts`
  - `coStatusAttachCliShell.ts`
  - `readUiDatasetWithEndpointRecovery`
  - `fetchUiDataset`
  - `resolveAttachTarget`
  - `CoStatusCliShell.test.ts`
- Nearby wrong interpretations to reject:
  - stale/dead-endpoint-only `ECONNREFUSED` recovery
  - attach-session restart/rotation recovery
  - generic refresh-stuck / restart-required host failure
  - suppressing timeouts without truthful messaging
  - queue-truth or provider-intake redesign
- Explicit non-goals carried forward:
  - no `co-status attach` redesign
  - no weakening of genuine host-health alarms
  - no silent success when `/ui/data.json` is unreadable
  - no high-frequency retry loop
  - no broader CO STATUS operator-surface redesign

## Parity / Alignment Matrix
- Current truth:
  - direct `co-status --format json` reuses endpoint recovery but only retries when endpoint/auth artifacts change
  - same current endpoint `/ui/data.json` hangs can surface as the raw 15s timeout
  - live issue evidence says the same window can still have `stuck=false`, `restart_required=false`, fresh polling timestamps, and live running claims
- Reference truth:
  - `CO-246` stale/dead endpoint recovery remains the reference for endpoint rotation/dead-port behavior
  - attach restart/rotation recovery remains separate from direct JSON same-endpoint timeout behavior
  - refresh-stuck churn remains separate and should still alarm when stuck/restart-required signals are present
- Target truth / intended delta:
  - direct JSON gains one bounded same-endpoint timeout recovery/classification path
  - timeout failure text makes current-endpoint timeout distinct from endpoint rotation and host unavailability
  - focused tests prove timeout handling and stale endpoint behavior both remain truthful
- Explicitly out-of-scope differences:
  - attach live-viewer UI behavior
  - stale/dead endpoint recovery beyond preserving `CO-246`
  - provider-intake truth, queue truth, selected-run projection, and restart churn mitigation

## Readiness Gate
- Not done if:
  - direct `co-status --format json` can still fail with the same 15s timeout against a healthy current endpoint without bounded recovery/classification
  - the fix only improves stale/dead-endpoint `ECONNREFUSED` recovery
  - the fix obscures whether the failure came from current-endpoint hang, endpoint rotation, or host unavailability
  - regression coverage lacks a current-endpoint timeout case for the JSON command
- Pre-implementation issue-quality review evidence:
  - 2026-04-21: parent review confirms the issue is narrower than general host-health/restart recovery and broader than message-only wording. Correctness depends on preserving exact protected surfaces and the CO-246/CO-179/CO-211 boundaries, so the micro-task path is ineligible.
- Safeguard ownership split:
  - parent owns docs, implementation, tests, validation, workpad, PR lifecycle, and merge
  - docs-review child stream may review the packet after creation
  - any later same-issue child lane must own concrete non-overlapping files/phases

## Technical Requirements
1. Preserve the exact `CO-296` checksum around `co-status --format json`, current resolved `/ui/data.json`, healthy control-host, 15s attach timeout budget, same-endpoint hang/timeout, and bounded recovery or truthful classification.
2. Simulate or reproduce a current-endpoint `/ui/data.json` timeout while healthy-host evidence is represented by polling and running-claim truth.
3. Add a bounded recovery and/or truthful classification path for same-endpoint timeouts in direct JSON reads.
4. Preserve the stale/dead-endpoint direct JSON recovery behavior from `CO-246`.
5. Preserve attach restart/rotation behavior and refresh-stuck churn alarms by keeping their classification boundaries explicit.
6. Add focused regression coverage in the CLI shell tests.

## Architecture & Data
- Architecture / design adjustments:
  - keep the implementation in the CLI shell / shared fetch-recovery seam
  - prefer a small extension to the existing UI dataset recovery helper rather than a parallel control-host reader
  - bound retries to avoid request burn and preserve fail-closed timeout behavior
  - make error text/classification explicit for current-endpoint timeout when recovery cannot produce data
- Expected implementation surfaces:
  - `orchestrator/src/cli/coStatusCliShell.ts`
  - `orchestrator/src/cli/coStatusAttachCliShell.ts`
- Expected test surfaces:
  - `orchestrator/tests/CoStatusCliShell.test.ts`
  - `orchestrator/tests/CoStatusAttachCliShell.test.ts` when shared helper behavior changes
- Data model / artifact constraints:
  - no JSON snapshot schema drift for successful status payloads
  - no persistent state migration
  - no new high-frequency polling state

## Validation Plan
- Docs-first checks:
  - JSON parse for `tasks/index.json`
  - protected-term grep across PRD, TECH_SPEC mirror, ACTION_PLAN, canonical spec, task checklist, and `.agent/task` mirror
  - `git diff --check` over touched docs and registry files
  - docs-review child stream before implementation
- Focused implementation checks:
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/CoStatusCliShell.test.ts`
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/CoStatusAttachCliShell.test.ts` if shared helper behavior changes
- Required repo checks before handoff:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `codex-orchestrator review`
  - explicit elegance/minimality pass
- Rollback plan:
  - revert the bounded timeout handling if it hides real host-health failures, broadens retry behavior, or regresses CO-246 stale endpoint recovery

## Open Questions
- Should same-endpoint timeout recovery perform exactly one retry against the same endpoint before classification, or classify immediately when the current endpoint does not rotate?
- Should current-endpoint timeout classification be exposed only in error text or also as a structured internal reason for tests?
- Can the regression use a short injected timeout budget to avoid wall-clock 15s waits while preserving the real operator wording?

## Approvals
- Reviewer: parent issue-quality review and pending docs-review child stream.
- Date: 2026-04-21
