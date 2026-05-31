---
id: 20260506-linear-f3aec8da-23c6-459e-acba-a5045b404c7f
title: "CO-478 review wrapper telemetry findings"
status: in_progress
owner: Codex
created: 2026-05-06
last_review: 2026-05-31
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md
related_tech_spec_mirror: docs/TECH_SPEC-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md
related_action_plan: docs/ACTION_PLAN-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md
related_tasks:
  - tasks/tasks-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md
review_notes:
  - 2026-05-06: Docs packet created and implementation scoped to review-wrapper telemetry semantics.
---

# TECH_SPEC - CO-478 review wrapper telemetry findings

## Contract
`review/telemetry.json` must expose semantic review verdict fields derived from final `raw review output`, separate from wrapper execution state. Explicit `[P0]`, `[P1]`, `[P2]`, or `[P3]` findings produce `review_verdict=findings`, `highest_finding_priority`, and `finding_count`; clean handoff wording requires `review_verdict=clean`.

## Issue-Shaping Contract
- User request: prevent `provider-worker handoff` and `ready-review summaries` from treating `review_outcome=clean-success` and `termination_boundary=null` as proof that no actionable findings exist.
- Protected terms: `raw review output`, `review/telemetry.json`, `[P0]`, `[P1]`, `[P2]`, `[P3]`, `review_outcome=clean-success`, `termination_boundary=null`, `provider-worker handoff`, `ready-review summaries`, `semantic review verdict`, `duplicated finding blocks`, `CO-474`.
- Reject: docs-only fixes, CO-474 product recovery fixes, Codex review CLI exit-code changes, weakened command-intent/bounded-review/termination-boundary guards, or duplicate-block discard behavior.

## Parity / Alignment Matrix

| Surface | Current Truth | Target Truth | Out Of Scope |
| --- | --- | --- | --- |
| `raw review output` | CO-474 contained `[P1]` and `[P2]` findings. | Parse `[P0]` through `[P3]` findings from final reviewer output. | Fixing CO-474 product findings. |
| `review/telemetry.json` | Wrapper status can look clean while raw findings exist. | Add semantic verdict fields while preserving `clean-success`, `bounded-success`, `failed-boundary`, and `failed-other`. | Changing Codex review exit codes. |
| Handoff consumers | Clean wording can rely on wrapper success. | `findings` and `unknown` semantic verdicts fail closed for provider-worker closeout. | Broad lifecycle redesign. |
| Duplicates | Repeated finding blocks can look like noise. | Deduplicate display/count only; do not erase finding presence. | Broad review-output summarization. |

## Requirements
Parse final reviewer output for severity-tagged findings, including structured JSON payloads; persist `review_verdict`, `highest_finding_priority`, and `finding_count`; preserve wrapper execution / `termination_boundary` semantics; fail provider-worker handoff when semantic verdict is `findings` or `unknown`; cover clean, CO-474 P1/P2, duplicate, bounded-success, and failed-boundary cases.

## Not Done If
Raw output with `[P0]`/`[P1]`/`[P2]`/`[P3]` findings can hand off as clean; `review_outcome=clean-success` or `termination_boundary=null` is enough to call review clean; provider-worker handoff or `ready-review summaries` ignore parsed findings; `duplicated finding blocks` erase the non-clean verdict.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Review wrapper semantic verdict | Command success plus `termination_boundary=null` projects clean review semantics from `review_outcome=clean-success`. | remove fallback | CO-478 | Raw output includes severity findings. | 2026-05-06 | 2026-05-06 | 0 days | Parsed findings and semantic verdict drive handoff cleanliness. | Focused telemetry and handoff regressions. |

## Validation Plan
Focused telemetry/parser and provider-worker handoff regressions, existing run-review guard regressions, docs gates, standalone review, elegance review, PR checks, and `ready-review` drain.
