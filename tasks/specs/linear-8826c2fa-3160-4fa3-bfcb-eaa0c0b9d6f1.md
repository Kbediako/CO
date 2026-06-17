---
id: 20260517-linear-8826c2fa-3160-4fa3-bfcb-eaa0c0b9d6f1
title: CO-553 eliminate docs freshness policy capacity over-budget debt
status: active
last_review: 2026-06-17
review_notes:
  - 2026-06-17: Reviewed during the hard spec-guard freshness tranche; kept active because this file did not contain terminal evidence sufficient for archival or inactive reclassification.
---

## Contract
CO-553 clears `docs:freshness:maintain` capacity debt by reducing or correctly classifying active capacity, not by changing caps, deleting history, or weakening gates.

## Required Behavior
- Historical task packet, task mirror, and report-only rows that are terminal or preserved history must not consume live rolling policy capacity after classification.
- Non-terminal task packets must remain active and reviewed; archived registry metadata must not hide a live task lifecycle from the upstream `docs:freshness` report or the maintain gate.
- Active public/current docs still require content review or owner-action evidence and remain fail-closed when stale.
- `policy_capacity_status` exposes entry/cohort counts, excess counts, expired entries, and boolean over-budget flags.
- `co-status` keeps the repo-wide docs freshness gate visible and distinguishes owner, handoff blocking, terminal lifecycle paths, and blocking changed paths.

## CO-382 Fallback Decision Table
Large-refactor check: CO-553 stays scoped to docs freshness capacity/actionability while CO-552 owns the broader owner/reconciler architecture.
Minor-seam decision: the bounded seam change is acceptable because it removes hidden/non-actionable freshness debt rather than adding a retained fallback.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` capacity/actionability | Historical capacity and rolling-current actionability seam that let rows look clean or non-actionable under owner/capacity routing | remove fallback | CO-553 | Current direct-action docs and non-candidate rolling rows can hide or block without path/action evidence. | 2026-05-17 | 2026-05-17 | N/A after removal | Live capacity classification surfaces stale current docs and rolling non-candidate current docs as blocking action evidence. | `npx vitest run --config vitest.config.core.ts tests/docs-freshness-maintain.spec.ts`; parent stale/rolling probe; `node scripts/spec-guard.mjs --dry-run`; `npm run build`. |

## Non-Goals
- No CO-522 terminal transition.
- No policy cap increase.
- No broad canonical owner model refactor.
- No blind `last_review` bump for historical rows.

## Validation
- [x] Focused docs freshness maintain tests pass.
- [x] `node scripts/docs-freshness-maintain.mjs --check --format json` returns non-over-budget.
- [x] `npm run docs:freshness` passes.
- [x] `node scripts/spec-guard.mjs --dry-run` passes.
- [x] `npm run docs:check` passes.
- [x] Current `co-status` proof shows capacity anatomy.
