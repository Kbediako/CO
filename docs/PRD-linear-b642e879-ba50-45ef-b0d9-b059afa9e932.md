# PRD - CO-522 docs:freshness:maintain owner recovery and pre-expiry burn-down

## Traceability
- Linear issue: `CO-522` / `b642e879-ba50-45ef-b0d9-b059afa9e932`
- Task id: `linear-b642e879-ba50-45ef-b0d9-b059afa9e932`
- Canonical registry id: `20260512-linear-b642e879-ba50-45ef-b0d9-b059afa9e932`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Before owner-truth report: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932/before-docs-freshness-maintenance-report.json`
- After owner-truth report: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932/after-docs-freshness-maintenance-report.json`
- Accepted child slice: `.runs/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-co522-task-checklist/cli/2026-05-12T17-20-16-231Z-292db3b2/manifest.json`
- 2026-05-18 recovery report: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/docs-freshness-maintenance.json`
- 2026-05-18 disposition manifest: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/disposition-manifest.json`

## Summary
CO-514 validation surfaced repo-wide docs freshness debt outside CO-514's provider-worker manifest serialization scope. `docs:freshness:maintain -- --format json` identified the canonical owner key `docs:freshness:maintain`, but the configured owner `CO-511` is terminal `Done`, so future provider-worker lanes see `configured_owner_terminal` and cannot route baseline debt to a live owner.

CO-522 restores the live same-project owner by re-homing `rolling_freshness_cohorts.owner_issue` from terminal `CO-511` to live `CO-522`, while preserving stale-doc evidence, canonical owner reuse semantics, and strict `docs:freshness` / `spec-guard` behavior.

2026-05-18 recovery update: the owner-rehome PR is merged, but the live maintenance gate has advanced from terminal-owner routing to an active `block_spec_guard_pre_expiry` blocker under the same canonical owner. Current evidence reports `owner_issue=CO-522`, `owner_issue_verification.state=Blocked`, `spec_guard_status=succeeded`, `policy_capacity_status.current_entries=275`, `policy_capacity_status.current_cohorts=13`, `action_required_count=180`, and `blocks_handoff=true`. CO-522 now owns the burn-down plan for those current actions, not just the historical owner pointer.

## User Request Translation
- Create or reuse the canonical docs freshness maintenance owner for `canonical_owner_key=docs:freshness:maintain`.
- Keep CO-514 provider-worker manifest serialization out of scope.
- Preserve the exact blocker evidence: `owner_issue=CO-511`, `configured_owner_terminal`, `issue_state=Done`, `issue_state_type=completed`, `blocking_changed_paths=[]`, and `freshness_decision=block_diff_local`.
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, spec-guard, docs catalog, or registry validation.
- Do not blindly bump `last_review` or delete stale docs to clear gates.
- Recover CO-522 as the active implementation lane for the live `block_spec_guard_pre_expiry` gate while keeping Linear state `Blocked` until the gate is actually cleared.
- Keep CO-512 / PR #829 draft while `docs:freshness:maintain` reports `blocks_handoff=true`.

## Intent Checksum
- Protected terms:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `canonical_owner_key=docs:freshness:maintain`
  - `configured_owner_terminal`
  - `CO-511`
  - `CO-522`
  - `block_diff_local`
  - stale docs
  - registry rows
  - canonical owner reuse
- Reject interpretations that weaken docs freshness gates, delete stale packet evidence, blindly refresh review dates, or expand CO-514 provider-worker manifest serialization into repo-wide docs freshness repair.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Live owner metadata | `docs/docs-catalog.json` names terminal `CO-511` as owner. | Terminal owners are evidence only and must not remain live owner metadata. | `docs/docs-catalog.json` names live same-project `CO-522`. | Code changes to owner-verification logic. |
| Maintenance output | `docs:freshness:maintain` reports `configured_owner_terminal` for `CO-511`. | Provider-worker lanes need a non-terminal owner or clear replacement action. | Output no longer reports `configured_owner_terminal` for `docs:freshness:maintain`. | Making all stale docs green by broad repair. |
| Stale cohort evidence | Baseline includes 617 stale entries, 611 blocking candidate entries, 33 candidate cohorts, 6 hard-stale entries, and no missing registry rows. | Baseline debt remains visible and machine-routable. | Packet and guide preserve the stale cohort evidence under CO-522. | Blind `last_review` bumps or stale-doc deletion. |
| CO-514 scope | CO-514 owns provider-worker manifest serialization. | Unrelated implementation lanes should not absorb repo-wide docs freshness debt. | CO-522 owns owner routing only. | Lifecycle authority changes for CO-514. |
| 2026-05-18 live gate | `docs:freshness:maintain` reports `block_spec_guard_pre_expiry`, `action_required_count=180`, `blocks_handoff=true`, and one hard-stale current doc. | Owner re-home is not remediation unless current actions are cleared or explicitly owner-deferred. | Every current action has an evidence-backed disposition and the gate reports `blocks_handoff=false` before handoff. | Duplicate owner issues, cap/window increases, or metadata-only freshness bumps. |

## Not Done If
- `docs:freshness:maintain` still reports `configured_owner_terminal` for `canonical_owner_key=docs:freshness:maintain`.
- The live owner remains terminal or unusable.
- The diff weakens `docs:freshness`, `docs:freshness:maintain`, spec-guard, docs catalog, or registry validation.
- The repair deletes stale docs, hides stale rows, or blindly bumps `last_review`.
- CO-514 provider-worker manifest serialization scope is changed.
- CO-522 remains only a nominal owner while `action_required_count > 0` or `blocks_handoff=true`.
- CO-512 / PR #829 leaves draft or review-blocked posture while the CO-522 gate still blocks handoff.

## Goals
- Keep the live `docs:freshness:maintain` owner on same-project non-terminal `CO-522`.
- Preserve stale cohort evidence and canonical owner marker traceability.
- Register and refresh the CO-522 packet and registry mirrors.
- Burn down the live pre-expiry/current-action gate through real review, archive, reclassification, or explicit same-project owner deferral.
- Validate owner truth and handoff readiness without weakening freshness gates.

## Non-Goals
- No CO-514 provider-worker manifest serialization changes.
- No unrelated product or provider-worker implementation changes.
- No changes to owner-verification code.
- No blind `last_review` churn, cohort cap/window widening, or stale packet deletion to silence validation.
- No lifecycle authority changes for CO-514.
- No duplicate canonical owner for `docs:freshness:maintain` while CO-522 verifies live.

## Metrics & Guardrails
- Before report captures terminal `CO-511` evidence.
- After report verifies live `CO-522` as same-project non-terminal owner with `owner_issue_action.reason=succeeded`, `state=In Progress`, and `usable=true`.
- `blocking_changed_paths=[]` remains visible as evidence that the blocker is owner-routed baseline debt.
- Packet and registry JSON parse cleanly.
- Validation commands are recorded without bypass flags.
- 2026-05-18 disposition manifest records four groups: strict hard-stale current docs, strict pre-expiry current docs, spec-guard pre-expiry active specs, and historical task/report stale cohorts.
- Handoff is blocked while `repo_gate.blocks_handoff=true`.

## Open Questions
- None.

## CO-382 Fallback Decision Table

Large-refactor decision: bounded metadata repair; no large refactor is warranted because CO-522 re-homes the existing docs freshness owner pointer without changing owner-verification code or broad stale-doc classification.
Minor-seam decision: expire the owner-routing seam under live CO-522 evidence while the stale cohort baseline remains visible and over budget.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Live owner pointer for repo-wide stale cohort baseline after terminal `CO-511` | expire fallback | CO-522 provider worker | `configured_owner_terminal` for `canonical_owner_key=docs:freshness:maintain` blocked provider-worker lanes | 2026-05-12 | 2026-05-12 | 2026-05-19 | Refresh, archive, or reclassify the underlying stale cohorts; if CO-522 stops verifying as a live same-project owner first, route through canonical owner reuse again | Before/after `docs:freshness:maintain -- --format json`; `docs:freshness` and spec-guard remain strict and still expose baseline stale debt |
