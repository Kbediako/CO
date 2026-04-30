# PRD - CO-430 re-home live docs freshness maintenance owner after terminal CO-425

## Traceability
- Linear issue: `CO-430` / `b78c98eb-8ed4-4e19-9099-81d5e34bb33c`
- Linear URL: https://linear.app/asabeko/issue/CO-430
- Task id: `linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c`
- Canonical spec: `tasks/specs/linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
- Source issue: `CO-429` / `b9a1044e-03b0-49ef-8435-92840eaf90b9`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`

## Summary
- Problem Statement: `docs:freshness:maintain` now reports the configured owner `CO-425` as terminal `Done` while current-main still carries rolling or candidate docs freshness debt. `CO-429` owns only the six CO-41 `linear-af97d673` registry rows, and `CO-428` owns the March 30 active-spec cohort. Neither lane should absorb this recurring owner re-home.
- Desired Outcome: create the CO-430 traceability packet and then use CO-430 as the live same-project owner or justified replacement blocker for `docs:freshness:maintain`, preserving freshness policy, rolling debt visibility, and exact canonical owner key semantics.

## User Request Translation
- User intent / needs:
  - keep the queue honest by carrying the required packet and mirrors through the actual CO-430 repair
  - repair the live `docs:freshness:maintain` owner after terminal `CO-425` by re-homing the policy owner to `CO-430`
  - do not widen CO-429, CO-428, or CO-427 while resolving the maintenance owner chain
  - normalize the malformed Linear acceptance criteria into real checklist items before provider intake
- Success criteria / acceptance:
  - CO-430 packet and mirrors exist in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - `docs:freshness:maintain` terminal-owner output for `CO-425` is reproduced before implementation
  - a live same-project owner or justified replacement blocker is recorded for canonical owner key `docs:freshness:maintain`
  - rolling and candidate debt remain visible and policy-enforced, including the March 28 retained rolling cohort and the separate March 30 spec/candidate blockers
- Constraints / non-goals:
  - no CO-429 six-row registry changes
  - no CO-428 active-spec cohort changes
  - no `docs:freshness` or `docs:freshness:maintain` policy weakening
  - no deletion of historical packet docs
  - no unrelated implementation outside the docs freshness owner metadata and packet/mirror truth

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `docs:freshness:maintain`
  - `docs:freshness`
  - `docs/docs-catalog.json`
  - `docs/docs-freshness-registry.json`
  - `CO-425 terminal Done owner`
  - canonical owner key `docs:freshness:maintain`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Protected terms / exact artifact and surface names:
  - `.agent/task/linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
  - `docs/PRD-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
  - `docs/TECH_SPEC-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
  - `docs/ACTION_PLAN-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
  - `tasks/specs/linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
  - `tasks/tasks-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
- Nearby wrong interpretations to reject:
  - collapse CO-430 into CO-427 without packet evidence
  - widen CO-429 beyond the six CO-41 registry rows
  - widen CO-428 beyond the March 30 active-spec cohort
  - weaken freshness policy so terminal owner checks stop blocking
  - delete packet docs or registry rows to make the gate pass

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| CO-430 admission | CO-430 has left `Backlog` and is now the active provider-worker lane. | Helper-created follow-ups must not leave `Backlog` before traceability setup. | Packet and mirrors stay current while implementation records the actual re-home. | Forcing review without packet and owner evidence. |
| `docs:freshness:maintain` owner truth | Configured owner `CO-425` is terminal `Done`; pre-fix maintenance output reports `configured_owner_terminal` with `blocking_changed_paths=[]`. | Terminal owners are historical evidence only; live ownership must be same-project and non-terminal or explicitly blocked. | `docs/docs-catalog.json` points the live policy owner at `CO-430`, and post-fix maintenance output verifies a non-terminal same-project owner or records the remaining non-owner blocker. | Treating terminal `CO-425` as still usable. |
| CO-429 boundary | CO-429 owns only six CO-41 `linear-af97d673` registry rows. | Registry-row cleanup and recurring owner maintenance are separate lanes. | CO-429 remains separate in scope; the CO-428 integration branch carries CO-429, CO-430, and CO-428 metadata repairs together for validation. | Absorbing owner re-home work into CO-429. |
| CO-427 boundary | CO-427 remains downstream blocked behind CO-428. | Duplicate-owner drift must be resolved by explicit packet scope. | CO-430 packet states it is the narrow live-owner repair after CO-425; CO-427 remains downstream queue work. | Collapsing CO-430 into CO-427 without evidence. |

## Not Done If
- CO-430 leaves `Backlog` without the packet and mirror entries.
- `docs:freshness:maintain` still reports `configured_owner_terminal` for `CO-425` after implementation.
- CO-429 or CO-428 scope is widened to absorb the owner re-home.
- Freshness policy, rolling debt visibility, or registry coverage is weakened.
- Historical packet docs are deleted to make validation pass.

## Goals
- Create and register the CO-430 docs-first packet.
- Re-home `docs/docs-catalog.json` live rolling-freshness owner metadata from terminal `CO-425` to active same-project `CO-430`.
- Update `docs/guides/docs-freshness-cohorts.md` to preserve CO-425 as historical evidence and declare CO-430 as the current owner.
- Preserve exact protected owner and freshness terms before provider intake.
- Normalize acceptance criteria into real checklist items.
- Record CO-430 as a narrow live-owner repair, not a CO-427 collapse.
- Keep mirrors current so review surfaces show the real owner repair, not only the intake packet.

## Non-Goals
- No unrelated implementation beyond the owner re-home docs metadata and packet/mirror updates.
- No CO-429 registry-row edits.
- No CO-428 active-spec edits.
- No CO-427 PR or owner-lane changes.
- No freshness policy weakening or deletion-only cleanup.

## Stakeholders
- Product: CO operators relying on truthful queue and docs freshness owner state.
- Engineering: provider-worker and docs freshness maintainers.
- Review: reviewers checking that owner re-home scope remains narrow and auditable.

## Metrics & Guardrails
- Primary Success Metrics:
  - all six packet files exist
  - `docs/docs-catalog.json` owner issue is `CO-430`
  - `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` reference `linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c`
  - acceptance criteria are real Markdown checkboxes
  - protected terms scan cleanly across packet and mirrors
  - post-fix maintenance evidence no longer reports terminal configured owner `CO-425`
- Guardrails / Error Budgets:
  - zero freshness policy changes during packet setup
  - zero CO-429/CO-428 implementation changes
  - zero duplicate-owner ambiguity left unacknowledged

## Technical Considerations
- Architectural Notes:
  - This lane performs the owner re-home after the packet unlocked provider-worker intake.
  - The provider lane reproduced `docs:freshness:maintain` before choosing CO-430 as the live owner.
  - `CO-425` remains terminal historical evidence after this lane.
- Dependencies / Integrations:
  - `scripts/docs-freshness-maintain.mjs`
  - `docs/docs-catalog.json`
  - `docs/docs-freshness-registry.json`
  - `tasks/index.json`
  - `docs/TASKS.md`

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: this packet does not add a fallback. It prepares a bounded owner re-home so the existing terminal-owner fail-closed behavior stays intact.
- Large-refactor check: not applicable for packet setup. If implementation discovers repeated owner-churn friction, file a separate substrate issue rather than adding another hidden fallback.

## Open Questions
- None for the owner re-home. Standalone review handoff was blocked by separate March 30 active-spec/candidate debt outside CO-430 scope; the CO-428 integration branch now carries both repairs for combined validation.

## Approvals
- Product: CO-430 issue prompt, accepted as execution contract
- Engineering: parent orchestrator packet setup, 2026-04-30
- Design: N/A
