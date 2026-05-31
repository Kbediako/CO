---
id: 20260508-linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675
title: CO-509 auto-created issue labels, relations, and traceability
relates_to: docs/PRD-linear-07d1fdee-8a77-4a7f-90fc-0a13fd96c675.md
risk: medium
owners:
  - Codex
last_review: 2026-05-31
---

## Summary
- Objective: Make provider-created Linear issues carry complete label, related-link, and packet/mirror traceability evidence at creation or immediate reconciliation time.
- Scope: `codex-orchestrator linear create-follow-up`, canonical-owner reuse, provider-created follow-up readiness evidence, and fail-closed reporting when required labels, relations, or packet/mirror traces are missing.
- Constraints: Preserve existing WIP caps, state names, source issue ownership, and label taxonomy.

## Issue-Shaping Contract
- User-request translation carried forward: Automatically created issues should be labelled accordingly and related issues should be linked; current queue evidence shows packet/mirror traceability must be part of that readiness contract.
- Protected terms / exact artifact and surface names: `create-follow-up`, provider-created follow-ups, canonical-owner reuse, Linear labels, related issue link, Backlog, packet/mirror traceability, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- Nearby wrong interpretations to reject: Do not add a manual cleanup checklist only. Do not skip relation repair when description update verification is incomplete. Do not silently create Backlog issues with packet prefixes but missing files and registry mirrors.
- Explicit non-goals carried forward: No broad Linear workflow rewrite, WIP cap changes, provider-intake redesign, label taxonomy redesign, or review-contract implementation.

## Parity / Alignment Matrix

| Surface | Current | Reference | Target |
| --- | --- | --- | --- |
| Label readiness | CO-482 derives labels, but partial paths still need end-to-end proof. | Source issue labels are the authority for type, area, lifecycle, and priority. | Created/reused follow-ups return observed label evidence or fail closed. |
| Related links | Description normalization drift can stop relation reconciliation after issue creation. | Same-project follow-ups must be related to their source issue. | Relation reconciliation runs for creation and canonical-owner reuse, with explicit failure details. |
| Packet/mirror traceability | Backlog has follow-up packet prefixes with missing files and mirrors. | Backlog promotion requires durable packet and registry mirror evidence. | Helper scaffolds/requires packet and mirrors, or emits fail-closed evidence before admission. |

## Readiness Gate
- Not done if: Any provider-created follow-up can be created or reused without labels, related-link evidence, or packet/mirror readiness/fail-closed evidence.
- Pre-implementation issue-quality review evidence: CO-509 issue text was updated on 2026-05-08 with CO-514 and CO-517 evidence plus the queue audit showing missing packet/mirror traces across remaining Backlog follow-ups.
- Safeguard ownership split: Helper code owns create/reuse evidence. Provider intake owns WIP cap and state admission. Individual future implementation lanes own their task-specific packet content.

## Technical Requirements
- Functional requirements:
  - Derive required label ids from live source issue labels and verify them on the target issue.
  - Create or verify a `related` relation between source issue and follow-up issue for creation and canonical-owner reuse paths.
  - Ensure provider-created follow-ups either have packet/mirror scaffolding evidence or return an explicit machine-readable blocker before Backlog admission is accepted.
  - Preserve details for partial paths such as `linear_follow_up_description_update_incomplete`.
- Non-functional requirements:
  - Fail closed on missing, paginated, stale, or malformed label/relation/packet evidence.
  - Keep output deterministic and suitable for provider-worker truth/audit surfaces.
- Interfaces / contracts:
  - `codex-orchestrator linear create-follow-up --format json`
  - Linear GraphQL label and issue relation mutations
  - Task packet file paths and registry mirrors

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-created issue readiness | Treating partial description-update success as enough even when relations or packet traces are unproven | remove fallback | CO-509 | `create-follow-up` creation/reuse | 2026-05-08 evidence | 2026-05-08 | No retained fallback | Relation and packet readiness are proven or helper fails closed | Focused facade tests and live machine output |

- Large-refactor check: A bounded helper update is preferred now because `create-follow-up` already centralizes source issue context, label resolution, issue creation, and relation creation. Escalate to a larger refactor only if packet scaffolding cannot be kept as a coherent helper-owned subroutine.

## Architecture & Data
- Architecture / design adjustments: Add packet/mirror readiness as a first-class create/reuse outcome beside labels and relations.
- Data model changes / migrations: No persistent schema migration expected; task packet files and registry mirrors remain existing repo data.
- External dependencies / integrations: Linear GraphQL API and existing docs freshness registries.

## Validation Plan
- Tests / checks:
  - Focused `ProviderLinearWorkflowFacade` tests for label creation, relation reconciliation, canonical-owner reuse, missing-label fail-closed, and packet/mirror missing fail-closed behavior.
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - Focused helper CLI smoke output for a fixture or mocked path.
- Rollout verification: Verify a created/reused follow-up returns labels, `relations.related=true`, and packet/mirror readiness or a precise fail-closed blocker.
- Monitoring / alerts: Watch `co-status` backlog promotion holds for `backlog_head_follow_up_traceability_pending` after rollout.

## Open Questions
- Whether to include direct non-helper issue creation in CO-509 or leave direct GraphQL operator-created tickets to a later helper.

## Approvals
- Reviewer: Pending.
- Date: 2026-05-08
