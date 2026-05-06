---
id: 20260506-linear-f3aec8da-23c6-459e-acba-a5045b404c7f
title: "CO-478 review wrapper telemetry findings"
status: in_progress
owner: Codex
created: 2026-05-06
last_review: 2026-05-06
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md
related_tech_spec_mirror: docs/TECH_SPEC-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md
related_action_plan: docs/ACTION_PLAN-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md
related_tasks:
  - tasks/tasks-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md
review_notes:
  - 2026-05-06: Bounded child lane created the docs-first packet and declared-scope registry mirrors.
---

# TECH_SPEC - CO-478 review wrapper telemetry findings

## Canonical Reference
- PRD: `docs/PRD-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`
- Task checklist: `tasks/tasks-linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`
- Agent mirror: `.agent/task/linear-f3aec8da-23c6-459e-acba-a5045b404c7f.md`
- Registry: `tasks/index.json`
- Task snapshot: `docs/TASKS.md`
- Source anchor: `ctx:sha256:f983b67c8a06c11f75aebca28b58cc1e77ec942dc46d6cd97c291d57164b3714#chunk:c000001`

## Summary
- Objective: make review wrapper telemetry surface actionable findings from raw review output so downstream provider-worker handoff and ready-review summaries cannot treat a review with findings as clean.
- Scope:
  - raw review output parsing for `[P0]`, `[P1]`, `[P2]`, and `[P3]` findings
  - `review/telemetry.json` semantic review verdict and parsed finding evidence
  - provider-worker handoff and ready-review summary consumption of parsed findings
  - duplicated finding block handling
  - task packet and declared registry/checklist mirrors
- Constraints:
  - do not fix CO-474 product recovery findings
  - do not change Codex review CLI exit-code behavior
  - do not weaken command-intent, bounded-review, or termination-boundary guards
  - avoid Linear mutation helpers, lifecycle edits, and implementation/test edits in this child lane

## Issue-Shaping Contract
- User-request translation:
  - raw review output findings are actionable review content even when the wrapper command succeeds
  - `review_outcome=clean-success` must not be used by downstream consumers as proof of no findings
  - `termination_boundary=null` is not a clean-review verdict
  - provider-worker handoff and ready-review summaries must check parsed findings before calling a review clean
  - duplicated finding blocks must not be ignored
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
  - `duplicated finding blocks`
  - `CO-474`
- Nearby wrong interpretations to reject:
  - command success alone means clean review
  - `termination_boundary=null` means no actionable review findings
  - `[P2]` and `[P3]` findings are safe to ignore
  - duplicate finding blocks should make the parser discard all findings
  - CO-478 is complete if CO-474 product findings are fixed
  - review wrapper guards should be weakened so findings become visible
- Explicit non-goals:
  - no CO-474 product recovery fix
  - no Codex review CLI exit-code behavior change
  - no weakening command-intent, bounded-review, or termination-boundary guards
  - no source/test/script/config edits in this child docs lane
  - no docs-only completion for the parent implementation lane

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `raw review output` | CO-474 raw output contained explicit `[P1]` and `[P2]` findings. | Severity-tagged findings are actionable review content independent of wrapper exit status. | Parser detects `[P0]` through `[P3]` findings and duplicate finding blocks. | Fixing CO-474 product recovery findings. |
| `review/telemetry.json` | Can report `status=succeeded`, `review_outcome=clean-success`, and `termination_boundary=null` despite findings. | Execution status, boundary status, and semantic review verdict are separate concepts. | Telemetry carries parsed finding evidence and non-clean semantic review verdict whenever findings exist. | Changing Codex review CLI exit codes. |
| Provider-worker handoff | Handoff can summarize the review as clean based on clean-success telemetry. | Handoff must trust the semantic review verdict. | Handoff and ready-review summaries refuse clean wording when parsed findings exist. | Reworking unrelated lifecycle or PR state. |
| Guardrails | Command-intent, bounded-review, and termination-boundary guards already fail closed for their own classes. | Guardrails should remain strict while findings get their own semantic verdict. | Existing guard behavior is preserved and findings add a separate non-clean outcome. | Weakening or merging guard categories. |

## Readiness Gate
- Not done if:
  - raw output containing explicit `[P0]`/`[P1]`/`[P2]`/`[P3]` findings can still produce telemetry that downstream handoff treats as clean
  - provider-worker handoff or ready-review summaries can call a review clean without checking parsed findings
  - duplicated finding blocks are ignored
  - `review_outcome=clean-success` is still treated as clean review proof when parsed findings exist
  - `termination_boundary=null` is treated as sufficient clean-review proof
  - CO-474 product recovery, Codex review CLI exit codes, or review-wrapper guard weakening becomes the implementation path
- Pre-implementation issue-quality review evidence:
  - 2026-05-06: child lane reviewed the issue contract and nearby packet style. CO-478 remains a distinct review-wrapper telemetry and handoff verdict issue because the failure is a semantic mismatch between raw findings and clean telemetry, not the underlying CO-474 product findings or review process exit status.
- Safeguard ownership split:
  - child owns docs packet and declared mirrors only
  - parent owns source inspection, implementation, validation, Linear state, workpad, PR, and review lifecycle

## Technical Requirements
1. Parse `raw review output` for explicit `[P0]`, `[P1]`, `[P2]`, and `[P3]` findings.
2. Preserve finding presence when finding blocks are duplicated; duplicates may be summarized, but must not erase the non-clean verdict.
3. Record parsed finding severity/count evidence or equivalent structured evidence in `review/telemetry.json`.
4. Add or update a machine-checkable `semantic review verdict` that is non-clean when parsed findings exist.
5. Prevent provider-worker handoff and ready-review summaries from treating `review_outcome=clean-success` as clean review proof when parsed findings exist.
6. Keep `status=succeeded` available for command execution success without letting it imply review cleanliness.
7. Preserve `termination_boundary` semantics for boundary failures; `termination_boundary=null` must not be the only clean-review signal.
8. Update provider-worker handoff and ready-review summaries so clean wording requires no parsed findings.
9. Preserve command-intent, bounded-review, and termination-boundary guard behavior.
10. Add focused tests for findings, duplicates, clean output, and existing guard behavior.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| review wrapper telemetry verdict | Downstream clean projection from command success, `termination_boundary=null`, and `review_outcome=clean-success` despite raw severity findings | remove fallback | CO-478 | `raw review output` includes `[P0]`, `[P1]`, `[P2]`, or `[P3]` findings | 2026-05-06 | 2026-05-06 | 0 days | Parsed findings and non-clean semantic review verdict are recorded and consumed by handoff instead of wrapper outcome alone | Focused telemetry and handoff regressions |

- Large-refactor check: keep this bounded to review wrapper telemetry semantics and handoff consumers; a shared helper is acceptable only when it reduces duplicate parsing across those surfaces.
- Minor-seam behavior is acceptable only because CO-478 removes an unsafe downstream clean projection and records one bounded fallback decision.

## Acceptance Criteria
- CO-478 packet docs are created in the declared file scope.
- `tasks/index.json` registers the canonical task id and TECH_SPEC.
- `docs/TASKS.md` includes a CO-478 snapshot.
- `docs/docs-freshness-registry.json` registers the packet and mirror rows.
- Parent implementation parses `[P0]` through `[P3]` findings from raw review output.
- Parent implementation records parsed findings and a non-clean semantic review verdict in `review/telemetry.json`.
- Parent implementation prevents provider-worker handoff and ready-review summaries from calling reviews clean when parsed findings exist.
- Parent implementation preserves existing command-intent, bounded-review, and termination-boundary guard semantics.

## Validation Plan
- Child lane:
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - protected-term scan over declared CO-478 packet/mirror files
  - `git diff --check` over declared touched paths
- Parent lane:
  - focused review-wrapper telemetry regressions
  - provider-worker handoff summary regression
  - existing review-wrapper guard regressions
  - implementation gate
  - standalone review
  - elegance/minimality review
  - PR checks and ready-review drain

## Open Questions
- Which exact telemetry field should carry the semantic review verdict?
- Should duplicate findings be represented as duplicate count, unique count, or both?

## Approvals
- Reviewer: CO-478 provider worker
- Date: 2026-05-06
