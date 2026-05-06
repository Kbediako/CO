# Task Checklist - CO-478

## Docs-First
- [x] PRD, canonical spec, TECH_SPEC mirror, action plan, task checklist, and agent mirror exist for `linear-f3aec8da-23c6-459e-acba-a5045b404c7f`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the docs-first packet inside the declared file scope.
- [x] Protected terms are visible: `raw review output`, `review/telemetry.json`, `[P0]`, `[P1]`, `[P2]`, `[P3]`, `review_outcome=clean-success`, `termination_boundary=null`, `provider-worker handoff`, `ready-review summaries`, `semantic review verdict`, and `duplicated finding blocks`.

## Acceptance
- [x] Parent implementation parses `[P0]`, `[P1]`, `[P2]`, and `[P3]` findings from final raw review verdict output, including structured JSON reviewer payloads.
- [x] Parent implementation records parsed findings and a non-clean semantic review verdict in `review/telemetry.json`.
- [x] `review_outcome=clean-success` alone cannot be treated as clean when parsed findings exist.
- [x] Provider-worker handoff summaries cannot call a review clean without checking parsed findings.
- [x] Duplicated finding blocks remain actionable and cannot be ignored.
- [x] Codex review CLI exit-code behavior and command-intent, bounded-review, and termination-boundary guards remain intact.

## Validation
- [x] Child docs lane JSON parse, protected-term scan, and `git diff --check`.
- [x] Parent focused review-wrapper telemetry and handoff regressions. Evidence: `npx vitest run tests/review-execution-telemetry.spec.ts orchestrator/tests/CommandRunnerReviewEvidenceConsistency.test.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts` passed 386 tests after final classifier rework; affected `tests/run-review.spec.ts` subset passed 3 tests / 170 skipped.
- [x] Parent implementation gates through package smoke. Evidence: delegation guard, spec guard, diff whitespace checks, `npm run build`, `npm run lint` (0 errors; 3 existing warnings), `npm run test` (359 files / 5,391 tests), `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, diff-budget with explicit CO-478 packet/parser override, and `npm run pack:smoke` passed before final classifier rework; latest `npm run build` and `npx tsc --noEmit --pretty false --project tsconfig.build.json` passed afterward.
- [x] Parent standalone review rerun and targeted elegance/bug-discovery sidecars completed. Evidence: final `gpt-5.5` / `xhigh` review telemetry reports `review_outcome=bounded-success`, `termination_boundary.kind=command-intent`, `review_verdict=clean`, and `finding_count=0`; review text found no actionable correctness regressions.
- [ ] PR attach, PR checks, ready-review drain, and Linear handoff.

## CO-382 Fallback Metadata
- Large-refactor check: keep this bounded to review wrapper telemetry semantics and the provider-worker handoff consumer; do not absorb Codex review CLI behavior, CO-474 product recovery, or unrelated lifecycle state.
- Minor-seam behavior is acceptable only because CO-478 removes an unsafe downstream clean projection and records one bounded fallback decision.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| review wrapper telemetry verdict | `status=succeeded` plus `termination_boundary=null` can make handoff infer clean review semantics from `review_outcome=clean-success` even when raw review output contains `[P0]`/`[P1]`/`[P2]`/`[P3]` findings | remove fallback | CO-478 | Review wrapper raw output contains severity findings but telemetry and handoff classify the run as clean | 2026-05-06 | 2026-05-06 | 0 days | Telemetry records parsed findings and non-clean semantic review verdict; provider-worker handoff and ready-review summaries check that verdict instead of wrapper outcome alone | focused review-wrapper telemetry tests, handoff-summary tests, docs checks, standalone review |

## Notes
Initial standalone review found a P1 final-verdict parsing bug; parent fixed it with transcript-isolation and structured JSON finding regressions. Follow-up `gpt-5.5` sidecars found nested-log classifier regressions; parent fixed timestamp-recency and direct source-inspection edges before the final clean review.
