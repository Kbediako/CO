# Task Checklist - linear-795a9aa4-02fd-4f2f-8942-7df40ae865ce

- Linear Issue: `CO-578` / `795a9aa4-02fd-4f2f-8942-7df40ae865ce`
- PRD: `docs/PRD-linear-795a9aa4-02fd-4f2f-8942-7df40ae865ce.md`
- TECH_SPEC: `tasks/specs/linear-795a9aa4-02fd-4f2f-8942-7df40ae865ce.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-795a9aa4-02fd-4f2f-8942-7df40ae865ce.md`
- Canonical owner key: `review-wrapper:contract-evidence-active-manifest-snapshot:v1`

## Docs
- [x] Live issue context inspected; `Ready` moved to `In Progress`.
- [x] Single Linear workpad created and pre-turn decomposition matrix recorded.
- [x] Same-turn parallelization recorded: `parallelize_now` / `independent_scope_available`.
- [x] Child lane `contract-regression-tests` completed and parent accepted scoped patch. Evidence: `.runs/linear-795a9aa4-02fd-4f2f-8942-7df40ae865ce-contract-regression-tests/cli/2026-05-22T15-33-36-671Z-71db1d83/manifest.json`.
- [x] Docs-first packet and mirrors created in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Docs-review ran before implementation; deterministic docs gates passed, and forced review returned expected pre-implementation findings for the intentionally red regression. Evidence: `.runs/linear-795a9aa4-02fd-4f2f-8942-7df40ae865ce-docs-review/cli/2026-05-22T15-39-36-699Z-2263dc45/manifest.json`.
- [x] Post-implementation docs-review rerun is clean with valid enforced contract. Evidence: `.runs/linear-795a9aa4-02fd-4f2f-8942-7df40ae865ce-docs-review-r2/cli/2026-05-22T15-47-48-596Z-44a2c0d4/review/telemetry.json`.

## Implementation
- [x] Focused failing regression proves generated agent-loop source refs still expose mutable active manifest/runner-log evidence before the fix. Evidence: `npx vitest run tests/review-contract.spec.ts -t "uses review-owned immutable snapshots"` failed on the live manifest ref before implementation.
- [x] Active manifest and runner-log evidence are copied into immutable review-owned snapshots before agent-loop bundle source refs are built.
- [x] Agent-loop bundle preserves embedded manifest/log review context without publishing mutable live refs.
- [x] `validateEvidenceRefs(...)` strict stale-hash behavior remains unchanged.
- [x] `docs/standalone-review-guide.md` documents that active run state must be cited through review-owned snapshots.

## Validation
- [x] Focused review-contract regression passes. Evidence: `npx vitest run tests/review-contract.spec.ts` passed 23 tests.
- [x] `node scripts/delegation-guard.mjs`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run docs:check`
- [x] `npm run docs:freshness`
- [x] `npm run repo:stewardship`
- [x] `node scripts/diff-budget.mjs`
- [x] Manifest-backed standalone review has `review_verdict=clean` and valid enforced contract. Evidence: `.runs/linear-795a9aa4-02fd-4f2f-8942-7df40ae865ce/cli/2026-05-22T15-30-57-133Z-4e238242/review/telemetry.json`.
- [x] Explicit elegance/minimality pass complete. Evidence: `out/linear-795a9aa4-02fd-4f2f-8942-7df40ae865ce/manual/20260523T020500Z-elegance-review.md`.
- [x] `npm run pack:smoke` if CLI/package/review-wrapper shipped surfaces require it.

## Handoff
- [ ] Latest `origin/main` merged, PR created/attached, checks green, `pr ready-review` drain clean, and issue moved to `In Review`.
