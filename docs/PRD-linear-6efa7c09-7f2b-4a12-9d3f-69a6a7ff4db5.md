# PRD - CO: Deduplicate trailing JSON-tail parsing across child-stream and delegation server

## Added by Bootstrap 2026-04-02

## Traceability
- Linear issue: `CO-50` / `6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5`
- Linear URL: https://linear.app/asabeko/issue/CO-50/co-deduplicate-trailing-json-tail-parsing-across-child-stream-and
- Source issue: `CO-37` / `97aef5e3-dadb-4909-9b00-68c698f10f93`
- Source PR: `#325`

## Summary
- Problem Statement: `orchestrator/src/cli/providerLinearChildStreamShell.ts` now has a local `parseTrailingJsonObject(...)` flow that overlaps the existing `parseSpawnOutput(...)` logic in `orchestrator/src/cli/delegationServer.ts`. The overlap is close enough that the two seams can drift, but not close enough to prove shared behavior from one place.
- Desired Outcome: both seams use one shared helper for trailing JSON-tail extraction, preserve fail-closed object-only parsing and existing returned payload contracts, and carry focused regression coverage for prelude-log success plus malformed-output failure.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-50` in this provider-worker workspace by extracting the shared trailing-JSON parsing behavior into one helper and wiring both the provider-worker child-stream shell and the delegation server spawn parser to that helper without reopening the broader `CO-37` scope.
- Success criteria / acceptance:
  - one shared helper owns the trailing JSON object parse behavior used by both seams
  - the helper preserves object-only parsing, the trailing `}` tail guard, full-string parse first, then line-suffix scan for the final JSON object
  - both call sites keep their current return contracts (`ProviderLinearChildRunResult | null` vs `Record<string, unknown>`)
  - regression coverage exercises both seams for prelude-log success and malformed-output failure
- Constraints / non-goals:
  - do not widen into unrelated delegation-server behavior, child-stream lineage changes, or output-schema changes
  - keep the fix bounded to the shared parser seam, the two call sites, and truthful tests/docs
  - preserve fail-closed behavior when the final output is malformed, non-object, or missing

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `Deduplicate trailing JSON-tail parsing across child-stream and delegation server`
  - `Preserve existing fail-closed behavior`
  - `full-string parse first, then line-suffix scan for the final JSON object`
- Protected terms / exact artifact and surface names:
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - `orchestrator/src/cli/delegationServer.ts`
  - `parseTrailingJsonObject`
  - `parseSpawnOutput`
  - `linear child-stream`
- Nearby wrong interpretations to reject:
  - do not broaden this into a generic stdout parsing framework for unrelated CLI surfaces
  - do not change the provider-worker child-run normalization or delegation-server spawn result shapes
  - do not treat this as permission to relax malformed-output handling or path confinement

## Parity / Alignment Matrix
- Current truth:
  - provider-worker child-stream already uses a strict trailing-JSON helper with object-only parsing and a trailing `}` guard
  - delegation-server spawn parsing still uses its own nearby-but-separate extraction logic
- Reference truth:
  - `CO-37` intentionally kept the first repair bounded to the provider-worker seam while using the delegation-server posture as the narrow reference
- Target truth / intended delta:
  - both seams call the same shared helper and therefore share the same final JSON-tail parse contract
- Explicitly out-of-scope differences:
  - any spawn transport, lineage persistence, or control-endpoint changes outside the parser extraction

## Not Done If
- the two call sites still have duplicated trailing-JSON parsing logic after the patch
- either seam loses fail-closed behavior for malformed or non-object output
- provider-worker or delegation-server return payload shapes change
- regression coverage does not prove both seams against the required success and failure cases

## Goals
- Eliminate drift risk by centralizing the trailing JSON object parse logic.
- Preserve the narrower `CO-37` outcome while finishing the deduplication follow-up.
- Keep the helper small, auditable, and explicit about fail-closed behavior.
- Prove the contract at both seams with focused tests.

## Non-Goals
- Broad delegation-server refactors unrelated to spawn-output parsing.
- New child-stream output schemas or richer spawn metadata.
- Changing provider-worker proof, lineage, or workpad behavior.
- Adding new pipelines, states, or approval flows.

## Stakeholders
- Product: CO operators and reviewers depending on truthful provider-worker and delegation flows
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - provider-worker and delegation-server paths both consume one shared helper
  - prelude-log success and malformed-output failure are both covered in focused tests at each seam
  - no downstream payload contract changes are required
- Guardrails / Error Budgets:
  - never parse arrays or primitives as successful object payloads
  - never accept malformed final JSON as success
  - never widen path-validation or spawn-manifest resolution semantics as part of this lane

## User Experience
- Personas: provider-worker authors, operators launching bounded child streams, and reviewers auditing delegation-server behavior
- User Journeys:
  - a provider-worker child stream succeeds even when the command emits prelude logs before the final JSON object
  - a delegation-server spawn result succeeds under the same valid final JSON-tail shape
  - malformed or truncated output still fails cleanly instead of producing a partial or false-positive success

## Technical Considerations
- Architectural Notes:
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts` already contains the stricter `parseTrailingJsonObject(...)` posture that this follow-up should preserve
  - `orchestrator/src/cli/delegationServer.ts` should reuse the shared helper and adapt its `null` result back to `{}` for the existing `parseSpawnOutput(...)` contract
  - the helper should live in a shared CLI utility path rather than inside either current call site
- Dependencies / Integrations:
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - `orchestrator/src/cli/delegationServer.ts`
  - `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
  - `orchestrator/tests/DelegationServer.test.ts`

## Open Questions
- Whether delegation-server should continue tolerating JSON before trailing logs or align fully to strict final-tail semantics. This lane assumes the issue acceptance criteria are authoritative and therefore the shared helper should preserve the stricter trailing-tail contract.

## Approvals
- Product: Self-approved from the Linear issue scope and acceptance criteria
- Engineering: docs-review approved via `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5-co-50-docs-review/cli/2026-04-02T08-32-47-430Z-05430a37/manifest.json` with `review/telemetry.json` reporting `status: succeeded`, `review_outcome: clean-success`; continuation advisory evidence succeeded via `.runs/linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5-co-50-turn1-scope-check/cli/2026-04-02T12-05-09-295Z-ecebe29f/manifest.json`; focused regressions, guard/build/lint/test/docs/diff-budget, and `npm run pack:smoke` are now green, and the manifest-backed standalone review telemetry reports `status: succeeded`, `review_outcome: bounded-success`. The earlier full-suite "hang" was disproved by a patience-first `npm run test` run that exited cleanly after the silent late-tail files completed.
- Design: N/A
