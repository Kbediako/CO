# Task Checklist - linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8

- Linear Issue: `CO-532` / `f79825fb-1b0a-46a9-89ec-77738e8ae4c8`
- MCP Task ID: `linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8`
- Registry Task ID: `20260513-linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8`
- Primary PRD: `docs/PRD-linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8.md`
- Task spec: `tasks/specs/linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8.md`

## Docs-First
- [x] PRD drafted for current hard-stale doc refresh. Evidence: `docs/PRD-linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8.md`.
- [x] TECH_SPEC drafted with intent checksum, parity matrix, and validation plan. Evidence: `docs/TECH_SPEC-linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8.md`, `tasks/specs/linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8.md`.
- [x] ACTION_PLAN drafted for bounded sequencing. Evidence: `docs/ACTION_PLAN-linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8.md`.
- [x] Registry mirrors created in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: declared registry files.

## Current-Doc Review
- [x] Reproduced baseline hard-stale current-doc shape. Evidence: `out/linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8/docs-freshness.json`, `out/linear-f79825fb-1b0a-46a9-89ec-77738e8ae4c8/docs-freshness-maintenance.json`.
- [x] Review and refresh `docs/book/operations.md`.
- [x] Review and refresh `docs/book/public-posture.md`.
- [x] Review and refresh `docs/book/README.md`.
- [x] Accept or reject child-owned review for `docs/book/skills.md` and `skills/README.md`.
- [x] Update freshness registry/catalog metadata after content truth review.
- [x] Add focused guard evidence that hard-stale current docs cannot hide inside legacy cohort cleanup.

## Validation
- [x] Focused freshness-maintain guard test.
- [x] `node scripts/delegation-guard.mjs`.
- [x] `node scripts/spec-guard.mjs --dry-run`.
- [x] `npm run build`.
- [x] `npm run lint`.
- [x] `npm run test`.
- [x] `npm run docs:check`.
- [x] `npm run docs:freshness`.
- [x] `npm run repo:stewardship`.
- [x] `node scripts/diff-budget.mjs`.
- [x] Standalone review and elegance pass.
- [ ] PR checks, feedback sweep, and ready-review drain clean before handoff.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Large-refactor check: no broad freshness-policy refactor is needed; the lane repairs current-doc review debt and focused guard evidence only.
- Minor-seam check: no retained minor seam remains; direct current-doc action routing replaces the stale ambiguous evidence path.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Current book/skill docs | Active public docs stale beyond 14-day cadence | remove fallback | CO-532 | `docs:freshness` hard-stale current-doc paths | 2026-04-24 | 2026-05-13 | removed in this lane | Five paths no longer hard-stale | `npm run docs:freshness` |
| Maintenance evidence | Hard-stale current docs could be mentally grouped with legacy cohorts | remove fallback | CO-532 | `docs:freshness:maintain` sample paths include current docs | 2026-05-13 | 2026-05-13 | removed in this lane | Guard evidence keeps direct current-doc action explicit | focused docs-freshness maintain test |

## Handoff Status
- [x] PR opened and attached to CO-532. Evidence: PR #807.
- [ ] Linear workpad refreshed with final validation and review status. Evidence: pending.
