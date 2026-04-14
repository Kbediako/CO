# Task Checklist - linear-afb6ebc9-1341-4dbd-a522-6531a15aab90

- Linear Issue: `CO-176` / `afb6ebc9-1341-4dbd-a522-6531a15aab90`
- MCP Task ID: `linear-afb6ebc9-1341-4dbd-a522-6531a15aab90`
- Canonical registry id: `20260414-linear-afb6ebc9-1341-4dbd-a522-6531a15aab90`
- Primary PRD: `docs/PRD-linear-afb6ebc9-1341-4dbd-a522-6531a15aab90.md`
- TECH_SPEC: `tasks/specs/linear-afb6ebc9-1341-4dbd-a522-6531a15aab90.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-afb6ebc9-1341-4dbd-a522-6531a15aab90.md`

## Docs
- [x] Docs-first packet authored for source-0/prompt-pack provider adoption, child-lane decision/lifecycle proof, and follow-up/link/workpad traceability. Evidence: `docs/PRD-linear-afb6ebc9-1341-4dbd-a522-6531a15aab90.md`, `tasks/specs/linear-afb6ebc9-1341-4dbd-a522-6531a15aab90.md`, `docs/ACTION_PLAN-linear-afb6ebc9-1341-4dbd-a522-6531a15aab90.md`.
- [x] Registry mirrors updated for `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Parent verifies source payload availability in the authoritative workspace before implementation. Evidence: `.runs/linear-afb6ebc9-1341-4dbd-a522-6531a15aab90-docs-first-packet/cli/2026-04-14T04-42-03-853Z-4d1ae1a8/memory/source-0/source.txt` (`sha256:f10048ebd85a93d68cf83a955517b1aeb516eab4c50716c338e126d73a259b9d`).
- [x] Audited docs-review completed before implementation. Evidence: `.runs/linear-afb6ebc9-1341-4dbd-a522-6531a15aab90-co176-docs-review-r2/cli/2026-04-14T04-51-06-977Z-adccb368/manifest.json`, review telemetry `status=succeeded`, `review_outcome=clean-success`.

## Implementation
- [x] Sanitized fixture contract added for source-0, prompt-pack, child-lane lifecycle, workpad/link, and follow-up records. Evidence: `evaluation/fixtures/provider-linear-adoption/README.md`, `evaluation/fixtures/provider-linear-adoption/*/{manifest.json,provider-linear-worker-proof.json,prompt-artifacts.json}`.
- [x] Provider adoption eval asserts source/prompt-pack usage and fails closed without source-anchor proof. Evidence: `scripts/provider-linear-adoption-eval.mjs`, `evaluation/tests/provider-linear-adoption.test.ts`.
- [x] Provider adoption eval asserts `linear parallelization` decision proof, child-lane launch proof, bounded ownership scope, and accept/reject/invalidate outcome proof. Evidence: `scripts/provider-linear-adoption-eval.mjs`, `evaluation/fixtures/provider-linear-adoption/parallel-child-lane-accepted/provider-linear-worker-proof.json`.
- [x] Provider adoption eval asserts autonomous follow-up/link/workpad traceability without live Linear mutation. Evidence: `evaluation/fixtures/provider-linear-adoption/guarded-follow-up-creation/prompt-artifacts.json`, `evaluation/tests/provider-linear-adoption.test.ts`.

## Validation
- [x] Focused eval tests pass for source/prompt-pack adoption, child-lane lifecycle proof, and follow-up/link/workpad traceability. Evidence: `npx vitest run --config vitest.config.ts evaluation/tests/provider-linear-adoption.test.ts` (`5/5` tests), `npm run eval:provider-adoption`, `out/linear-afb6ebc9-1341-4dbd-a522-6531a15aab90/provider-linear-adoption-eval.json`.
- [x] Fixture privacy review confirms no secrets, PII, unredacted source payload, or live Linear issue transcript is checked in. Evidence: fixtures contain pointer metadata and synthetic summaries only under `evaluation/fixtures/provider-linear-adoption/`.
- [x] Required parent validation floor run for implementation scope. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test` (`339` files / `3807` tests), `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs --base origin/main` with override, `npm run test:evaluation`, and `npm run pack:smoke`.
- [x] Manifest-backed standalone review attempted under `FORCE_CODEX_REVIEW=1`, then manual fallback review and elegance pass completed after the wrapper stopped on a bounded command-intent violation. Evidence: `../../.runs/linear-afb6ebc9-1341-4dbd-a522-6531a15aab90/cli/2026-04-14T04-38-24-471Z-9f61dbe6/review/telemetry.json` (`status=failed`, `review_outcome=failed-boundary`, `termination_boundary.kind=command-intent`), `out/linear-afb6ebc9-1341-4dbd-a522-6531a15aab90/manual/20260414T052332Z-review-elegance/00-review-elegance.md`.

## Handoff
- [x] Parent imports or accepts this child-lane patch into the authoritative issue workspace. Evidence: accepted child-lane manifest `.runs/linear-afb6ebc9-1341-4dbd-a522-6531a15aab90-docs-first-packet/cli/2026-04-14T04-42-03-853Z-4d1ae1a8/manifest.json`.
- [ ] Parent attaches PR/workpad traces after implementation.
- [ ] Unresolved actionable review threads: `0` or explicit waiver with evidence before final issue handoff.

## Notes
- The docs-first child lane did not call Linear mutation helpers, edit implementation/eval files, or run full repo validation suites; parent implementation subsequently added the eval command and fixtures in this workspace.
- `docs/TASKS.md` was already at the 450-line archive threshold before this packet; parent ran the supported archive helper and restored displaced `1029` evidence into `docs/TASKS-archive-2026.md`.
