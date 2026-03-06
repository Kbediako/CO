---
id: 20260305-0997-coordinator-readonly-transport-surface-pilot
title: Coordinator Read-Only Transport Surface Pilot
relates_to: docs/PRD-coordinator-readonly-transport-surface-pilot.md
risk: high
owners:
  - Codex
last_review: 2026-03-05
---

## Summary
- Objective: deliver a safe read-only transport contract (`status_only`) for downstream adapters while preserving 0996 mutation HOLD boundaries.
- Scope: implemented delegation-surface behavior plus post-closeout docs/task mirror synchronization.
- Status: implementation complete and terminally validated on 2026-03-05.

## Pre-Implementation Review Note
- Decision: approved for bounded read-only transport slice.
- Reasoning: 0997 isolates status visibility without granting transport mutation authority.

## Post-Implementation Review Note
- Decision: approved as implementation-complete with bounded scope retained.
- Reasoning: implementation-gate terminal run succeeded and manual status-only checks confirm `delegate.status` allow + mutating tool blocks.

## Scope Boundaries
### In Scope
- `status_only` contract semantics for downstream transport adapters.
- Inbound `delegate.status` request contract.
- Optional outbound status/event notification projection contract.
- Explicit deny contract for mutating and unsupported delegation actions.
- 0997 docs/task registry + mirror synchronization to terminal implementation-gate evidence.

### Out of Scope
- Enabling mutating controls (`pause`, `resume`, `cancel`, `fail`, `rerun`).
- Any 0996 HOLD -> GO mutation promotion decision.
- Changing CO execution/control authority ownership.

## Technical Requirements
- Functional requirements:
  - Preserve CO authority invariants:
    - CO remains execution/control authority.
    - Coordinator remains intake/control plane only.
  - Preserve codex-autorunner extraction boundaries from 0994/0995:
    - transport adapter responsibilities remain bounded to ingress normalization, auth/rate-limit wrappers, and outbound status projection.
    - adapters cannot mutate run/control state directly.
  - Preserve qmd posture from 0996:
    - direct runtime adoption remains HOLD,
    - sidecar docs retrieval remains optional GO,
    - mutating transport controls remain HOLD/NO-GO unless explicitly approved under 0996.
  - Enforce `status_only` contract:
    - allow inbound `delegate.status` only,
    - allow optional outbound status/event notifications,
    - deny all mutating control actions,
    - deny unsupported delegation/github tools and malformed transport payloads.
  - Define deny expectations:
    - fail closed,
    - include auditable rejection reasons,
    - preserve traceability metadata for allowed status calls.
- Non-functional requirements:
  - Contract language remains deterministic and implementation-checkable.
  - Docs/task mirrors remain synchronized.
  - Validation evidence paths are explicit and auditable.

## Contract Matrix (0997)
| Surface action | Direction | State | Policy |
| --- | --- | --- | --- |
| `delegate.status` | Adapter -> CO | GO (bounded) | Allowed in `status_only` mode with scoped identity and traceable metadata. |
| Status/event notifications | CO -> Adapter | GO (optional) | Allowed as outbound projection only (status cards, gate/failure alerts, lifecycle updates). |
| `pause` / `resume` / `cancel` / `fail` / `rerun` | Adapter -> CO | HOLD | Explicitly denied in 0997; tracked under 0996 promotion lane only. |
| Shell/secret/config mutation/direct manifest writes | Adapter -> CO | NO-GO | Permanently unsupported via transport adapters. |

## Acceptance
- 0997 PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are synchronized to implementation-complete state.
- `status_only` contract is explicit with allowlist/denylist and fail-closed behavior.
- Terminal implementation-gate evidence is authoritative:
  - `.runs/0997-coordinator-readonly-transport-surface-pilot/cli/2026-03-05T00-44-50-509Z-75da1233/manifest.json`
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/16-implementation-gate-rerun.log`
- Manual status-only checks prove allow/block behavior:
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/18-manual-status-only-rerun.log`
- Post-sync verify gate 5 false-stall concern is resolved by terminal double-pass full-suite tests:
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T012233Z-test-stall-remediation/01-test-attempt1.log`
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T012233Z-test-stall-remediation/02-test-attempt2.log`
- Stale seed guard manifest is retained as historical aborted non-terminal evidence and is not authoritative for terminal status:
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T010613Z-stale-manifest-disposition/01-disposition-note.md`
- `tasks/index.json` and `docs/TASKS.md` point to the terminal implementation-gate run for 0997.
- Mutating controls remain explicitly HOLD under 0996 policy and are not promoted by 0997.

## Validation Evidence
- Terminal closeout summary:
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/terminal-closeout-summary.md`
- Implementation-gate manifest/log:
  - `.runs/0997-coordinator-readonly-transport-surface-pilot/cli/2026-03-05T00-44-50-509Z-75da1233/manifest.json`
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/16-implementation-gate-rerun.log`
- Status-only behavior check:
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/18-manual-status-only-rerun.log`
- Post-sync gate 5 stall remediation:
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T012233Z-test-stall-remediation/diagnosis.md`
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T012233Z-test-stall-remediation/01-test-attempt1.log`
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T012233Z-test-stall-remediation/02-test-attempt2.log`
- Stale seed manifest disposition (historical non-terminal evidence):
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T010613Z-stale-manifest-disposition/01-disposition-note.md`
- Docs guard logs from terminal closeout:
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/06-docs-check.log`
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/07-docs-freshness.log`

## Status Update (2026-03-05)
- 0997 is implementation-complete for the bounded `status_only` surface.
- Authoritative implementation-gate rerun is terminal succeeded at `.runs/0997-coordinator-readonly-transport-surface-pilot/cli/2026-03-05T00-44-50-509Z-75da1233/manifest.json`.
- Manual status-only checks confirm `delegate.status` allowed and mutating/unsupported calls blocked (`18-manual-status-only-rerun.log`).
- Docs/task mirror sync is tracked in this stream with fresh docs guard and parity evidence under `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T010502Z-mirror-sync-post-closeout/`.
- Post-sync verify gate 5 false-stall concern is resolved; terminal double-pass `npm run test` evidence is under `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T012233Z-test-stall-remediation/`.
- Stale guard seed manifest is retained as historical aborted non-terminal evidence and is not the authoritative 0997 run (`out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T010613Z-stale-manifest-disposition/01-disposition-note.md`).

## Approvals
- Reviewer: Codex.
- Date: 2026-03-05.
