# PRD - CO-478 review wrapper telemetry findings

## Traceability
- Linear issue: `CO-478` / `f3aec8da-23c6-459e-acba-a5045b404c7f`
- Linear URL: https://linear.app/asabeko/issue/CO-478
- Task id: `linear-f3aec8da-23c6-459e-acba-a5045b404c7f`
- Canonical spec: `tasks/specs/linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`
- Task checklist: `tasks/tasks-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`
- Agent mirror: `.agent/task/linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`
- Source anchor: `ctx:sha256:f983b67c8a06c11f75aebca28b58cc1e77ec942dc46d6cd97c291d57164b3714#chunk:c000001`
- Source manifest: `.runs/linear-f3aec8da-23c6-459e-acba-a5045b404c7f-docs-packet-r3/cli/2026-05-06T02-34-49-449Z-92e67c3a/manifest.json`
- Source payload: `.runs/linear-f3aec8da-23c6-459e-acba-a5045b404c7f-docs-packet-r3/cli/2026-05-06T02-34-49-449Z-92e67c3a/memory/source-0/source.txt`
- Source payload note: this child checkout does not contain `.runs/` at its root; this packet is anchored to the parent-provided source anchor and complete issue contract in the child-lane prompt.

## Summary
- Problem Statement: during `CO-474`, raw review output contained explicit `[P1]` and `[P2]` findings while `review/telemetry.json` still reported `status=succeeded`, `review_outcome=clean-success`, and `termination_boundary=null`. That allowed provider-worker handoff and summaries to treat a review with actionable findings as clean.
- Desired Outcome: parent implementation makes the review wrapper parse raw review output for severity findings, record a non-clean semantic review verdict in telemetry, and require downstream provider-worker handoff and ready-review summaries to check parsed findings before calling a review clean.

## User Request Translation
- User intent / needs:
  - create the CO-478 docs-first packet and declared registry mirrors before implementation starts
  - preserve the exact review wrapper telemetry failure from CO-474
  - require raw review output findings with `[P0]`, `[P1]`, `[P2]`, or `[P3]` to prevent a clean handoff verdict
  - keep Codex review CLI exit-code behavior, command-intent guards, bounded-review guards, and termination-boundary guards intact
  - make parent implementation substantive; this issue is not complete as a docs-only change
- Success criteria / acceptance:
  - PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, `docs/TASKS.md`, `tasks/index.json`, and `docs/docs-freshness-registry.json` are updated inside the declared file scope
  - telemetry exposes parsed findings and a semantic review verdict that cannot be mistaken for `review_outcome=clean-success`
  - provider-worker handoff and ready-review summaries cannot call a review clean without checking parsed findings
  - duplicated finding blocks do not cause findings to be ignored or a clean verdict to be emitted
- Constraints / non-goals:
  - child lane owns docs only and must not edit implementation, tests, scripts, config, Linear state, workpad, PR surfaces, or lifecycle commands
  - parent owns implementation, focused validation, docs-review, standalone review, elegance review, PR checks, ready-review drain, and Linear handoff
  - do not run full repo validation from this child lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `raw review output`
  - `review/telemetry.json`
  - `[P1]`
  - `[P2]`
  - `review_outcome=clean-success`
  - `termination_boundary=null`
  - `provider-worker handoff`
  - `semantic review verdict`
  - `duplicated finding blocks`
- Protected terms / exact artifact and surface names:
  - `raw review output`
  - `review/telemetry.json`
  - `[P0]`
  - `[P1]`
  - `[P2]`
  - `[P3]`
  - `review_outcome=clean-success`
  - `termination_boundary=null`
  - `provider-worker handoff`
  - `ready-review summaries`
  - `semantic review verdict`
  - `CO-474`
- Nearby wrong interpretations to reject:
  - "A zero exit status from Codex review means the semantic review verdict is clean."
  - "`status=succeeded` alone is enough for provider-worker handoff."
  - "`termination_boundary=null` means there were no actionable findings."
  - "Only `[P1]` findings should block clean handoff; `[P2]` and `[P3]` can be ignored."
  - "Duplicated finding blocks are parser noise and can be discarded wholesale."
  - "Fixing the CO-474 product findings satisfies CO-478."
  - "Changing Codex review CLI exit-code behavior is required."
  - "Command-intent, bounded-review, or termination-boundary guards should be weakened to make findings visible."

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Raw review output | CO-474 output had explicit `[P1]` and `[P2]` findings. | Severity-tagged findings are actionable reviewer output even when the wrapper process succeeds. | Review wrapper parses `[P0]` through `[P3]` findings from raw review output and records their presence. | Fixing the CO-474 product recovery findings. |
| `review/telemetry.json` | Telemetry can say `status=succeeded`, `review_outcome=clean-success`, and `termination_boundary=null` despite raw findings. | `status` should describe command execution while the semantic review verdict describes review content. | Telemetry carries parsed finding counts/severities and a non-clean semantic review verdict whenever findings exist. | Changing Codex review CLI exit-code behavior. |
| Provider-worker handoff | Handoff and summaries can treat clean-success telemetry as clean without parsing findings. | Handoff readiness must depend on the semantic review verdict, not command success alone. | Provider-worker handoff and ready-review summaries reject clean wording when parsed findings exist. | Reworking unrelated provider admission, PR lifecycle, or Linear workpad rules. |
| Termination boundary | `termination_boundary=null` can coexist with a falsely clean review outcome. | Termination-boundary guards should remain about boundary failures. | A null termination boundary is allowed only when telemetry still exposes the non-clean semantic review verdict and parsed findings. | Weakening command-intent, bounded-review, or termination-boundary guards. |
| Duplicated findings | Repeated finding blocks can be treated as noise. | Duplicates may be collapsed for display, but their presence remains actionable. | Duplicated finding blocks cannot erase findings or convert a findings verdict into clean success. | Building a broad review-output summarizer beyond severity finding detection. |

## Not Done If
- Raw output containing explicit `[P0]`/`[P1]`/`[P2]`/`[P3]` findings can still produce telemetry that downstream handoff treats as clean.
- Provider-worker handoff or ready-review summaries can call a review clean without checking parsed findings.
- Duplicated finding blocks are ignored.
- `review/telemetry.json` can report `review_verdict=clean`, omit finding severity/count evidence, or otherwise let downstream handoff treat parsed severity findings as clean.
- `termination_boundary=null` is used as the only signal for "no review issues".
- The implementation fixes CO-474 product recovery findings instead of the review wrapper telemetry/handoff verdict contract.
- The implementation weakens command-intent, bounded-review, or termination-boundary guards.

## Goals
- Create the CO-478 docs-first packet and declared registry mirrors.
- Define a parent implementation contract for parsing severity findings from raw review output.
- Require telemetry to separate command execution status from the semantic review verdict.
- Require provider-worker handoff and ready-review summaries to treat parsed findings as non-clean review evidence.
- Preserve existing review wrapper guardrails and Codex review CLI exit-code behavior.

## Non-Goals
- No implementation, test, script, source, config, Linear, workpad, PR, or lifecycle edits in this child lane.
- No fix for CO-474 product recovery findings.
- No change to Codex review CLI exit-code behavior.
- No weakening of command-intent, bounded-review, or termination-boundary guards.
- No broad provider-worker lifecycle redesign.
- No docs-only completion for the parent issue.

## Stakeholders
- Product: CO operators relying on review telemetry and handoff summaries to decide whether an issue is ready.
- Engineering: parent CO-478 provider worker implementing the review wrapper telemetry and handoff checks.
- Review: parent lane validating that actionable review findings block clean handoff language.

## Metrics & Guardrails
- Primary Success Metrics:
  - raw output with `[P0]`, `[P1]`, `[P2]`, or `[P3]` findings yields non-clean telemetry semantics
  - telemetry exposes parsed finding counts/severities or equivalent structured evidence
  - provider-worker handoff and ready-review summaries check parsed findings before clean wording
  - duplicated finding blocks remain actionable and cannot be ignored
- Guardrails:
  - `status=succeeded` can still describe wrapper execution, but must not imply clean review semantics
  - `termination_boundary` remains reserved for boundary failures and is not overloaded as the only review verdict
  - no change to Codex review CLI exit-code behavior
  - no child-lane edits outside declared docs files

## Technical Considerations
- Architectural Notes:
  - parent implementation should treat raw review output parsing as an input to telemetry and handoff classification
  - severity finding extraction should be deterministic and resilient to repeated finding blocks
  - `review_outcome=clean-success` remains wrapper execution state; the semantic review verdict and finding evidence must carry review-content cleanliness
  - the semantic review verdict should be machine-checkable so downstream provider-worker handoff cannot rely on prose only
- Dependencies / Integrations:
  - review wrapper telemetry writer
  - raw review output capture
  - provider-worker handoff summary generation
  - ready-review summary or readiness surfaces that consume review telemetry
  - existing command-intent, bounded-review, and termination-boundary guard contracts

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove the downstream clean semantic projection where command success plus `termination_boundary=null` can mask raw review findings.
- Rationale: the unsafe seam is a stale semantic projection from wrapper execution status to review cleanliness. Parent implementation should parse findings and expose semantic verdict state instead of adding another fallback.

## CO-382 Fallback Metadata
- Large-refactor check: keep this bounded to review wrapper telemetry semantics and the provider-worker handoff consumer; do not absorb Codex review CLI behavior, CO-474 product recovery, or unrelated lifecycle state.
- Minor-seam behavior is acceptable only because CO-478 removes an unsafe downstream clean projection and records one bounded fallback decision.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| review wrapper telemetry verdict | `status=succeeded` plus `termination_boundary=null` can make handoff infer clean review semantics from `review_outcome=clean-success` even when raw review output contains `[P0]`/`[P1]`/`[P2]`/`[P3]` findings | remove fallback | CO-478 | Review wrapper raw output contains severity findings but telemetry and handoff classify the run as clean | 2026-05-06 | 2026-05-06 | 0 days | Telemetry records parsed findings and non-clean semantic review verdict; provider-worker handoff and ready-review summaries check that verdict instead of wrapper outcome alone | focused review-wrapper telemetry tests, handoff-summary tests, docs checks, standalone review |

## Open Questions
- What exact telemetry field name should carry the machine-checkable semantic review verdict?
- Should duplicated finding blocks preserve duplicate count separately from unique finding count, or only record that duplicates were observed?

## Approvals
- Product: CO-478 child-lane prompt, accepted as packet contract
- Engineering: bounded docs-only child lane
- Design: N/A
