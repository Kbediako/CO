# TECH_SPEC Mirror - CO-478 review wrapper telemetry findings

Canonical spec: `tasks/specs/linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`; PRD: `docs/PRD-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`; action plan: `docs/ACTION_PLAN-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`.

## Contract
Review wrapper telemetry must parse `raw review output` for explicit `[P0]`, `[P1]`, `[P2]`, and `[P3]` findings and surface a machine-checkable semantic review verdict in `review/telemetry.json`. `status=succeeded` and `review_outcome=clean-success` may still describe wrapper execution, but clean provider-worker handoff language is invalid when parsed findings exist. `termination_boundary=null` must not be treated as proof that review output was clean.

## Not Done If
- Raw output containing `[P0]`, `[P1]`, `[P2]`, or `[P3]` findings can still produce telemetry that downstream handoff treats as clean.
- Provider-worker handoff or ready-review summaries call a review clean without checking parsed findings.
- Duplicated finding blocks are ignored or cause all findings to be discarded.
- CO-474 product recovery findings, Codex review CLI exit-code behavior, command-intent guards, bounded-review guards, or termination-boundary guards are changed instead of fixing telemetry semantics.

## Validation
Parent owns focused regressions for raw output with `[P1]` and `[P2]` findings, mixed `[P0]` through `[P3]` severities, duplicated finding blocks, no-finding clean output, command-intent/bounded-review boundary failures, and provider-worker handoff summary consumption. Required gates include focused tests, implementation validation, docs checks, standalone review, elegance review, PR feedback cleanup, and ready-review drain.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Review wrapper semantic verdict | Command success plus `termination_boundary=null` can make handoff infer clean review semantics from `review_outcome=clean-success` even when raw output contains severity findings. | remove fallback | CO-478 | `raw review output` includes `[P0]`, `[P1]`, `[P2]`, or `[P3]` findings. | 2026-05-06 | 2026-05-06 | 0 days | `review/telemetry.json` records parsed findings and a non-clean semantic review verdict; handoff consumers check it instead of wrapper outcome alone. | Focused review-wrapper telemetry and provider-worker handoff tests plus docs/review gates. |

- For `justify retaining fallback`: Not applicable. No temporary fallback is approved by this packet.
- Large-refactor check: keep CO-478 bounded to review wrapper telemetry and handoff consumers; do not absorb CO-474 product recovery, Codex review CLI exit-code changes, or unrelated provider lifecycle cleanup.
