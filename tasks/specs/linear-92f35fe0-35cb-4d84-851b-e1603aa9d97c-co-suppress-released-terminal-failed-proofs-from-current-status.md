---
id: 20260531-linear-92f35fe0-35cb-4d84-851b-e1603aa9d97c
title: CO-589 suppress released terminal failed proofs from current status
relates_to: docs/PRD-linear-92f35fe0-35cb-4d84-851b-e1603aa9d97c.md
risk: high
owners:
  - Codex
last_review: 2026-05-31
---

## Summary
- Objective: prevent released terminal historical failed provider-worker proof from being projected as current failed status.
- Scope: CO STATUS compatibility/current issue projection, focused regression tests, live status proof, validation, review, and PR closeout.
- Constraints: preserve non-terminal failed visibility, preserve source-labeled audit proof, avoid manual provider-intake cleanup, and keep WIP under 4.
- Root-cause update: read-only gpt-5.5/xhigh RCA identified `orchestrator/src/cli/control/selectedRunProjection.ts` as the authority seam. Failed retained provider-worker proof is reconciled only for active-looking, passive Backlog, or successful handoff cases, so terminal Done/completed released claims fall through before compatibility/dashboard presenters render them.

## Issue-Shaping Contract
- User-request translation carried forward: repeated status/projection issues must be fixed at the root authority boundary rather than patched with manual cleanup or display-only masking.
- Protected terms / exact artifact and surface names: `co-status --format json`, `co-status --format json --dashboard`, `/ui/data.json`, `selected`, `selected_issue_identifier`, `issues[]`, `display_status=failed`, `provider_linear_worker_proof`, `provider_debug_snapshot.claim`, `released`, `provider_issue_released:not_active`, `issue_state=Done`, `issue_state_type=completed`, `compatibility issue projection fallback`, `CO-398`, `CO-582`.
- Nearby wrong interpretations to reject: hiding real failed rows, deleting proof history, treating unknown state as terminal, changing Linear states, changing admission/retry policy, or adding another compatibility fallback.
- Explicit non-goals carried forward: no provider-worker admission, retry scheduling, Linear workflow, or broad renderer redesign changes.

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Selected current work | Stale CO-582 failed run can remain selected. | Selected issue represents current work. | CO-582-shaped passive terminal proof is not selected. | Hiding active failed work. |
| Active `issues[]` | CO-582-shaped row appears as active failed issue. | Active list excludes passive terminal history. | Row is suppressed from active issues. | Removing historical debug proof. |
| Audit proof | Failed run proof remains diagnostic. | Proof is retained evidence, not current authority. | Proof/debug fields remain source-labeled and subordinate. | Purging run artifacts or state. |
| Fallback expiry | Expired compatibility projection fallback still drives status. | CO-398 fallback expiry requires removal/degradation. | Expired behavior is removed for this shape. | Broad CO-400 authority model rewrite. |

## Readiness Gate
- Not done if:
  - released/not-active terminal proof still appears as current failed selected issue or active issue row
  - non-terminal failed rows disappear
  - proof/debug history is removed instead of demoted
  - implementation relies on state-file cleanup
- Pre-implementation issue-quality review evidence:
  - CO-589 live issue-context: In Progress / started.
  - CO-555 live issue-context: Done / completed, so no non-terminal duplicate owner.
  - CO-582 live issue-context: Done / completed while status projection still reports failed current work.
  - Quota hygiene: zero quota-burning workers.
- Safeguard ownership split: parent owns implementation and validation; read-only subagents provide bounded root-cause and duplicate audits.

## Technical Requirements
- Functional requirements:
  - identify passive terminal failed proof in selected-run/read-model reconciliation using released/not-active claim state plus terminal same-issue truth and no active running/retry source
  - suppress that shape from current selected status and active issue rows
  - keep active, retrying, running, and non-terminal failed rows visible
  - retain proof/debug data as source-labeled audit evidence where current schemas allow
  - avoid new Linear reads or request burn
- Non-functional requirements: local, deterministic, backward-compatible JSON except corrected status; no broad refactor unless focused seam is unsafe.
- Interfaces / contracts: selected-run projection, `buildCompatibilityProjectionSnapshot`, `co-status --format json`, `/ui/data.json`, `fallback_expiry`.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `control-host status surfaces` | Retained failed proof projects as current failed status despite released terminal same-issue truth. | remove fallback | CO-589 / CO-398 | CO-582-shaped stale failed proof appears in selected/active status. | CO-398 lineage, recurrence observed 2026-05-31 | 2026-05-31 | N/A after removal | CO-582 shape is suppressed from current status while non-terminal failed rows remain. | Focused projection tests and live `co-status` proof. |
| `control-host status surfaces` | Source-labeled retained proof/debug history remains visible as audit evidence. | justify retaining fallback | CO-589 / CO-398 | Operator diagnosis needs historical failed proof after current-status suppression. | CO-398 lineage | 2026-05-31 | Non-expiring durable audit contract while source-labeled | Equivalent audit-history schema replaces it. | Tests/proof show retained proof cannot drive current authority. |

- Durable retention evidence: retained proof and debug payloads are durable operator audit evidence only with source labels and subordinate current authority.
- Large-refactor check: a focused fix is acceptable if it reuses one predicate or authority order shared across selected and active issue projections; otherwise escalate before adding another seam.

## Architecture & Data
- Architecture / design adjustments: locate the fix in selected-run reconciliation before compatibility/dashboard presenters consume the run context, preferably adjacent to terminal released inactive classification.
- Data model changes / migrations: none expected.
- External dependencies / integrations: existing Linear truth already present in provider/debug/tracked state.

## Validation Plan
- Tests / checks:
  - invert the existing selected-run regression that currently preserves failed proof for terminal Linear truth
  - CO-582-shaped positive regression
  - non-terminal failed negative regression
  - existing terminal released and active retry/running tests
  - `co-status --format json --dashboard` local proof
  - standard CO validation and review gates
- Rollout verification: shared root fast-forward and control-host status no longer shows CO-582 current failed row.
- Monitoring / alerts: existing CO STATUS and hygiene quota surfaces.

## Open Questions
- Whether a future explicit historical row surface is needed is deferred unless source-labeled debug payload retention is insufficient.

## Approvals
- Reviewer: parent CO orchestrator
- Date: 2026-05-31
