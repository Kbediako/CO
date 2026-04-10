# Task Checklist - linear-255030bf-bdda-4594-b503-28639a98b9da
- Linear Issue: `CO-144` / `255030bf-bdda-4594-b503-28639a98b9da`
- PRD / TECH_SPEC / ACTION_PLAN: `docs/PRD-linear-255030bf-bdda-4594-b503-28639a98b9da.md`, `tasks/specs/linear-255030bf-bdda-4594-b503-28639a98b9da.md`, `docs/ACTION_PLAN-linear-255030bf-bdda-4594-b503-28639a98b9da.md`
## Docs-First
- [x] Packet drafted, registered in `tasks/index.json`, mirrored to `.agent/task/`, and summarized in `docs/TASKS.md`.
- [x] Audited docs-review child stream ran; manual fallback accepted because only the standing repo-wide `docs:freshness` baseline remained.
## Implementation
- [x] Ordinary refresh ticks now reconcile existing claims without preloading the full tracked set.
- [x] Fresh discovery is capacity-gated, slot-bounded, and live-compatible via priority-bucket reverse paging over `createdAt`.
- [x] Startup recovery and slow recovery sweeps still use full tracked-issue reconcile.
- [x] Live request-burn/header evidence is captured in `out/linear-255030bf-bdda-4594-b503-28639a98b9da/manual/`.
## Validation
- [x] `node scripts/delegation-guard.mjs`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run build && npm run lint && npm run test && npm run pack:smoke`
- [x] Review wrapper recorded `failed-boundary`; manual fallback review plus elegance pass completed.
- [x] `npm run docs:check` and `node scripts/diff-budget.mjs` passed after the docs-packet reduction.
- [ ] `npm run docs:freshness` remains red only on the unrelated repo-wide stale-doc baseline.
## Handoff
- [x] PR `#407` is attached and rebased onto the latest `origin/main`.
- [ ] GitHub checks, ready-review drain, and Linear workpad/state updates must complete before review-state transition.
