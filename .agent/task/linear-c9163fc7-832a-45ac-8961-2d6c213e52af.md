# Task Checklist - linear-c9163fc7-832a-45ac-8961-2d6c213e52af

- Linear Issue: `CO-203` / `c9163fc7-832a-45ac-8961-2d6c213e52af`
- MCP Task ID: `linear-c9163fc7-832a-45ac-8961-2d6c213e52af`
- Primary PRD: `docs/PRD-linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md`
- TECH_SPEC: `tasks/specs/linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md`
- Shared source 0 anchor: `ctx:sha256:8eeac92cc9213b786a6e5c0fb304acd3a2357c0e3d3fb9464f95ba434c9314f7#chunk:c000001`
- Initial child-lane failure manifest: `.runs/linear-c9163fc7-832a-45ac-8961-2d6c213e52af-missing-run-reclaim-tests/cli/2026-04-16T07-23-49-727Z-ce8fd132/manifest.json`

## Docs-First
- [x] PRD drafted for the missing retained run identity reclaim follow-up. Evidence: `docs/PRD-linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md`.
- [x] TECH_SPEC drafted with the no-live-worker proof contract and adjacent invariant preservation. Evidence: `tasks/specs/linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md`.
- [x] ACTION_PLAN drafted for docs-review, child-lane retry, implementation, validation, and review handoff. Evidence: `docs/ACTION_PLAN-linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md` readiness gate.
- [x] Registry and mirrors updated: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, docs TECH_SPEC mirror, and `.agent/task` mirror. Evidence: those files.
- [x] Docs-review child stream completed successfully before source edits. Evidence: `.runs/linear-c9163fc7-832a-45ac-8961-2d6c213e52af-co203-docs-review/cli/2026-04-16T07-30-40-817Z-0e7a5f4e/manifest.json`.

## Child-Lane Scope
- [x] Parent recorded same-issue `parallelize_now` / `independent_scope_available` decision for focused regression coverage. Evidence: Linear parallelization record for `c9163fc7-832a-45ac-8961-2d6c213e52af`.
- [x] Parent launched bounded child lane `missing-run-reclaim-tests`. Evidence: `.runs/linear-c9163fc7-832a-45ac-8961-2d6c213e52af-missing-run-reclaim-tests/cli/2026-04-16T07-23-49-727Z-ce8fd132/manifest.json`.
- [x] Child lane `missing-run-reclaim-tests` completed successfully. Evidence: `.runs/linear-c9163fc7-832a-45ac-8961-2d6c213e52af-missing-run-reclaim-tests/cli/2026-04-16T07-42-15-881Z-a627fd25/manifest.json`.
- [x] Parent adjudicated the child patch before final test refinement. Decision: rejected because it missed the required safe-reclaim regression; final coverage was integrated by the parent lane.

## Implementation Acceptance
- [x] Define a machine-checkable no-live-worker proof for plain `provider_issue_released:not_active` missing-run rows.
- [x] Keep unreadable-manifest occupancy or equivalent live-worker evidence as a hard blocker.
- [x] Allow `fresh_discovery` to reclaim only after the proof passes and no release cancel is pending.
- [x] Preserve pending-reopen missing-manifest exclusion.
- [x] Preserve `CO-189` duplicate-worker protection and retain provider-intake evidence.

## Validation
- [x] Focused provider handoff regressions for safe reclaim and duplicate-worker blocking passed. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueHandoff.test.ts -t "missing retained run identity|unreadable same-issue live proof|unresolved retained run identity"` passed 6 tests.
- [x] `node scripts/delegation-guard.mjs` passed after task registration and successful child evidence.
- [x] `node scripts/spec-guard.mjs --dry-run` passed.
- [x] Required validation floor passed: `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke`.
- [x] Manifest-backed standalone review and explicit elegance review completed before PR handoff. Evidence: `../../.runs/linear-c9163fc7-832a-45ac-8961-2d6c213e52af/cli/2026-04-16T07-17-40-071Z-cc603710/review/telemetry.json` reported `review_outcome=bounded-success`; `out/linear-c9163fc7-832a-45ac-8961-2d6c213e52af/manual/elegance-review.md` recorded no simplification patch needed.

## Handoff
- [ ] Workpad refreshed with final validation, review status, and PR link.
- [ ] PR created or updated, attached to Linear, checks green, and `pr ready-review` drain clean before review-state transition.
- [ ] Issue moved to `In Review` only after docs-review, successful child-lane completion, required validation, attached PR, and clean review drain.

## Progress Log
- 2026-04-16: Parent moved `CO-203` from `Ready` to `In Progress`, created the single workpad, recorded the required decomposition matrix, and recorded `parallelize_now` / `independent_scope_available`.
- 2026-04-16: Initial child-lane attempt `missing-run-reclaim-tests` launched but failed before docs packet registration with a zero-byte patch artifact; parent is retrying after docs registration and docs-review instead of widening scope.
- 2026-04-16: `docs-review` child stream succeeded cleanly; the failed zero-byte child lane was invalidated and relaunched as a file-scoped lane because the parent docs packet left the workspace dirty.
- 2026-04-16: Relaunched file-scoped child lane completed successfully at `.runs/linear-c9163fc7-832a-45ac-8961-2d6c213e52af-missing-run-reclaim-tests/cli/2026-04-16T07-42-15-881Z-a627fd25/manifest.json`; parent rejected the incomplete patch and integrated final safe-reclaim plus unreadable live-proof regression coverage directly.
- 2026-04-16: Validation passed through `npm run pack:smoke`; `node scripts/diff-budget.mjs` passed with override reason `CO-203 requires a docs-first packet plus focused provider handoff implementation and regression coverage; splitting would obscure the issue-level evidence contract.`
- 2026-04-16: Manifest-backed standalone review completed with `review_outcome=bounded-success`; explicit elegance review passed with no simplification patch needed.
