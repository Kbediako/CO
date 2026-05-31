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
- Objective: correct control-host status projection so a retained failed provider-worker proof cannot appear as current failed work after same-issue terminal released truth proves the run is historical.
- Scope: docs-first packet, focused status projection implementation, regression tests, status proof, validation, review, PR lifecycle, and Linear closeout for CO-589.
- Constraints: preserve real active/retry failed runs, preserve retained proof as source-labeled audit evidence, keep shared root clean/latest, and do not mutate provider-intake state by hand.
- Root-cause update: read-only gpt-5.5/xhigh RCA placed the bug in `orchestrator/src/cli/control/selectedRunProjection.ts`, not in the downstream renderer. Failed retained provider-worker proof is only reconciled for active-looking, passive Backlog, or successful handoff cases; terminal Done/completed released claims fall through and presenters then render the stale failure.

## Issue-Shaping Contract
- User-request translation carried forward: repeated current-status pollution must be fixed at the authority seam rather than patched over with manual cleanup or display-only text.
- Protected terms / exact artifact and surface names: `co-status --format json`, `co-status --format json --dashboard`, `/ui/data.json`, `selected`, `selected_issue_identifier`, `issues[]`, `display_status=failed`, `provider_linear_worker_proof`, `provider_debug_snapshot.claim`, `provider_issue_released:not_active`, `compatibility issue projection fallback`, `CO-398`, `CO-582`.
- Nearby wrong interpretations to reject: hiding all failed rows, deleting proof history, weakening terminal/retry fail-closed behavior, assuming unknown live state is terminal, or adding another compatibility fallback.
- Explicit non-goals carried forward: no provider-worker admission, retry scheduling, Linear workflow, or broad renderer redesign unless focused implementation proves it necessary.

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Current selected status | CO-582 is selected as `failed` from a stale usage-limit run. | Current selected status should reflect current active work. | Terminal released failed proof is not selected as current work. | Removing historical proof visibility. |
| Active issue list | Active `issues[]` includes CO-582 as failed. | Active issue rows should require current work authority. | Passive terminal released proof is excluded from active `issues[]`. | Suppressing non-terminal failed work. |
| Debug/audit payload | Proof/debug payload explains the historical failure. | Audit proof is useful but subordinate to current authority. | Proof remains visible with source labels and cannot drive active status. | Purging provider state. |
| Fallback metadata | Expired compatibility projection fallback still appears. | Expired fallback should be removed or degraded by owner lanes. | CO-589 removes the behavior behind this recurrence. | Broad CO-400-style authority rewrite without evidence. |

## Readiness Gate
- Not done if:
  - released/not-active terminal same-issue proof still appears as current failed selected issue or active issue row
  - non-terminal failed rows disappear
  - proof/debug history is deleted instead of demoted from current authority
  - the implementation depends on manual `provider-intake-state.json` cleanup
- Pre-implementation issue-quality review evidence:
  - Live CO-589 issue context shows In Progress with correct labels.
  - Live CO-555 is Done, so CO-589 is not duplicating a non-terminal owner.
  - Live CO-582 is Done/completed while dashboard still selects its old failed run.
  - Hygiene quota reports zero quota-burning workers.
- Safeguard ownership split: parent owns docs packet, implementation, Linear workpad, validation, review, PR, and merge closeout; read-only subagents may provide root-cause and duplicate audits only.

## Technical Requirements
- Functional requirements:
  - Add or reuse one shared predicate for passive terminal released failed proof classification in the selected-run/read-model authority layer.
  - Apply the predicate consistently to selected payload, `selected_issue_identifier`, active `issues[]`, and `/ui/data.json`.
  - Preserve `provider_linear_worker_proof` and `provider_debug_snapshot` as source-labeled audit evidence where the current schema can expose it without making the row active.
  - Keep active/retry/running and non-terminal failed rows visible.
  - Avoid extra Linear reads or request burn.
- Non-functional requirements:
  - Keep changes local to existing status/read-model projection seams.
  - Fail closed when live issue state is unknown or non-terminal.
  - Keep JSON output backward compatible except for corrected current-status suppression.
- Interfaces / contracts:
  - `co-status --format json`
  - `co-status --format json --dashboard`
  - `/ui/data.json`
  - `selected`
  - `selected_issue_identifier`
  - `issues[]`
  - `provider_linear_worker_proof`
  - `provider_debug_snapshot`
  - `fallback_expiry`

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `control-host status surfaces` | Retained failed proof can drive current status after terminal released same-issue truth. | remove fallback | CO-589 / CO-398 | `provider_issue_released:not_active` plus terminal issue truth and no active retry/running authority still projects `failed`. | CO-398 lineage, recurrence observed 2026-05-31 | 2026-05-31 | N/A after removal | The CO-582 shape no longer appears as current work. | Focused projection tests and local `co-status` proof. |
| `control-host status surfaces` | Retained proof/debug evidence remains available as audit context. | justify retaining fallback | CO-589 / CO-398 | Historical proof is useful for operator diagnosis after suppression. | CO-398 lineage | 2026-05-31 | Non-expiring durable audit contract while source-labeled | Remove only with equivalent source-labeled proof/audit replacement. | Tests show proof remains audit evidence without current authority. |

- Durable retention evidence: retained proof/debug history remains a supported source-labeled audit contract, not a current-status authority.
- Large-refactor check: no large refactor is required if a shared predicate can be applied at the existing compatibility/read-model boundary. Escalate if implementation would need separate ad hoc predicates for CLI, API, and UI.

## Architecture & Data
- Architecture / design adjustments: prefer centralizing the terminal released failed-proof predicate near selected-run reconciliation and reusing it before compatibility/dashboard presenters render current status.
- Data model changes / migrations: no persisted state migration expected.
- External dependencies / integrations: Linear state is consumed from existing provider/debug/tracked issue evidence only; no new API dependency expected.

## Validation Plan
- Tests / checks:
  - invert the existing selected-run regression that keeps failed owner proof visible with terminal Linear truth
  - focused positive regression for the CO-582 shape
  - focused negative regression for non-terminal failed proof
  - existing terminal released, retry, and active running projection coverage
  - docs-review before source edits
  - normal CO validation floor as scoped by touched files
- Rollout verification:
  - run `co-status --format json --dashboard` locally and prove CO-582 no longer appears as current failed work
  - preserve shared-root clean/latest status after merge
- Monitoring / alerts:
  - no new alerting; existing CO STATUS and quota hygiene should show zero current stale failed row after merge

## Open Questions
- Whether to expose suppressed historical proof in a future explicit `history` section is outside the initial fix unless required to preserve current debug visibility.

## Approvals
- Reviewer: parent CO orchestrator
- Date: 2026-05-31
