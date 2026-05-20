# PRD - CO-566 Ready resumable recovery without broad dispatch source enablement

## Immediate Traceability
- Linear issue: `CO-566` / `b30c4be7-d186-490e-863b-8ba57a6cb9a5`
- Task id: `linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5`
- Canonical task spec: `tasks/specs/linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md`
- Task checklist: `tasks/tasks-linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md`
- `.agent` mirror: `.agent/task/linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5.md`
- Canonical owner key: `provider-intake:ready-resumable-recover-dispatch-source-disabled:v1`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=provider-intake:ready-resumable-recover-dispatch-source-disabled:v1`
- Source anchor: `ctx:sha256:4b0810177126360ba862e82ae588b6fff3ddbb23e51d40f70b84d4bfc6ce9da2#chunk:c000001`
- Source object id: `sha256:4b0810177126360ba862e82ae588b6fff3ddbb23e51d40f70b84d4bfc6ce9da2`
- Parent manifest pointer: `.runs/linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5-docs-packet/cli/2026-05-20T03-01-24-615Z-49668b4b/manifest.json`
- Source payload pointer: `.runs/linear-b30c4be7-d186-490e-863b-8ba57a6cb9a5-docs-packet/cli/2026-05-20T03-01-24-615Z-49668b4b/memory/source-0/source.txt`

## Summary
- Problem Statement: Ready/Rework provider-worker issues can have terminal failed historical runs retained as audit evidence while the current claim is stale `resumable` state, but the current recovery path can appear blocked when the dispatch source is disabled unless operators use broad `dispatch_pilot.enabled=true` or manually delete `provider-intake-state.json` evidence.
- Desired Outcome: create the CO-566 docs-first packet for a narrow recovery fix that lets eligible Ready/Rework issues with terminal failed historical runs launch a new governed worker or produce an actionable blocked classification, without broad `dispatch_pilot.enabled=true`, without manual provider-intake-state deletion, and without changing CO-558 docs-freshness scope.

## User Request Translation
- User intent / needs: define a bounded CO-566 packet for Ready resumable recovery. The parent implementation should make eligible Ready/Rework issues recoverable when historical failed runs are terminal audit evidence and the current claim is stale `resumable` state, while preserving provider-intake audit history and avoiding broad dispatch enablement or unrelated docs-freshness changes.
- Success criteria / acceptance:
  - all six declared packet/checklist files exist and remain within the docs phase scope
  - protected terms remain visible: `Ready`, `Rework`, `terminal failed historical runs`, `resumable`, `recover`, `dispatch source disabled`, `dispatch_pilot.enabled=true`, `provider-intake-state.json`, `manual provider-intake-state deletion`, `CO-558 docs-freshness scope`, canonical owner key `provider-intake:ready-resumable-recover-dispatch-source-disabled:v1`, and `Not Done If`
  - the packet includes an explicit current/reference/target parity matrix
  - the packet rejects broad global dispatch enablement, raw state deletion, registry mirror edits by this child lane, implementation edits by this child lane, and any expansion into CO-558 docs-freshness work
  - parent-owned implementation must preserve terminal issue safety: Done/canceled/duplicate/archived issues must not become current recoverable work just because a historical run failed
- Constraints / non-goals:
  - this child lane edits only the six declared packet/checklist files
  - no source code, tests, registry mirrors, docs-freshness registry/catalog, Linear state, workpad, PR, or provider-intake state mutations
  - no manual deletion of `provider-intake-state.json`
  - no broad `dispatch_pilot.enabled=true` workaround
  - no change to CO-558 docs-freshness scope or ownership

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `Ready resumable recovery`
  - `Ready/Rework issues`
  - `terminal failed historical runs`
  - `resumable provider-intake claim`
  - `launch a new governed worker or produce an actionable blocked classification`
  - `without broad dispatch_pilot.enabled=true`
  - `without manual provider-intake-state deletion`
  - `without changing CO-558 docs-freshness scope`
  - `provider-intake:ready-resumable-recover-dispatch-source-disabled:v1`
  - `Not Done If`
  - `parity matrix`
- Protected terms / exact artifact and surface names:
  - `CO-566`
  - `provider-intake-state.json`
  - `dispatch_pilot.enabled=true`
  - `provider-intake:ready-resumable-recover-dispatch-source-disabled:v1`
  - `codex-orchestrator:canonical-owner-key=provider-intake:ready-resumable-recover-dispatch-source-disabled:v1`
  - `CO-558 docs-freshness scope`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
  - `docs/docs-catalog.json`
- Nearby wrong interpretations to reject:
  - "turn on `dispatch_pilot.enabled=true` globally to make Ready issues move"
  - "delete or rewrite `provider-intake-state.json` to clear stale evidence"
  - "recover every issue with a failed historical run, including terminal Done/canceled/duplicate issues"
  - "collapse Ready/Rework recovery into CO-558 docs-freshness ownership or refresh scope"
  - "edit registry mirrors from this child lane"
  - "change source code or tests from the docs packet lane"

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Ready/Rework recovery | A non-terminal issue can remain Ready/Rework while the most relevant historical provider run is terminal failed and the provider-intake claim is stale `resumable` state. Recovery may appear unavailable when the dispatch source is disabled. | Non-terminal issue state should decide recoverability before stale historical run terminal status blocks targeted recovery. | Eligible Ready/Rework issues with terminal failed historical runs launch a new governed worker or return an actionable blocked classification through a targeted recover path. | Terminal Done/canceled/duplicate/archived issues do not become current work. |
| Dispatch gating | A workaround can look like broad `dispatch_pilot.enabled=true`. | Dispatch pilot configuration should not be globally widened to recover one issue class. | The parent fix avoids broad `dispatch_pilot.enabled=true` and uses a narrow Ready/Rework recovery path. | No global pilot rollout, scheduler redesign, or unrelated dispatch policy change. |
| Provider-intake audit state | Operators may be tempted to delete `provider-intake-state.json` to unstick recovery. | Provider-intake state is audit evidence and must be updated through governed provider workflow behavior. | Recovery preserves raw provider-intake audit history and avoids manual provider-intake-state deletion. | No hand-editing, deleting, quarantining, or hiding provider-intake artifacts. |
| CO-558 docs-freshness scope | CO-558 owns a separate docs-freshness owner/scope lane. | Docs-freshness ownership stays governed by its own issue and registry/catalog surfaces. | CO-566 stays provider-intake recovery scoped and does not change CO-558 docs-freshness scope. | No edits to `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, or CO-558 scope docs from this child lane. |
| Packet ownership | This child lane owns only six docs/checklist files. | Parent owns registry mirrors, Linear state, workpad, implementation, validation, PR lifecycle, and issue transitions. | Six-file packet exists for parent patch import, with parent-owned boundaries explicit. | No `tasks/index.json`, `docs/TASKS.md`, source, test, or Linear mutation from this child lane. |

## Not Done If
- The packet omits the canonical owner key `provider-intake:ready-resumable-recover-dispatch-source-disabled:v1` or marker `codex-orchestrator:canonical-owner-key=provider-intake:ready-resumable-recover-dispatch-source-disabled:v1`.
- Ready/Rework issues with terminal failed historical runs are not explicitly distinguished from terminal Done/canceled/duplicate/archived issues.
- The proposed recovery requires broad `dispatch_pilot.enabled=true`.
- The proposed recovery requires manual provider-intake-state deletion, hand-editing, quarantine, or artifact hiding.
- CO-566 changes or widens CO-558 docs-freshness scope.
- Registry mirrors, source code, tests, Linear state, workpad, PR lifecycle, or provider-intake artifacts are edited by this child lane.
- The parity matrix, protected terms, non-goals, or parent-owned implementation boundaries are missing.

## Goals
- Create a six-file docs-first packet for CO-566.
- Preserve the exact canonical owner key and source anchor.
- Make the Ready/Rework stale-`resumable` recovery contract clear before implementation.
- Keep the child lane patch docs-only and importable by the parent.

## Non-Goals
- No source implementation or tests.
- No registry mirror edits, including `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, or `docs/docs-catalog.json`.
- No Linear mutations, workpad edits, PR creation, or issue transition.
- No broad dispatch-pilot enablement.
- No manual provider-intake-state deletion.
- No CO-558 docs-freshness scope change.

## Acceptance Criteria
- Six declared packet/checklist files exist with CO-566 traceability.
- Protected terms and the exact canonical owner key are present across the packet.
- Current/reference/target parity matrix is present.
- `Not Done If` rejects broad dispatch enablement, provider-intake-state deletion, terminal issue resumption, CO-558 scope drift, and child-lane scope drift.
- Parent implementation and validation responsibilities are explicitly marked parent-owned.

## Metrics & Guardrails
- Primary Success Metrics:
  - changed files are limited to the six declared paths
  - protected-term scan finds the canonical owner key, `dispatch_pilot.enabled=true`, `provider-intake-state.json`, `CO-558 docs-freshness scope`, `Ready/Rework`, and `resumable`
  - scoped markdown whitespace check passes
- Guardrails / Error Budgets:
  - zero source/test/registry/Linear/provider-intake mutations from this child lane
  - zero broad dispatch-pilot enablement language as the solution
  - zero docs-freshness scope changes

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: `remove fallback` for the operator workaround where recovery depends on broad `dispatch_pilot.enabled=true` or manual `provider-intake-state.json` deletion when the dispatch source is disabled.
- Owner: `CO-566`.
- Trigger: a non-terminal Ready/Rework issue has a terminal failed historical provider run and stale `resumable` provider-intake claim.
- Introduced date: observed by CO-566 on 2026-05-20.
- Review date: 2026-05-20.
- Maximum lifetime: this issue.
- Removal condition: parent implementation provides targeted Ready/Rework recovery that launches a new governed worker or returns an actionable blocked classification while preserving historical failed run evidence, without global dispatch-pilot enablement or manual state deletion.
- Validation: parent-owned focused provider-intake/provider-handoff/recover tests and status projection checks.
- Large-refactor check: a bounded recovery fix is acceptable because the target is one provider-intake recovery seam; broader dispatch or docs-freshness architecture remains out of scope.

## Technical Considerations
- Architectural Notes:
  - Recovery should key off live non-terminal issue state plus terminal failed historical run evidence.
  - Provider-intake history should remain auditable even when current recovery status changes.
  - Dispatch source disabled handling should be local to the targeted recover path, not a global `dispatch_pilot.enabled=true` policy.
- Dependencies / Integrations:
  - provider-intake recovery and status projection surfaces
  - parent-owned Linear issue/workpad truth
  - parent-owned registry mirror integration

## Open Questions
- Parent implementation must confirm the exact source seam and test target before code changes.
- Parent validation must decide whether the focused test belongs in provider-intake state, provider issue handoff, recover endpoint, selected-run projection, or a combination.

## Approvals
- Product: parent CO-566 lane owns issue/workpad/Linear/PR reconciliation.
- Engineering: bounded docs child lane produced the six-file packet for parent import.
- Design: N/A
