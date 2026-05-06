# PRD - CO-478 review wrapper telemetry findings

## Traceability
Linear issue `CO-478` / `f3aec8da-23c6-459e-acba-a5045b404c7f`; task id `linear-f3aec8da-23c6-459e-acba-a5045b404c7f`; canonical spec `tasks/specs/linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`; source anchor `ctx:sha256:f983b67c8a06c11f75aebca28b58cc1e77ec942dc46d6cd97c291d57164b3714#chunk:c000001`.

## Problem And Outcome
During `CO-474`, `raw review output` contained explicit `[P1]` and `[P2]` findings while `review/telemetry.json` reported `status=succeeded`, `review_outcome=clean-success`, and `termination_boundary=null`. That let `provider-worker handoff` and operator summaries treat actionable findings as clean.

CO-478 must separate wrapper execution state from the `semantic review verdict`: parsed `[P0]`, `[P1]`, `[P2]`, and `[P3]` findings produce `review_verdict=findings` with machine-readable count/severity evidence, while clean review wording requires an actually clean semantic verdict.

## User Request Translation
Create the docs-first packet, add a CO-474-style successful-process fixture with findings, persist `review_verdict`, `highest_finding_priority`, and `finding_count`, and ensure handoff consumers check those fields while Codex review CLI exit-code behavior and guard semantics stay intact.

## Intent Checksum
- Protected terms: `raw review output`, `review/telemetry.json`, `[P0]`, `[P1]`, `[P2]`, `[P3]`, `review_outcome=clean-success`, `termination_boundary=null`, `provider-worker handoff`, `ready-review summaries`, `semantic review verdict`, `duplicated finding blocks`, `CO-474`.
- Reject interpretations that only update docs, only fix CO-474 product findings, only change Codex review exit-code expectations, infer cleanliness from `status=succeeded`, infer cleanliness from `termination_boundary=null`, or discard duplicated finding blocks as parser noise.

## Non-Goals
Do not fix CO-474 product findings, change Codex review CLI exit-code behavior, weaken command-intent / bounded-review / termination-boundary guards, make this docs-only, or broaden into provider-worker lifecycle redesign.

## Parity / Alignment Matrix

| Surface | Current Truth | Target Truth | Out Of Scope |
| --- | --- | --- | --- |
| `raw review output` | CO-474 output had explicit `[P1]` and `[P2]` findings. | Parse `[P0]` through `[P3]` findings from final reviewer output, including duplicated finding blocks. | Fixing CO-474 product findings. |
| `review/telemetry.json` | `status=succeeded`, `review_outcome=clean-success`, and `termination_boundary=null` can mask findings. | Keep wrapper outcome semantics, but add semantic verdict fields with finding count/severity. | Changing Codex review exit codes. |
| Handoff summaries | Provider-worker handoff can call the review clean from wrapper success alone. | Clean wording requires `review_verdict=clean`; `findings` and `unknown` fail closed. | Reworking unrelated lifecycle or PR state. |
| Guardrails | Boundary guards classify wrapper failure classes. | Guardrails remain intact and separate from semantic findings. | Weakening guard categories. |

## Not Done If
- Raw output containing explicit `[P0]`/`[P1]`/`[P2]`/`[P3]` findings can still produce telemetry that downstream handoff treats as clean.
- Provider-worker handoff or `ready-review summaries` can call a review clean without checking parsed findings.
- `review_outcome=clean-success` or `termination_boundary=null` remains sufficient proof of no findings.
- `duplicated finding blocks` erase findings or convert findings into a clean verdict.

## Fallback / Refactor Decision
This touches stale semantic projection behavior. Decision: remove the fallback where command success plus `termination_boundary=null` lets downstream consumers infer clean review semantics from `review_outcome=clean-success`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Review wrapper semantic verdict | Command success plus `termination_boundary=null` masks raw severity findings. | remove fallback | CO-478 | `raw review output` includes `[P0]`, `[P1]`, `[P2]`, or `[P3]` findings. | 2026-05-06 | 2026-05-06 | 0 days | Telemetry records parsed findings and handoff checks semantic verdict instead of wrapper outcome alone. | Focused telemetry/handoff tests, docs checks, standalone review. |
