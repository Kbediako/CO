# PRD - Coordinator Control Bridge Slice 3 + Residual Risk Remediation + Transport Policy Alignment (0995)

## Summary
- Problem Statement: the interrupted 0995 stream left inconsistent docs state (stale copied checklist claims and missing index registration), while residual findings from 0994 and transport policy alignment are still open.
- Desired Outcome: truthful, implementation-ready docs that lock residual-risk remediation targets and transport policy boundaries before new code changes.
- Scope Status: docs-only remediation stream for task `0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment`.

## User Request Translation
- User intent: repair 0995 docs/mirrors to a truthful state and keep implementation/final validation work pending.
- Required outcomes:
  - refresh PRD + TECH_SPEC + ACTION_PLAN + canonical spec + checklist mirrors,
  - register 0995 in `tasks/index.json` and `docs/TASKS.md`,
  - capture docs-review evidence before docs edits,
  - capture standalone docs-stream review evidence and record elegance/minimality notes,
  - keep scope docs-only (no `orchestrator/src` or test edits).

## Lineage (0993 -> 0994 -> 0995)
- 0993 is the baseline for Coordinator control bridge behavior and CO execution authority.
- 0994 recorded extraction/policy direction and left unresolved review findings.
- 0995 freezes remediation requirements and transport policy controls so implementation can proceed with explicit gates.

## Residual Findings Inventory (Carried from 0994)
- P1 replay persistence gap: idempotent replay retry can skip persistence on retry path.
  - Source: `.runs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/cli/2026-03-03T13-46-07-481Z-b0b0aab0/review/output.log`.
- P1 cancel traceability source gap: `request_id` should be sourced from applied action trace.
  - Source: `.runs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction/cli/2026-03-03T13-12-45-845Z-bf70d8e6/review/output.log`.
- P2 cross-platform env wrapper gap: required gates should not depend on POSIX-only `env -u` behavior.
  - Source: same 2026-03-03T13-12-45-845Z-bf70d8e6 review log.

## Codex-Autorunner Extraction Policy (Bounded)
- Extraction lane can own transport-adapter responsibilities only:
  - ingress normalization,
  - transport auth/rate-limit wrappers,
  - outbound status projection.
- CO remains authority for:
  - control-state transitions,
  - scheduler/execution decisions,
  - canonical run truth and manifests.
- Hard invariants:
  - preserve `intent_id -> task_id -> run_id -> manifest_path` trace chain,
  - fail closed on malformed transport input/auth failures,
  - reject any adapter request that bypasses CO control APIs.

## Discord/Telegram GO/HOLD/NO-GO Matrix
| Surface class | Example actions | State | Policy |
| --- | --- | --- | --- |
| Notification (read-only) | status updates, gate alerts, failure notifications | GO | Allowed with scoped auth, signature checks, and rate limits. |
| Mutating control | pause, resume, cancel, fail, rerun | HOLD | Disabled until promotion controls pass and explicit promotion approval is recorded. |
| Explicit forbidden set | shell/command execution, secret retrieval/mutation, config/policy mutation, direct manifest/control-file writes, approval bypass requests | NO-GO | Permanently unsupported through transport adapters. |

## HOLD Promotion Controls
- Security:
  - scoped credentials with rotation/revocation,
  - replay protection (nonce + expiry),
  - actor binding to approved identity source.
- Reliability:
  - deterministic retry semantics,
  - duplicate-intent idempotency coverage,
  - delivery-failure telemetry + alerting.
- Traceability:
  - each action records actor, `intent_id`, `request_id`, `task_id`, `run_id`, and `manifest_path`,
  - applied action id is the source of truth for final trace fields.
- Promotion controls:
  - feature-flag default remains off,
  - kill switch and rollback runbook validated,
  - promotion requires explicit GO decision with manifest-backed evidence.

## Goals
- Make 0995 docs truthful and internally consistent.
- Freeze residual-risk remediation targets and transport policy controls.
- Keep implementation scope pending until controls/evidence gates are satisfied.

## Non-Goals
- Implementing runtime/test fixes in this docs stream.
- Enabling mutating Discord/Telegram control surfaces in this docs stream.
- Changing CO execution authority boundaries.

## Approvals
- Product: user request translated and approved for docs cleanup on 2026-03-03.
- Engineering: docs-only remediation scope approved for 0995.
- Design: n/a.
