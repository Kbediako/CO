# ACTION_PLAN - CO-478 review wrapper telemetry findings

## Scope
Create the CO-478 docs-first packet and guide the parent implementation so review wrapper telemetry and provider-worker handoff surfaces treat parsed review findings as a non-clean semantic review verdict. This child lane owns docs only.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
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
- Not done if:
  - raw output containing severity findings can still produce telemetry that downstream handoff treats as clean
  - provider-worker handoff or ready-review summaries can call a review clean without checking parsed findings
  - duplicated finding blocks are ignored
  - the fix changes CO-474 product recovery findings or Codex review CLI exit-code behavior instead of telemetry semantics
  - command-intent, bounded-review, or termination-boundary guards are weakened
- Pre-implementation issue-quality review:
  - 2026-05-06: docs child lane translated the parent prompt into a narrow telemetry and handoff verdict contract. The issue is not plausibly satisfied by docs-only packet creation or by fixing CO-474 product findings because the failure is the semantic mismatch between raw review findings and `review/telemetry.json` / provider-worker handoff cleanliness.
- Fallback / refactor decision:
  - This task touches stale/cached semantic projection behavior. Decision: remove the downstream clean projection fallback where wrapper command success and `termination_boundary=null` mask parsed raw review findings.
- Durable retention evidence:
  - Not applicable; no fallback is retained by this docs packet.
- Large-refactor check: parent should keep this scoped to review wrapper telemetry and handoff consumers. A shared finding parser/helper is acceptable only if it prevents duplicate ad hoc parsing across telemetry and provider-worker summary generation.

## CO-382 Fallback Metadata
- Large-refactor check: keep this bounded to review wrapper telemetry semantics and the provider-worker handoff consumer; do not absorb Codex review CLI behavior, CO-474 product recovery, or unrelated lifecycle state.
- Minor-seam behavior is acceptable only because CO-478 removes an unsafe downstream clean projection and records one bounded fallback decision.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| review wrapper telemetry verdict | `status=succeeded` plus `termination_boundary=null` can make handoff infer clean review semantics from `review_outcome=clean-success` even when raw review output contains `[P0]`/`[P1]`/`[P2]`/`[P3]` findings | remove fallback | CO-478 | Review wrapper raw output contains severity findings but telemetry and handoff classify the run as clean | 2026-05-06 | 2026-05-06 | 0 days | Telemetry records parsed findings and non-clean semantic review verdict; provider-worker handoff and ready-review summaries check that verdict instead of wrapper outcome alone | focused review-wrapper telemetry tests, handoff-summary tests, docs checks, standalone review |

## Plan
1. Register the CO-478 packet in the declared files: PRD, ACTION_PLAN, canonical TECH_SPEC, TECH_SPEC mirror, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Parent inspects the review wrapper raw output capture and `review/telemetry.json` writer.
3. Parent defines deterministic parsing for explicit `[P0]`, `[P1]`, `[P2]`, and `[P3]` finding blocks, including duplicated finding blocks.
4. Parent records parsed finding severity/count evidence and a non-clean semantic review verdict in telemetry when findings exist.
5. Parent updates provider-worker handoff and ready-review summary consumers so clean wording requires the parsed finding verdict to be clean.
6. Parent adds focused regressions for finding severities, duplicated finding blocks, clean no-finding output, and existing boundary-guard behavior.
7. Parent runs the required implementation gates, standalone review, elegance pass, PR checks, review feedback cleanup, and ready-review drain.

## Dependencies
- Raw review output capture
- `review/telemetry.json` generation
- Review outcome / semantic verdict classification
- Provider-worker handoff summary generation
- Ready-review summary consumption
- Existing command-intent, bounded-review, and termination-boundary guard behavior

## Validation
- Child lane:
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - protected-term scan over the declared CO-478 packet/mirror files
  - `git diff --check` over the declared touched paths
- Parent lane:
  - focused review-wrapper telemetry tests for `[P0]` through `[P3]`
  - duplicated finding block regression
  - provider-worker handoff / ready-review summary consumer regression
  - existing command-intent, bounded-review, and termination-boundary guard regressions
  - implementation gate
  - docs checks
  - standalone review and elegance/minimality review
  - PR checks, actionable feedback cleanup, ready-review drain, and Linear handoff

## Risks & Mitigations
- Risk: parent relies on Codex review process exit status as the review verdict.
  - Mitigation: acceptance requires a separate semantic review verdict based on parsed raw output findings.
- Risk: findings parser drops duplicated blocks as noise.
  - Mitigation: acceptance requires duplicated finding blocks to preserve at least finding presence and non-clean verdict state.
- Risk: `termination_boundary=null` is overloaded as a clean-review signal.
  - Mitigation: telemetry must expose parsed findings separately while preserving termination-boundary semantics for boundary failures.
- Risk: the implementation broadens into CO-474 product recovery.
  - Mitigation: packet non-goals keep CO-474 findings out of scope except as evidence for the telemetry bug.

## Approvals
- Reviewer: CO-478 provider worker
- Date: 2026-05-06
