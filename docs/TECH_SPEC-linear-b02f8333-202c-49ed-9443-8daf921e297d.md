---
id: 20260521-linear-b02f8333-202c-49ed-9443-8daf921e297d
title: "CO-573 replace terminal CO-558 docs freshness owner"
relates_to: docs/PRD-linear-b02f8333-202c-49ed-9443-8daf921e297d.md
risk: high
owners:
  - Codex
status: in_progress
created: 2026-05-21
last_review: 2026-05-21
review_cadence_days: 30
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
---

# TECH_SPEC - CO-573 docs freshness owner replacement

## Summary
- Objective: Replace terminal `CO-558` with non-terminal same-project `CO-573` as the live `docs:freshness:maintain` owner while preserving stale/pre-expiry and over-budget evidence.
- Scope: `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, CO-573 docs-first packet files, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` traceability.
- Constraints: No CO-572 implementation changes, no blind `last_review` bumps, no stale-doc deletion, no policy cap/window broadening, and no gate weakening.

## Issue-Shaping Contract
- User-request translation carried forward: current main/worktree evidence shows `docs:freshness:maintain` action-required/pre-expiry blockers route through terminal `CO-558`; the owner must be non-terminal before the baseline is governed.
- Protected terms / exact artifact and surface names: `docs:freshness`, `docs:freshness:maintain`, `block_spec_guard_pre_expiry`, `owner_issue=CO-558`, `owner_action_evidence=action_required`, `blocking_changed_paths=0`, `policy capacity=over_budget`, `pre_expiry_entries`, `tasks/index.json`, `docs/docs-freshness-registry.json`.
- Nearby wrong interpretations to reject: weakening docs freshness/spec guards, blind date bumps, deleting historical docs, hiding terminal owner evidence, or assigning CO-572 unrelated docs freshness debt.
- Explicit non-goals carried forward: no CO-572 status-machine docs or implementation changes, no provider-intake or WIP policy changes.

## Technical Requirements
1. Update `docs/docs-catalog.json` so `policies.rolling_freshness_cohorts.owner_issue` is `CO-573`.
2. Update `docs/guides/docs-freshness-cohorts.md` to identify CO-573 as live global owner while retaining CO-558 as terminal historical evidence.
3. Keep `canonical_owner_issues[]` overrides for `CO-568` and `CO-569` unchanged.
4. Register CO-573 packet/index/registry surfaces so future docs freshness runs can distinguish live owner metadata from historical CO-558 evidence.
5. Record that current maintenance output may still block handoff because over-budget/pre-expiry debt remains action-required, but it now routes to live CO-573 instead of terminal CO-558.

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Current owner-routed stale/pre-expiry docs freshness debt | expire fallback | CO-573 | Terminal `CO-558` with `block_spec_guard_pre_expiry`, `owner_action_evidence=action_required`, and `blocking_changed_paths=[]` | 2026-05-21 | 2026-05-21 | 7 days after normal cadence expiry for each emitted cohort | Refresh, archive, reclassify, or re-home the emitted cohorts before expiry; re-home again if CO-573 becomes terminal while debt remains | Before/after `docs:freshness:maintain`, `docs:freshness`, `spec-guard --dry-run`, `docs:check` |

- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Large-refactor check: The existing terminal-owner verification contract is sufficient; current work changes live metadata and traceability only.

## Validation Plan
- `npm run docs:freshness`
- `npm run docs:freshness:maintain`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- Standalone review and elegance/minimality pass before review handoff.

## Approvals
- Reviewer: Pending.
- Date: 2026-05-21.
