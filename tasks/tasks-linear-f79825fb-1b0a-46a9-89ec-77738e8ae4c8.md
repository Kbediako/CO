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
- [ ] Review and refresh `docs/book/operations.md`.
- [ ] Review and refresh `docs/book/public-posture.md`.
- [ ] Review and refresh `docs/book/README.md`.
- [ ] Accept or reject child-owned review for `docs/book/skills.md` and `skills/README.md`.
- [ ] Update freshness registry/catalog metadata after content truth review.
- [ ] Add focused guard evidence that hard-stale current docs cannot hide inside legacy cohort cleanup.

## Validation
- [ ] Focused freshness-maintain guard test.
- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `npm run repo:stewardship`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] Standalone review and elegance pass.
- [ ] PR checks, feedback sweep, and ready-review drain clean before handoff.

## Handoff Status
- [ ] PR opened and attached to CO-532. Evidence: pending.
- [ ] Linear workpad refreshed with final validation and review status. Evidence: pending.
