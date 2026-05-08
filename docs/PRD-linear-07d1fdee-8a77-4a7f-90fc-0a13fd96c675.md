# PRD - CO-509 Auto-Created Linear Issue Labels, Relations, and Traceability

## Summary
- Problem Statement: Provider-created follow-up and canonical-owner issues can enter Backlog without the full label, related-link, and packet/mirror traceability needed for queue admission. Recent CO-514 and CO-517 evidence showed partial create-follow-up failures where the issue existed and labels were present, but relation or packet setup still needed manual repair.
- Desired Outcome: Automatically created Linear issues are either fully ready for governed Backlog admission with labels, related links, and packet/mirror traceability, or they fail closed with machine-readable evidence before silent queue drift.

## User Request Translation (Context Anchor)
- User intent / needs: The operator wants auto-created Linear issues labelled properly, linked to related/source issues, and shaped enough that the queue can process them without manual cleanup.
- Success criteria / acceptance: Creation and reuse paths apply correct labels, verify source/follow-up related links, produce or require packet/mirror traceability, and fail closed when required labels or traceability evidence cannot be proven.
- Constraints / non-goals: Keep the change bounded to provider-created issue helpers and queue-admission traceability. Do not redesign Linear states, WIP caps, provider intake, or label taxonomy.

## Intent Checksum
- Exact user wording / phrases to preserve: "make sure issues are labelled properly"; "when issues are automatically created they're labelled accordingly and related issues are linked".
- Protected terms / exact artifact and surface names: `create-follow-up`, provider-created follow-ups, canonical-owner reuse, Linear labels, related issue link, source issue relation, Backlog, packet/mirror traceability, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- Nearby wrong interpretations to reject: Do not only document manual label cleanup. Do not create relations only after a worker has already started. Do not rely on stale packet prefixes without real files and registry mirrors. Do not broaden into unrelated provider-intake admission policy.

## Parity / Alignment Matrix
| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Labels | CO-482 added live-label derivation for `create-follow-up`, but follow-up label evidence still needs end-to-end verification across reuse and partial failure paths. | Source issue labels define type, area, lifecycle, and priority expectations. | Created/reused issues carry required labels at creation or immediate reconciliation time and report missing labels fail-closed. | Label taxonomy redesign. |
| Related links | CO-514 and CO-517 showed relation reconciliation can be skipped when description update verification returns incomplete. | Same-project follow-ups should be related to their source issue, with optional blocker linkage only when requested. | Relation creation/reconciliation runs for created and canonical-owner reuse paths, even after recoverable description normalization drift. | Changing issue dependency semantics. |
| Packet/mirror traceability | Queue audit after CO-508 found multiple Backlog follow-ups with packet prefixes but missing six packet files and registry mirrors. | Backlog promotion expects follow-up packet and registry mirrors before automatic admission. | Auto-created issues either scaffold or require the six packet files and three registry mirrors before leaving Backlog, or return explicit fail-closed evidence. | Implementing every existing Backlog packet manually in this lane. |

## Not Done If
- Automatically created issues can be created without required type, area, lifecycle, or priority labels.
- Same-project follow-ups lack a related link to the source issue after creation or canonical-owner reuse.
- A follow-up issue carries a packet prefix while the six packet files or registry mirrors are missing and no fail-closed evidence is emitted.
- Description-normalization drift can stop relation or packet/mirror reconciliation after an issue has already been created.
- The fix relies on manual cleanup by the top-level operator as the normal path.

## Goals
- Apply and verify required Linear labels on provider-created follow-up issues.
- Preserve or repair source/follow-up related links for created and reused canonical-owner issues.
- Add durable packet/mirror traceability handling or explicit fail-closed evidence for auto-created issues before queue admission.
- Cover partial creation paths such as `linear_follow_up_description_update_incomplete`.

## Non-Goals
- No broad Linear workflow rewrite.
- No changes to WIP caps, state names, or provider-intake scheduling.
- No label taxonomy redesign unless a required label is missing and must be reported.
- No implementation of the governed review upgrade itself; CO-512 owns review contract research.

## Stakeholders
- Product: CO operator workflow.
- Engineering: Codex Orchestrator provider-worker and Linear helper maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: New provider-created issues have complete labels and related-link evidence; missing packet/mirror traceability returns explicit machine-readable blockers; Backlog does not silently park on auto-created issue cleanup debt.
- Guardrails / Error Budgets: Fail closed on missing labels, paginated/partial label evidence, relation creation failure, or packet/mirror traceability gaps. Preserve existing queue cap and state-transition rules.

## User Experience
- Personas: Top-level CO operator, provider-worker lanes, review/merge shepherds.
- User Journeys: A worker files a follow-up; the helper creates or reuses a canonical owner; the issue is labelled, linked, traceable, and either ready for governed admission or visibly blocked with exact missing evidence.

## Technical Considerations
- Architectural Notes: Extend existing `create-follow-up` helper validation and canonical-owner reuse logic instead of adding an out-of-band cleanup script.
- Dependencies / Integrations: Linear GraphQL issue labels, issue relations, issue description updates, task packet files, task registry mirrors, docs freshness registry.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove/avoid fallback behavior for auto-created issue readiness. Do not treat partial description-update success as sufficient if labels, relations, or packet/mirror traceability are unproven.
- Owner: CO-509.
- Trigger: Provider-created issue creation or canonical-owner reuse.
- Introduced date: Evidence observed through CO-514 and CO-517 on 2026-05-08.
- Review date: 2026-05-08.
- Maximum lifetime: No retained fallback; implementation must fail closed or complete reconciliation.
- Removal condition: Not applicable because the target is deterministic validation, not a retained fallback.
- Validation: Focused `ProviderLinearWorkflowFacade` tests plus live helper machine output proving labels, relation state, and packet/mirror readiness or fail-closed details.
- Large-refactor check: A bounded helper update is acceptable because the owner surface is already centralized in `create-follow-up`; if packet scaffolding crosses multiple lifecycle phases, split it into a helper-owned packet setup subroutine rather than ad hoc queue cleanup.

## Open Questions
- Should direct non-follow-up issue creation also scaffold packets in the same helper path, or should CO-512/CO-515/CO-516 style direct GraphQL issue creation remain operator-owned until a separate helper exists?

## Approvals
- Product: Pending.
- Engineering: Pending.
- Design: Not applicable.
