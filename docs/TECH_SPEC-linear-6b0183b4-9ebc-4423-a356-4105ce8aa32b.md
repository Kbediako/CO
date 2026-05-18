---
id: 20260417-linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b
title: CO: Clear Codex 0.121 Cloud Canary Promotion Gate
relates_to: docs/PRD-linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b.md
risk: high
owners:
  - Codex
last_review: 2026-04-17
---

## Summary
- Objective: make the documented fallback canary command pass when the expected fallback manifest and run summary already satisfy the fallback assertions.
- Scope: `scripts/cloud-canary-ci.mjs`, focused regression coverage, and CO-207 docs/task evidence.
- Constraints: preserve required cloud execution behavior, preserve fatal handling for real non-fallback configuration/credential/connectivity failures, and avoid CO-196 marketplace descriptor work.

## Issue-Shaping Contract
- User-request translation carried forward: CO-207 must clear or formally waive the Codex CLI `0.121.0` cloud-canary promotion gate that blocks CO-196 marketplace packaging.
- Protected terms / exact artifact and surface names: `CO-207`, `CO-196`, `CODEX_CLOUD_ENV_ID`, `CODEX_CLOUD_CANARY_REQUIRED=1`, `CLOUD_CANARY_EXPECT_FALLBACK=1`, `scripts/cloud-canary-ci.mjs`, `cloud_execution`, `cloud_fallback`, `mode_requested=cloud`, `mode_used=mcp`, `missing_environment`, `issue_blocked_by`.
- Nearby wrong interpretations to reject: accepting fallback without manifest/run-summary proof, treating fallback as cloud execution, implementing marketplace packaging, or weakening cloud preflight globally.
- Explicit non-goals carried forward: no marketplace descriptors, no sandbox/delegation/authority weakening, no app-server provider supervision adoption.

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth: `CLOUD_CANARY_EXPECT_FALLBACK=1` clears `CODEX_CLOUD_ENV_ID`, the orchestrator correctly falls back to local MCP and records `missing_environment`, but the wrapper adds a fatal required-mode configuration failure after the fallback assertions pass.
- Reference truth: the fallback promotion gate should pass when it proves the fallback branch, and should fail when fallback assertions fail or when a real execution problem occurs.
- Target truth / intended delta: expected fallback `missing_environment` remains required evidence for the fallback contract and is no longer double-counted as fatal after the contract is proven.
- Explicitly out-of-scope differences: changing cloud environment setup, changing the fallback trigger, or making configuration failures skippable for normal required cloud execution.

## Readiness Gate
- Not done if: either canary command lacks current artifacts, fallback still exits failed after expected fallback evidence, or CO-196 lacks CO-207 in local intake while CO-207 remains open.
- Pre-implementation issue-quality review evidence: 2026-04-17 parent inspection of current canary artifacts showed required cloud execution passed at `.runs/linear-6b0183b4-9ebc-4423-a356-4105ce8aa32b-cloud-required-r3/cli/2026-04-16T22-41-31-475Z-ee84d500/manifest.json`, while fallback failed only after successful fallback manifest/run-summary assertions.
- Safeguard ownership split: parent owns Linear/workpad/canary evidence; implementation owns only wrapper classification and focused tests.

## Technical Requirements
- Functional requirements:
  - Preserve all existing fallback assertions for manifest status, absent `cloud_execution`, present `cloud_fallback`, expected modes, fallback reason, `missing_environment`, and run-summary parity.
  - Suppress the fatal required-mode configuration classification only when `CLOUD_CANARY_EXPECT_FALLBACK=1` and the expected fallback evidence is present.
  - Preserve fatal classification for required non-fallback `configuration`, `credentials`, and `connectivity` failures.
- Non-functional requirements (performance, reliability, security):
  - No new network calls in unit coverage.
  - No secret values written to logs or workpad.
  - Fail closed when fallback evidence is incomplete.
- Interfaces / contracts:
  - Required command: `CODEX_CLOUD_ENV_ID=<env-id> CODEX_ORCHESTRATOR_CLOUD_FALLBACK=deny CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`.
  - Fallback command: `CODEX_CLOUD_ENV_ID=<env-id> CODEX_CLOUD_CANARY_REQUIRED=1 CLOUD_CANARY_EXPECT_FALLBACK=1 npm run ci:cloud-canary`.

## Architecture & Data
- Architecture / design adjustments: update `scripts/cloud-canary-ci.mjs` classification so expected fallback configuration evidence is not appended as an extra fatal failure after assertions pass.
- Data model changes / migrations: none.
- External dependencies / integrations: Codex Cloud, Linear, local provider intake, and git remote branch checks remain unchanged.

## Validation Plan
- Tests / checks:
  - Add focused Vitest coverage for the fallback wrapper using fake `codex`, fake `git`, and fake `dist/bin/codex-orchestrator.js` in a temp repo.
  - Re-run both CO-207 canary commands after the fix.
  - Run required repo gates for changed script/tests/docs.
- Rollout verification:
  - Workpad records current required/fallback logs, manifests, run summaries, and CO-196 blocker intake.
  - PR review and ready-review drain complete before `In Review`.
- Monitoring / alerts:
  - Existing canary logs and manifest/run-summary artifacts remain the evidence surface.

## Open Questions
- None.

## Approvals
- Reviewer: Parent worker issue-quality review.
- Date: 2026-04-17
