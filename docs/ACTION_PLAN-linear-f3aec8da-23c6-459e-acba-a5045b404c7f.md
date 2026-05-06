# ACTION_PLAN - CO-478 review wrapper telemetry findings

Complete the CO-478 packet and implementation so `raw review output` findings produce a non-clean `semantic review verdict` in `review/telemetry.json` and downstream `provider-worker handoff` / `ready-review summaries` cannot call such reviews clean.

## Gate
- Protected terms: `raw review output`, `review/telemetry.json`, `[P0]`, `[P1]`, `[P2]`, `[P3]`, `review_outcome=clean-success`, `termination_boundary=null`, `provider-worker handoff`, `ready-review summaries`, `semantic review verdict`, `duplicated finding blocks`, `CO-474`.
- Not done if severity findings still hand off as clean, if `review_outcome=clean-success` or `termination_boundary=null` is sufficient clean proof, if duplicated finding blocks are ignored, or if the fix changes CO-474 product recovery / Codex review CLI exit-code behavior.
- Fallback decision: remove the stale clean-projection seam where command success plus `termination_boundary=null` masks parsed raw review findings.

## Plan
1. Register the packet across docs, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Parse final reviewer output for `[P0]` through `[P3]`, duplicated finding blocks, and structured JSON verdicts.
3. Persist `review_verdict`, `highest_finding_priority`, and `finding_count` while preserving existing wrapper outcome / `termination_boundary` semantics.
4. Fail provider-worker handoff on `findings` or `unknown`, test the acceptance matrix, run gates, attach PR, clear feedback, drain `ready-review`, and transition only when clean.

## Fallback Metadata

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Review wrapper semantic verdict | `status=succeeded` plus `termination_boundary=null` can make handoff infer clean review semantics from `review_outcome=clean-success` while findings exist. | remove fallback | CO-478 | Raw output contains `[P0]`, `[P1]`, `[P2]`, or `[P3]`. | 2026-05-06 | 2026-05-06 | 0 days | Telemetry records parsed findings and handoff checks the semantic verdict. | Focused telemetry/handoff tests plus docs/review gates. |
