# TECH_SPEC - CO-430 re-home live docs freshness maintenance owner after terminal CO-425

## Canonical Reference
- PRD: `docs/PRD-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
- Task checklist: `tasks/tasks-linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
- Agent mirror: `.agent/task/linear-b78c98eb-8ed4-4e19-9099-81d5e34bb33c.md`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`

## Summary
- Objective: complete CO-430 as the live owner-rehome lane for `docs:freshness:maintain` after terminal `CO-425`.
- Scope:
  - CO-430 packet and task mirrors
  - `docs/docs-catalog.json` live owner metadata
  - `docs/guides/docs-freshness-cohorts.md` owner lineage
  - normalized acceptance criteria for provider intake
  - implementation contract for reproducing and repairing terminal owner truth
- Constraints:
  - preserve `docs:freshness`, `docs:freshness:maintain`, `docs/docs-catalog.json`, and `docs/docs-freshness-registry.json`
  - preserve CO-429 and CO-428 boundaries
  - do not collapse into CO-427 without fresh owner evidence
  - do not weaken terminal-owner fail-closed behavior

## Issue-Shaping Contract
- User-request translation carried forward: CO-430 exists because the previous live `docs:freshness:maintain` owner, `CO-425`, became terminal `Done`; this is recurring owner-maintenance work outside CO-429's six-row registry cleanup and CO-428's March 30 spec cohort repair.
- Protected terms / exact artifact and surface names:
  - `docs:freshness:maintain`
  - `docs:freshness`
  - `docs/docs-catalog.json`
  - `docs/docs-freshness-registry.json`
  - `CO-425 terminal Done owner`
  - `docs:freshness:maintain`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Nearby wrong interpretations to reject:
  - collapse CO-430 into CO-427 before packet evidence
  - widen CO-429 beyond the six CO-41 `linear-af97d673` rows
  - widen CO-428 beyond the March 30 active-spec cohort
  - make terminal owners pass by policy weakening
  - delete historical packet docs
- Explicit non-goals carried forward:
  - no CO-429 registry-row edits
  - no CO-428 spec-frontmatter edits
  - no CO-427 PR lifecycle work
  - no freshness policy, cap, or gate weakening

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Queue admission | CO-430 has an active provider-worker run after packet setup. | Packet and mirror setup must happen before `Ready`. | Packet remains synchronized with the owner repair and validation evidence. | Force-review without mirrors. |
| Owner verification | `CO-425` is terminal `Done`, and pre-fix output records `configured_owner_terminal` with `blocking_changed_paths=[]`. | `docs:freshness:maintain` requires a live owner or explicit blocker. | `docs/docs-catalog.json` re-homes ownership to active same-project `CO-430`; post-fix output no longer reports terminal configured owner `CO-425`. | Treating `CO-425` as live. |
| Downstream blockers | CO-429 is blocked by CO-430 and CO-428; CO-427 is blocked by CO-428. | Each blocker stays scoped to its own debt. | CO-430 clears only owner-rehome debt. | Combining all docs freshness debt into one silent patch. |

## Readiness Gate
- Not done if:
  - packet files or mirror entries are absent
  - CO-430 leaves `Backlog` with malformed escaped checkboxes
  - `docs:freshness:maintain` terminal-owner behavior is bypassed instead of fixed
  - CO-429, CO-428, or CO-427 scope is silently widened
- Pre-implementation issue-quality review evidence:
  - 2026-04-30: read-only queue audit confirmed CO-430 is `Backlog`, P2, labeled Docs/Infra/Bug/Analysis, and blocks CO-429.
  - 2026-04-30: traceability audit confirmed all six packet files and mirror references were missing before this setup.
  - 2026-04-30: provider-worker reproduced pre-fix maintenance output with `owner_issue=CO-425`, `configured_owner_terminal`, and `blocking_changed_paths=[]`; the overall decision remained `block_diff_local` because separate current diff/spec blockers were still visible.
  - 2026-04-30: malformed Linear acceptance criteria were normalized in this packet.
- Safeguard ownership split:
  - this lane owns traceability setup plus the live owner metadata re-home
  - CO-429 and CO-428 continue to own their separate registry-row and active-spec/candidate blockers

## Technical Requirements
- Functional requirements:
  1. Add all six CO-430 packet files.
  2. Add `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` mirrors.
  3. Preserve exact canonical owner marker.
  4. Normalize acceptance criteria into real checkboxes.
  5. Re-home `docs/docs-catalog.json` rolling_freshness_cohorts.owner_issue from `CO-425` to `CO-430`.
  6. Update `docs/guides/docs-freshness-cohorts.md` so `CO-425` is historical evidence and `CO-430` is current owner.
  7. State that CO-430 is not collapsed into CO-427 without evidence.
- Non-functional requirements:
  - docs-only owner metadata setup
  - concise packet content
  - no freshness policy changes
  - machine-readable JSON remains valid
- Interfaces / contracts:
  - control-host autopilot checks file existence and mirror string presence before promoting helper-created follow-ups
  - provider worker consumes packet and Linear issue context after `Ready`
  - `docs:freshness:maintain` verifies live owner liveness through Linear issue-context
  - docs freshness registry tracks packet freshness coverage

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` owner re-home | terminal owner becomes historical evidence while new live owner is required | expire fallback | CO-430 | configured owner `CO-425` is terminal Done | 2026-04-30 | 2026-05-04 | until live owner is repaired or replacement blocker is recorded | owner metadata points at non-terminal same-project issue or explicit blocker | `docs:freshness:maintain` plus provider-worker proof |

- Large-refactor check: repeated owner churn may need a future substrate improvement, but this packet should not create a new seam. It keeps the current fail-closed owner contract visible and routes implementation to the existing provider-worker lane.

## Architecture & Data
- Architecture / design adjustments:
  - `docs/docs-catalog.json` owner_issue changes from terminal `CO-425` to active `CO-430`
  - docs freshness cohort guide records the CO-425 terminal-owner evidence and CO-430 disposition
- Data model changes / migrations:
  - none in packet setup
- External dependencies / integrations:
  - Linear issue context
  - control-host autopilot backlog promotion hold
  - docs freshness maintenance scripts

## Validation Plan
- Tests / checks:
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - targeted `rg` scan for packet id, CO-430, protected owner marker, and `docs:freshness:maintain`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - `npm run docs:check` when feasible
- Rollout verification:
  - post-fix maintenance evidence should verify `CO-430` as same-project, non-terminal, and usable
  - any remaining freshness/spec failure should keep its own owner evidence instead of being absorbed into CO-430
- Monitoring / alerts:
  - watch CO-430 intake after Ready
  - keep WIP under cap
  - route new blockers into Linear with labels and owner edges

## Open Questions
- None for packet setup.

## Approvals
- Reviewer: parent orchestrator
- Date: 2026-04-30
