# ACTION PLAN - CO-509 Auto-Created Issue Labels, Relations, and Traceability

## Summary
- Goal: Turn CO-509 from a Backlog idea into an implementation-ready lane with a durable packet and narrow sequencing.
- Scope: Packet/mirror setup first; later implementation should update provider-created issue helpers to verify labels, relations, and packet/mirror traceability or fail closed.
- Assumptions: CO-482 label derivation remains the nearby implementation precedent. CO-512 owns the broader governed review upgrade. CO-517 is stability debt for Core Lane tests, not part of CO-509 implementation.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `create-follow-up`, provider-created follow-ups, canonical-owner reuse, labels, related links, packet/mirror traceability, Backlog.
- Not done if: Auto-created issues can still enter Backlog with missing required labels, source/follow-up relation, or packet/mirror traceability without explicit fail-closed evidence.
- Pre-implementation issue-quality review: CO-509 is broader than manual cleanup because current queue admission is parked by missing packet/mirror traces on auto-created follow-ups. This issue is not the same as CO-512 review contract work.
- Fallback / refactor decision: The lane touches a stale/partial-success seam. Decision is remove fallback: partial creation must not be treated as ready unless labels, relation, and packet/mirror evidence are proven.
- Durable retention evidence: Not applicable; no retained fallback is intended.
- Large-refactor check: Keep implementation bounded to `create-follow-up` unless packet scaffolding cannot be cleanly owned there.

## Milestones & Sequencing
1. Packet setup: land PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent/task`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Implementation: update helper logic for labels, relation reconciliation, canonical-owner reuse recovery, and packet/mirror readiness or fail-closed output.
3. Validation and handoff: run focused tests, docs gates, spec guard, review, and ready-review before moving to review/merge.

## Dependencies
- CO-482 implementation precedent for live label derivation.
- CO-509 Linear comment `f440fafc-6bfe-4e87-aacb-5843a487467b` for fresh queue-admission evidence.
- CO-514 and CO-517 evidence for partial create-follow-up relation repair.

## Validation
- Checks / tests: `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run docs:freshness`, focused provider Linear facade tests, `npm run test`.
- Rollback plan: Revert helper changes and packet updates; leave Linear evidence comments intact for future re-planning.

## Risks & Mitigations
- Risk: Packet scaffolding inside issue creation may widen lifecycle ownership. Mitigation: fail closed with exact missing packet/mirror evidence if helper cannot safely scaffold.
- Risk: Relation creation errors may be hidden behind description drift. Mitigation: require relation reconciliation after creation and canonical-owner reuse.
- Risk: Label pagination or missing labels may produce partial truth. Mitigation: fail closed on paginated or incomplete label evidence.

## Approvals
- Reviewer: Pending.
- Date: 2026-05-08
