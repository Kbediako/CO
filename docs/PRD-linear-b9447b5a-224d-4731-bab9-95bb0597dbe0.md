# PRD - CO-558 docs freshness maintenance owner replacement

## Traceability
- Linear issue: `CO-558` / `b9447b5a-224d-4731-bab9-95bb0597dbe0`
- Task id: `linear-b9447b5a-224d-4731-bab9-95bb0597dbe0`
- Canonical registry id: `20260519-linear-b9447b5a-224d-4731-bab9-95bb0597dbe0`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
- Before report: `out/linear-b9447b5a-224d-4731-bab9-95bb0597dbe0/before/docs-freshness-maintenance.json`

## Summary
- Problem Statement: `docs:freshness` and `docs:freshness:maintain` reached a new May 19 stale baseline while the configured docs freshness maintenance owner `CO-522` is terminal `Done`. The gate now reports `configured_owner_terminal`, `blocking_changed_paths=[]`, stale historical task packet evidence, strict pre-expiry skill/template entries, and spec pre-expiry rows that need governed owner action.
- Desired Outcome: Re-home the live docs freshness maintenance owner to non-terminal same-project `CO-558`, keep stale/pre-expiry evidence machine-visible, and repair only the May 19 maintenance surfaces through source-specific lifecycle or review evidence without weakening the gates.

## User Request Translation
- Replace terminal `CO-522` as the usable `docs:freshness:maintain` owner for canonical owner key `docs:freshness:maintain`.
- Preserve the exact blocker evidence: `CO-522 terminal owner`, `configured_owner_terminal`, `blocking_changed_paths=[]`, `task_mirror`, `task_packet`, `report_only`, `pre_expiry_entries`, and `docs/docs-freshness-registry.json`.
- Keep CO-515 source freshness changes out of scope unless direct CO-515 docs freshness regression evidence appears.
- Use source-specific lifecycle evidence for the May 19 stale historical task/report cohort and direct review evidence for strict pre-expiry skill/template/spec entries.
- Validate with `npm run docs:freshness`, `npm run docs:freshness:maintain`, `node scripts/spec-guard.mjs --dry-run`, and `npm run docs:check`.

## Intent Checksum
- Exact phrases to preserve:
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `docs freshness maintenance owner`
  - `CO-522 terminal owner`
  - `configured_owner_terminal`
  - `blocking_changed_paths`
  - `task_mirror`
  - `task_packet`
  - `report_only`
  - `pre_expiry_entries`
  - `docs/docs-freshness-registry.json`
- Reject interpretations that weaken `docs:freshness`, weaken `docs:freshness:maintain`, hide stale docs, delete historical docs solely to clear the gate, blindly bump `last_review` dates, or make CO-515 own unrelated docs freshness debt.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Live owner metadata | `docs/docs-catalog.json` names terminal `CO-522`. | Terminal owners are evidence only. | `docs/docs-catalog.json` names non-terminal same-project `CO-558`. | Owner-verification code changes. |
| Maintenance output | `docs:freshness:maintain` reports `configured_owner_terminal`, `blocking_changed_paths=[]`, and owner action mode `create_required`. | Provider-worker gates require live same-project owner truth. | Owner verification resolves to live `CO-558` and no longer blocks on terminal `CO-522`. | Faking owner state or reopening CO-522. |
| Historical stale cohort | May 19 report has 131 stale Apr 18 task/report rows across `.agent/task`, task packet, and report-only surfaces. | Stale historical docs stay visible and owner-routable. | Cohort is re-homed to CO-558 with retained rolling evidence or refreshed from source-specific lifecycle evidence. | Deleting historical packets or broad cap/window weakening. |
| Strict pre-expiry surfaces | Skill/template and active spec rows are inside the pre-expiry window. | Current guidance/specs require direct review before handoff. | Registry/spec `last_review` changes are backed by explicit CO-558 review evidence. | Metadata-only bumps without reviewing source content. |
| CO-515 boundary | CO-515 produced the follow-up evidence but owns control-host source freshness. | Unrelated implementation lanes do not absorb repo-wide docs freshness debt. | CO-515 changed paths remain out of the CO-558 maintenance diff. | Provider-intake, WIP cap, or lifecycle authority changes. |

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | May 19 owner-routed historical docs freshness cohort | `expire fallback` | `CO-558` | Terminal `CO-522` plus May 19 stale `.agent/task`, task packet, and report-only rows | 2026-05-19 | 2026-05-19 | 2026-05-25 | Refresh, archive, or reclassify the cohort before expiry; re-home again if `CO-558` becomes terminal | `npm run docs:freshness`; `npm run docs:freshness:maintain`; `node scripts/spec-guard.mjs --dry-run`; `npm run docs:check` |

Large-refactor check: Existing owner verification already detects terminal owners and emits canonical owner action evidence, so this lane repairs live owner metadata plus cohort evidence instead of adding another owner-resolution path.
Minor-seam decision: The retained cohort is bounded owner-routed debt under the existing `docs:freshness:maintain` contract, not a new compatibility seam.

## Not Done If
- `docs:freshness:maintain` still points at terminal `CO-522`.
- `docs:freshness` remains blocked by the same unrelated May 19 baseline cohort after owner handoff.
- Stale/pre-expiry docs are hidden, deleted, or silenced instead of routed or reviewed.
- The fix relies on blind `last_review` bumps without source-specific lifecycle evidence.
- CO-515 source freshness behavior, provider-intake logic, WIP caps, or Linear lifecycle authority changes.

## Goals
- Re-home `rolling_freshness_cohorts.owner_issue` to non-terminal `CO-558`.
- Preserve machine-visible stale/pre-expiry evidence in reports and docs.
- Account for May 19 `.agent/task`, task packet, report-only, skill/template, and spec pre-expiry rows.
- Keep the current diff bounded to docs freshness ownership and packet/registry mirrors.
- Reach review handoff with validation and review evidence, not guard weakening.

## Non-Goals
- No changes to CO-515 implementation scope.
- No `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, or docs catalog coverage weakening.
- No blind `last_review` churn.
- No deletion of historical docs solely to pass validation.
- No provider-intake, WIP-cap, control-host, or Linear lifecycle authority changes.

## Stakeholders
- Product: CO operators relying on accurate provider-worker gate and owner routing.
- Engineering: CO maintainers responsible for docs truthfulness, registry metadata, and provider handoff gates.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics:
  - `docs:freshness:maintain` owner verification resolves to non-terminal `CO-558`.
  - `docs:freshness` no longer reports the May 19 Apr 18 stale cohort as blocking stale docs.
  - Strict pre-expiry rows are reviewed or otherwise dispositioned with source-specific evidence.
  - `blocking_changed_paths=[]` remains visible for unrelated-diff proof.
- Guardrails / Error Budgets:
  - No policy cap/window expansion.
  - No stale-doc deletion shortcut.
  - Validation failures must be classified as lane-local, baseline, or follow-up before handoff.

## User Experience
- Personas: CO provider workers and reviewers.
- User Journeys: A provider worker reruns docs freshness gates and sees the May 19 baseline routed to a live same-project owner with preserved evidence, rather than blocked by terminal `CO-522`.

## Technical Considerations
- Architectural Notes: The fix is data/docs ownership repair: `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, docs-first packet files, task registry mirrors, and freshness registry metadata.
- Dependencies / Integrations: Linear owner verification via `docs:freshness:maintain`; docs freshness registry and task index; repo validation gates.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: `expire fallback` for retained rolling docs freshness debt.
- Owner: CO-558 provider worker.
- Trigger: May 19 `configured_owner_terminal` for `CO-522` plus stale/pre-expiry docs freshness maintenance rows.
- Introduced date: 2026-05-19.
- Review date: 2026-05-19.
- Maximum lifetime: 7 days after normal cadence expiry for the Apr 18 cohort, ending no later than 2026-05-25.
- Removal condition: Refresh, archive, or reclassify the underlying cohort before expiry; if CO-558 reaches terminal first, route through canonical owner reuse again.
- Validation: `npm run docs:freshness`, `npm run docs:freshness:maintain`, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, and review handoff evidence.
- Large-refactor check: Bounded owner re-home is acceptable because the existing owner verification and canonical owner helper already model this recurrence; this lane changes current owner metadata and cohort evidence, not the owner-resolution architecture.

## Open Questions
- None.

## Approvals
- Product: Linear CO-558 issue text.
- Engineering: Provider worker review and validation before handoff.
- Design: Not applicable.
