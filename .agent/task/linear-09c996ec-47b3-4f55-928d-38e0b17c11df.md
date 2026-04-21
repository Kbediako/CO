# Task Checklist - linear-09c996ec-47b3-4f55-928d-38e0b17c11df

- Linear Issue: `CO-275` / `09c996ec-47b3-4f55-928d-38e0b17c11df`
- PRD: `docs/PRD-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- TECH_SPEC: `tasks/specs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-09c996ec-47b3-4f55-928d-38e0b17c11df.md`

## Acceptance
- [x] Capture exact `0.121.0` versus `0.122.0` marketplace capability evidence. Evidence: `out/linear-09c996ec-47b3-4f55-928d-38e0b17c11df/manual/codex-marketplace-policy/marketplace-capability-compare.log`.
- [x] Decide whether to keep old `codex marketplace add` or replace it with a validated newer-CLI contract. Decision: replace with the `CO-268` `codex plugin marketplace add` contract on `@openai/codex@0.122.0`.
- [x] Align docs/checklist packet with current mainline `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, and protected workflows.
- [x] Preserve `CO-196`, `CO-217`, and `CO-269` linkage.

## Validation
- [x] Initial docs child-lane manifest exists: `.runs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df-docs-packet/cli/2026-04-21T04-32-03-882Z-56f78783/manifest.json`.
- [x] Protected-term scan after merge resolution: matched the protected issue terms across the CO-275 packet, version policy, `scripts/pack-smoke.mjs`, `tests/pack-smoke.spec.ts`, and protected workflows.
- [x] Focused pack-smoke workflow tests after merge resolution: `npx vitest run tests/pack-smoke.spec.ts tests/cloud-canary-ci.spec.ts` passed 2 files / 16 tests.
- [x] Repo guard layer: `node scripts/delegation-guard.mjs` OK, `node scripts/spec-guard.mjs --dry-run` OK.
- [x] Build/lint/test: `npm run build` OK; `npm run lint` OK with the existing three `no-explicit-any` warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`; `npm run test` passed 346 files / 4450 tests.
- [x] Docs/stewardship gates: `npm run docs:check` OK, `npm run docs:freshness` OK with 4331 docs and 0 stale / 0 missing registry rows, `npm run repo:stewardship` OK with 5435 tracked files and 0 action-required.
- [x] `npm run pack:smoke` passed with `codex plugin marketplace add` local and served-git marketplace coverage.
- [x] `node scripts/diff-budget.mjs` after merge commit: OK with advisory stacked aggregate vs `origin/main` at files=8/25, lines=238/1200.
- [x] Standalone review and elegance pass before PR/review handoff: `codex-orchestrator review` succeeded with `review_outcome: bounded-success` at `.runs/linear-09c996ec-47b3-4f55-928d-38e0b17c11df/cli/2026-04-21T14-11-00-359Z-76f9ddd9/review/telemetry.json`; elegance pass found no simplification patch warranted at `out/linear-09c996ec-47b3-4f55-928d-38e0b17c11df/manual/elegance-review.md`.

## Notes
- `CO-269` correctly held release-facing smoke on `@openai/codex@0.121.0` when `scripts/pack-smoke.mjs` still required old `codex marketplace add`.
- `CO-268` later landed the actual post-`0.121.0` replacement contract by moving smoke coverage to `codex plugin marketplace add` on `@openai/codex@0.122.0`.
- `CO-275` records that replacement decision and must not revert current main back to the old workflow pin.
