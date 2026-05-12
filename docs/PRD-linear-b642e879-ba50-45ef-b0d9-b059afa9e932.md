# PRD - CO-522 docs:freshness:maintain owner rehome after CO-511 terminal

## Traceability
- Linear issue: `CO-522` / `b642e879-ba50-45ef-b0d9-b059afa9e932`
- Task id: `linear-b642e879-ba50-45ef-b0d9-b059afa9e932`
- Canonical registry id: `20260512-linear-b642e879-ba50-45ef-b0d9-b059afa9e932`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Before owner-truth report: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932/before-docs-freshness-maintenance-report.json`
- After owner-truth report: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932/after-docs-freshness-maintenance-report.json`
- Accepted child slice: `.runs/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-co522-task-checklist/cli/2026-05-12T17-20-16-231Z-292db3b2/manifest.json`

## Summary
CO-514 validation surfaced repo-wide docs freshness debt outside CO-514's provider-worker manifest serialization scope. `docs:freshness:maintain -- --format json` identified the canonical owner key `docs:freshness:maintain`, but the configured owner `CO-511` is terminal `Done`, so future provider-worker lanes see `configured_owner_terminal` and cannot route baseline debt to a live owner.

CO-522 restores the live same-project owner by re-homing `rolling_freshness_cohorts.owner_issue` from terminal `CO-511` to live `CO-522`, while preserving stale-doc evidence, canonical owner reuse semantics, and strict `docs:freshness` / `spec-guard` behavior.

## User Request Translation
- Create or reuse the canonical docs freshness maintenance owner for `canonical_owner_key=docs:freshness:maintain`.
- Keep CO-514 provider-worker manifest serialization out of scope.
- Preserve the exact blocker evidence: `owner_issue=CO-511`, `configured_owner_terminal`, `issue_state=Done`, `issue_state_type=completed`, `blocking_changed_paths=[]`, and `freshness_decision=block_diff_local`.
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, spec-guard, docs catalog, or registry validation.
- Do not blindly bump `last_review` or delete stale docs to clear gates.

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

## Not Done If
- `docs:freshness:maintain` still reports `configured_owner_terminal` for `canonical_owner_key=docs:freshness:maintain`.
- The live owner remains terminal or unusable.
- The diff weakens `docs:freshness`, `docs:freshness:maintain`, spec-guard, docs catalog, or registry validation.
- The repair deletes stale docs, hides stale rows, or blindly bumps `last_review`.
- CO-514 provider-worker manifest serialization scope is changed.

## Goals
- Re-home the live `docs:freshness:maintain` owner from terminal `CO-511` to live `CO-522`.
- Preserve stale cohort evidence and canonical owner marker traceability.
- Register the CO-522 packet and registry mirrors.
- Validate before/after owner truth without weakening freshness gates.

## Non-Goals
- No CO-514 provider-worker manifest serialization changes.
- No broad stale-doc repair.
- No changes to owner-verification code.
- No stale packet deletion or blind `last_review` churn.
- No lifecycle authority changes for CO-514.

## Metrics & Guardrails
- Before report captures terminal `CO-511` evidence.
- After report verifies live `CO-522` as same-project non-terminal owner with `owner_issue_action.reason=succeeded`, `state=In Progress`, and `usable=true`.
- `blocking_changed_paths=[]` remains visible as evidence that the blocker is owner-routed baseline debt.
- Packet and registry JSON parse cleanly.
- Validation commands are recorded without bypass flags.

## Open Questions
- None.
