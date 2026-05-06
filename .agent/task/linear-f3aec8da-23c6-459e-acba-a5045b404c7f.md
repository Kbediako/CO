# Task Checklist - linear-f3aec8da-23c6-459e-acba-a5045b404c7f

## Docs-First
- [x] Packet, task index, docs row, freshness registry rows, checklist, and protected terms exist for CO-478.

## Acceptance
- [x] `review/telemetry.json` records parsed findings and a non-clean semantic review verdict when final raw review verdict output includes `[P0]`, `[P1]`, `[P2]`, or `[P3]`.
- [x] `review_outcome=clean-success` alone cannot be treated as clean when parsed findings exist.
- [x] `termination_boundary=null` is not used as the sole clean-review signal.
- [x] Provider-worker handoff summaries check parsed findings before clean wording.
- [x] Duplicated finding blocks do not erase findings or permit a clean verdict.
- [x] CO-474 product recovery, Codex review CLI exit-code behavior, and review-wrapper guard weakening remain out of scope.

## Validation
- [x] Child docs lane JSON parse, protected-term scan, and `git diff --check`.
- [x] Parent implementation gates through package smoke. Evidence: required gates through pack smoke passed before final classifier rework; latest focused regressions passed 389 tests after the current forced-review P2 fixes, affected run-review subset passed 3 tests / 170 skipped, and current-turn `npm run build` passed.
- [x] Parent standalone review rerun and targeted elegance/bug-discovery sidecars completed. Evidence: prior final `gpt-5.5` / `xhigh` review telemetry reports `review_outcome=bounded-success`, `termination_boundary.kind=command-intent`, `review_verdict=clean`, and `finding_count=0`; current forced reviews found P2 inspected-log/final-verdict classifier blockers, which parent fixed with focused regressions before re-review.
- [ ] PR attach, PR checks, ready-review drain, and Linear handoff.

## CO-382 Fallback Metadata
- Large-refactor check: keep this bounded to review wrapper telemetry semantics and the provider-worker handoff consumer; do not absorb Codex review CLI behavior, CO-474 product recovery, or unrelated lifecycle state.
- Minor-seam behavior is acceptable only because CO-478 removes an unsafe downstream clean projection and records one bounded fallback decision.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| review wrapper telemetry verdict | `status=succeeded` plus `termination_boundary=null` can make handoff infer clean review semantics from `review_outcome=clean-success` even when raw review output contains `[P0]`/`[P1]`/`[P2]`/`[P3]` findings | remove fallback | CO-478 | Review wrapper raw output contains severity findings but telemetry and handoff classify the run as clean | 2026-05-06 | 2026-05-06 | 0 days | Telemetry records parsed findings and non-clean semantic review verdict; provider-worker handoff and ready-review summaries check that verdict instead of wrapper outcome alone | focused review-wrapper telemetry tests, handoff-summary tests, docs checks, standalone review |

## Notes
Initial standalone review found a P1 final-verdict parsing bug; parent fixed it with transcript-isolation and structured JSON finding regressions. Follow-up `gpt-5.5` sidecars found nested-log classifier regressions; parent fixed timestamp-recency and direct source-inspection edges. Current forced handoff reviews found P2 cases where inspected transcript command output could hide the actual final clean verdict, where `cat output.log in .../review` could be mistaken for current verdict output, and where later nested `codex` markers could be promoted. Parent now preserves the final marker after `cd review && cat output.log`, `$REVIEW_OUTPUT_LOG`, and review-workdir `output.log` inspection while still suppressing multi-turn nested transcript markers.
