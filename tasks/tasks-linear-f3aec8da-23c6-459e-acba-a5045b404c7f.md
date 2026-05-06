# Task Checklist - CO-478

## Docs-First
- [x] Packet docs, task mirrors, registry rows, and protected terms exist for CO-478.

## Acceptance
- [x] Final `raw review output` `[P0]`/`[P1]`/`[P2]`/`[P3]` findings, including `duplicated finding blocks`, produce non-clean semantic telemetry in `review/telemetry.json`.
- [x] `review_outcome=clean-success` and `termination_boundary=null` are not sufficient clean proof for `provider-worker handoff` or `ready-review summaries`.
- [x] CO-474 product recovery, Codex review CLI exit-code behavior, command-intent, bounded-review, and termination-boundary guards remain out of scope.

## Validation
- [x] Child docs lane JSON parse, protected-term scan, and `git diff --check`.
- [x] Focused telemetry/handoff regressions, affected run-review subset, build, typecheck, full validation bundle, pack smoke, and final model-backed review passed in prior attempt.
- [ ] PR attach, PR checks, ready-review drain, and Linear handoff.

## CO-382 Fallback Metadata
- Large-refactor check: keep this bounded to review wrapper telemetry semantics and the provider-worker handoff consumer; do not absorb Codex review CLI behavior, CO-474 product recovery, or unrelated lifecycle state.
- Minor-seam behavior is acceptable only because CO-478 removes an unsafe downstream clean projection and records one bounded fallback decision.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| review wrapper telemetry verdict | `status=succeeded` plus `termination_boundary=null` can make handoff infer clean review semantics from `review_outcome=clean-success` even when raw review output contains `[P0]`/`[P1]`/`[P2]`/`[P3]` findings | remove fallback | CO-478 | Review wrapper raw output contains severity findings but telemetry and handoff classify the run as clean | 2026-05-06 | 2026-05-06 | 0 days | Telemetry records parsed findings and non-clean semantic review verdict; provider-worker handoff and ready-review summaries check that verdict instead of wrapper outcome alone | focused review-wrapper telemetry tests, handoff-summary tests, docs checks, standalone review |
