---
id: 20260525-linear-bb7589e8-b79d-405a-8408-5842a75d8b5d
title: CO-584 docs freshness registry lifecycle integrity hard block
relates_to: docs/PRD-linear-bb7589e8-b79d-405a-8408-5842a75d8b5d.md
risk: high
owners:
  - Codex
last_review: 2026-05-25
---

## Added by Bootstrap 2026-05-25

## Summary
- Objective: Make docs-freshness registry lifecycle integrity deterministic and repair the current archived/active contradiction.
- Scope: Registry rows, registry validation, maintenance blocker priority, focused regressions, and exact-owner preservation.
- Constraints: No blind date bumps, no deletion of historical packets, no gate weakening, no cap expansion.

## Issue-Shaping Contract
- User-request translation carried forward: Recurring docs freshness failures should be fixed by removing the root contradiction in lifecycle data.
- Protected terms / exact artifact and surface names: `docs:freshness`, `docs:freshness:maintain`, `block_missing_or_invalid_registry`, `docs/docs-freshness-registry.json`, `status: archived`, `lifecycle_state: active`, `terminal_pending_archive`, `preserved_historical_stub`, `canonical_owner_key`, `CO-579`, `CO-580`, `CO-581`, `CO-569`, `CO-429`.
- Nearby wrong interpretations to reject: Do not hide current invalid entries behind owner routing, do not raise `max_cohorts`, do not repurpose CO-579 as a catch-all owner.
- Explicit non-goals carried forward: Control-host status plane work belongs to CO-583; CO-429 residue and pre-expiry work remain follow-on lanes.

## Parity / Alignment Matrix
- Current truth: A row can be `status: archived` while `lifecycle_state: active` with notes explaining local open obligations.
- Reference truth: Archived means local archive readiness; active local obligations require active status or an explicit terminal-pending state accepted by validation.
- Target truth / intended delta: Contradictory rows are repaired, validator coverage makes the contradiction impossible to reintroduce silently, and secondary blockers remain visible.
- Explicitly out-of-scope differences: No route ownership changes except registry integrity owner CO-584.

## Readiness Gate
- Not done if: `block_missing_or_invalid_registry` remains for archived/active rows, or the fix changes review freshness dates without review evidence.
- Pre-implementation issue-quality review evidence: Local `docs:freshness:maintain --check` and GPT Pro independent review both identify registry integrity as the primary hard block.
- Safeguard ownership split: Parent owns docs, implementation, validation, PR, and Linear state because control-host worker admission is currently degraded under CO-583.

## Technical Requirements
- Functional requirements:
  - Add RED coverage for `status: archived` plus `lifecycle_state: active`.
  - Repair current registry entries into a consistent active/local-obligation representation.
  - Keep registry blockers ahead of capacity decisions until registry integrity is clean.
  - Preserve owner finalizer exact-key behavior for CO-581 and CO-569.
  - Emit evidence that capacity/pre-expiry debt remains secondary if still present.
- Non-functional requirements (performance, reliability, security):
  - Validation remains deterministic and local.
  - JSON registry order remains stable enough for review.
  - No new credentials or network calls.
- Interfaces / contracts:
  - `docs/docs-freshness-registry.json` schema conventions
  - `docs:freshness` text and JSON-like diagnostics
  - `docs:freshness:maintain --check` decision object

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Registry lifecycle encoding | Active local obligations encoded on archived rows. | remove fallback | CO-584 | invalid registry entries block maintain | 2026-05-24 | 2026-05-25 | 0 days | rows express active obligations as active or explicit terminal-pending lifecycle, not archived | focused docs freshness tests |

- Large-refactor check: CO-580 was the large lifecycle consolidation. This issue removes a concrete malformed output from that consolidation.

## Architecture & Data
- Architecture / design adjustments: Registry validation owns structural contradictions; maintenance routing should not attempt to classify capacity or owner actions from malformed registry rows.
- Data model changes / migrations: Current registry rows with open local obligations must no longer claim archived status. Notes should preserve why the row remains active.
- External dependencies / integrations: Linear relations are already set on CO-584.

## Validation Plan
- Tests / checks:
  - Focused docs freshness registry validation tests.
  - Focused maintain decision priority tests.
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`.
  - `node scripts/spec-guard.mjs --dry-run`.
  - `npm run docs:check`.
  - `npm run docs:freshness`.
  - `node scripts/docs-freshness-maintain.mjs --check`.
- Rollout verification: The maintain report should no longer choose `block_missing_or_invalid_registry` for the repaired rows.
- Monitoring / alerts: If capacity remains over budget, record the next explicit owner route in the workpad and PR body.

## Open Questions
- None.

## Approvals
- Reviewer: Pending.
- Date: 2026-05-25.
