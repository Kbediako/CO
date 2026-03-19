---
id: 20260303-0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment
title: Coordinator Control Bridge Slice 3 + Residual Risk Remediation + Transport Policy Alignment
relates_to: docs/PRD-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment.md
risk: high
owners:
  - Codex
last_review: 2026-03-03
---

## Summary
- Objective: remediate 0995 docs state and define implementation-checkable residual-risk + transport-policy requirements.
- Scope: docs/mirror cleanup, task/index registration, docs-review and standalone review evidence capture.
- Constraint: no edits to `orchestrator/src` or tests in this stream.

## Pre-Implementation Review Note
- Decision: approved for docs-only remediation.
- Reasoning: prior interrupted stream left non-truthful checklist state and missing 0995 task/spec registration.

## Technical Requirements
- Functional requirements:
  - Carry forward unresolved 0994 findings as explicit remediation targets:
    - P1 replay persistence retry-state gap from `.runs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/cli/2026-03-03T13-46-07-481Z-b0b0aab0/review/output.log`.
    - P1 cancel traceability `request_id` source gap from `.runs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/cli/2026-03-03T13-12-45-845Z-bf70d8e6/review/output.log`.
    - P2 cross-platform env wrapper gap from the same `2026-03-03T13-12-45-845Z-bf70d8e6` review output.
  - Define codex-autorunner extraction boundary as transport-adapter-only scope.
  - Define Discord/Telegram GO/HOLD/NO-GO matrix and explicit promotion controls.
  - Keep CO as sole execution authority for run-state transitions.
- Non-functional requirements:
  - Traceability invariants remain deterministic (`intent_id -> task_id -> run_id -> manifest_path`).
  - Transport policy remains fail-closed and auditable.
  - Checklist mirrors must reflect truthful docs-stream state only.

## Codex-Autorunner Extraction Boundary
- In scope:
  - ingress normalization,
  - transport auth/rate-limit wrappers,
  - outbound status projection.
- Out of scope (remains in CO core):
  - control-state transitions,
  - scheduler/execution decisions,
  - manifest truth and guardrail approvals.
- Rejection semantics:
  - reject malformed input/auth failures/replay violations,
  - reject bypass attempts for CO control APIs.

## Transport Policy Matrix (Discord + Telegram)
| Surface class | Example actions | State | Policy |
| --- | --- | --- | --- |
| Notification (read-only) | status cards, gate alerts, failure notifications | GO | Allowed with scoped auth, signature validation, and rate limits. |
| Mutating control | pause, resume, cancel, fail, rerun | HOLD | Disabled by default; promotion requires all controls below plus explicit approval. |
| Explicit forbidden set | shell execution, secret retrieval/mutation, config/policy mutation, direct manifest/control-file writes, approval bypass requests | NO-GO | Permanently unsupported through transport adapters. |

## HOLD Promotion Controls
- Security controls:
  - scoped credential rotation/revocation,
  - nonce/expiry replay protection,
  - actor binding to approved identity source.
- Reliability controls:
  - deterministic retries,
  - duplicate-intent idempotency checks,
  - transport delivery telemetry + alerting.
- Traceability controls:
  - actor + `intent_id`, `request_id`, `task_id`, `run_id`, `manifest_path` persisted for each action,
  - applied action id is canonical source for final trace fields.
- Operational controls:
  - feature flag default off,
  - kill switch + rollback validation,
  - explicit GO decision recorded with manifest-backed evidence.

## Validation Plan
- Pre-coding docs-review evidence (captured before edits):
  - Manifest: `.runs/0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-docs/cli/2026-03-03T14-33-58-110Z-3042fdf2/manifest.json`.
  - Log: `.runs/0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-docs/cli/2026-03-03T14-33-58-110Z-3042fdf2/runner.ndjson`.
- Post-remediation docs-review:
  - `MCP_RUNNER_TASK_ID=0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-docs DELEGATION_GUARD_OVERRIDE_REASON="0995 docs cleanup is a delegated child stream in shared checkout; spawning further subagents is intentionally bypassed for docs-only remediation." npx codex-orchestrator start docs-review --format json --no-interactive`
- Standalone docs-stream review checkpoint:
  - `MCP_RUNNER_TASK_ID=0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-docs TASK=0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-docs NOTES="Goal: 0995 docs cleanup continuation | Summary: remove stale copied claims, register 0995, and align extraction/policy controls | Risks: shared-checkout unrelated diffs can appear in review scope" npm run review`

## Approvals
- Reviewer: Codex.
- Date: 2026-03-03.
