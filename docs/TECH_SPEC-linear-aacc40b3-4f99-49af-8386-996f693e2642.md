---
id: 20260522-linear-aacc40b3-4f99-49af-8386-996f693e2642
title: "CO-575 replace terminal CO-573 docs freshness owner"
relates_to: docs/PRD-linear-aacc40b3-4f99-49af-8386-996f693e2642.md
risk: high
owners:
  - Codex
status: in_progress
created: 2026-05-22
last_review: 2026-05-22
review_cadence_days: 30
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
---

# TECH_SPEC - CO-575 docs freshness owner replacement

## Summary
- Objective: Replace terminal `CO-573` with non-terminal same-project `CO-575` as the live `docs:freshness:maintain` owner, then remove the root causes that still make completed historical task packets count as live freshness debt.
- Scope: `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, CO-575 docs-first packet files, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` traceability.
- Constraints: No CO-567, CO-570, or CO-574 workspace changes; no blind `last_review` bumps; no stale-doc deletion; no policy cap/window broadening; no gate weakening; no marking active or open-checklist packets terminal.

## Issue-Shaping Contract
- User-request translation carried forward: current evidence shows `docs:freshness:maintain` action-required/pre-expiry blockers route through terminal `owner_issue=CO-573`; the owner must be non-terminal before the baseline is governed.
- Protected terms / exact artifact and surface names: `docs:freshness`, `docs:freshness:maintain`, `canonical_owner_key=docs:freshness:maintain`, `owner_issue=CO-573`, canonical owner key, terminal-owner replacement, completed-lane registry residue, stale active-spec routing, fallback/seam metadata routing, dry-run/no-token copyable body, `tasks/index.json`, `docs/docs-freshness-registry.json`.
- Nearby wrong interpretations to reject: weakening docs freshness/spec guards, blind date bumps, deleting historical docs, hiding terminal owner evidence, duplicate owner issue creation, or assigning CO-567/CO-574 unrelated docs freshness debt.
- Explicit non-goals carried forward: no provider-intake, generated runtime freshness, branch-diff review, control-host admission, WIP policy, or review-wrapper behavior changes.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Global maintenance owner | Terminal `CO-573` is configured in the rolling freshness policy. | Terminal owners must fail closed and require replacement. | Live same-project `CO-575` is configured. | Reopening CO-573 or masking terminal verification. |
| Cohort owners | `CO-568` and `CO-569` exact-key owner overrides remain live. | Exact-key overrides are narrower than the global owner. | Preserve the overrides unchanged. | Broadening retained cohorts to CO-575. |
| Maintenance evidence | `docs:freshness:maintain` emits terminal-owner replacement action evidence. | Owner action evidence is machine-readable and copyable. | Same evidence resolves to live CO-575 while debt remains visible. | Summarizing away action evidence. |
| Terminal task packets | Completed historical task packet docs can still count as live rolling debt when task mirrors have stale open checklist residue or `tasks/index.json` lacks terminal status. | Completed packets should archive only when no source, base-revision, or linked checklist evidence remains open. | Evidence-backed completed packets archive; packets with open checklist evidence stay visible with explicit `open_checklist` registry classification. | Archiving active/open-checklist work or using date-only freshness bumps. |

## Technical Requirements
1. Update `docs/docs-catalog.json` so `policies.rolling_freshness_cohorts.owner_issue` is `CO-575`.
2. Update `docs/guides/docs-freshness-cohorts.md` to identify CO-575 as live global owner while retaining CO-573 as terminal historical evidence.
3. Keep `canonical_owner_issues[]` overrides for `CO-568` and `CO-569` unchanged.
4. Register CO-575 packet/index/registry surfaces so future docs freshness runs can distinguish live owner metadata from historical CO-573 evidence.
5. Preserve `owner_issue=CO-573`, terminal-owner replacement, completed-lane registry residue, stale active-spec routing, fallback/seam metadata routing, and dry-run/no-token copyable body wording in packet surfaces.
6. Keep implementation-docs archival strict for authoritative source, base-revision, and linked task checklist evidence: any open checklist evidence vetoes archive-stub replacement, including terminal PRD/spec/action-plan docs.
7. Sync `tasks/index.json` terminal metadata only for historical rows whose task and agent checklist mirrors have no open checklist items; leave in-progress or open-checklist rows active via explicit `task_status: open_checklist` registry classification.

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Current owner-routed stale/pre-expiry docs freshness debt | `expire fallback` | `CO-575` | Terminal `CO-573` with `block_spec_guard_pre_expiry`, rolling cohort entries, and `blocking_changed_paths=[]` | 2026-05-22 | 2026-06-05 | 2026-06-21 | Refresh, archive, reclassify, or re-home the emitted cohorts before expiry; re-home again if CO-575 becomes terminal while debt remains | Before/after `docs:freshness:maintain`, `docs:freshness`, `spec-guard --dry-run`, `docs:check` |

- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Large-refactor check: GPT Pro review agreed the owner re-home alone is partial. CO-575 therefore repairs the lifecycle contract at the existing archive/index boundaries instead of adding a new owner-resolution fallback or broadening freshness policy caps.

## Validation Plan
- `npm run docs:freshness:maintain -- --format json`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/audit-archive-stub-unchecked.mjs --format json`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- Standalone review and elegance/minimality pass before review handoff.

## Approvals
- Reviewer: Pending.
- Date: 2026-05-22.
