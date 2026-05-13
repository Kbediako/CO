# PRD - CO Make Linear Child-Stream JSON Parsing Robust to Wrapper Prelude Logs

## Added by Bootstrap 2026-03-30

## Traceability
- Linear issue: `CO-37` / `97aef5e3-dadb-4909-9b00-68c698f10f93`
- Linear URL: https://linear.app/asabeko/issue/CO-37/co-make-linear-child-stream-json-parsing-robust-to-wrapper-prelude

## Summary
- Problem Statement: `linear child-stream --format json` can currently report `provider_worker_child_stream_output_invalid` even when the launched child pipeline succeeds because `parseProviderChildRunResult(...)` only attempts `JSON.parse(...)` when the trimmed stdout begins with `{`. Real provider-worker evidence for `CO-26` shows successful `docs-review` child runs whose stdout included Codex-Orchestrator prelude logs before the final JSON payload, which breaks the helper parse and forces manual manifest inspection.
- Desired Outcome: provider-worker lanes can rely on `linear child-stream --format json` again when child commands emit leading informational logs before the final JSON object, while malformed or missing final JSON still fails closed and the returned structured payload stays unchanged on success.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Complete Linear issue `CO-37` in this workspace by making the provider-worker `linear child-stream` helper robust to wrapper prelude logs without weakening its validation contract or changing the success payload shape used by downstream workpads and review flows.
- Success criteria / acceptance:
  - `linear child-stream --pipeline docs-review --format json` returns structured success when leading informational logs precede the final JSON object
  - malformed or missing final JSON still fails with a clear error
  - regression tests cover both the prelude-log success path and malformed-output failure path
  - successful payload fields remain unchanged (`ok`, `child_run`, `manifest_path`, and related fields)
- Constraints / non-goals:
  - stay bounded to the provider-worker child-stream parse seam plus the docs/tests needed to keep it truthful
  - do not widen into broader provider-worker workflow, lineage, or delegation-policy changes
  - preserve fail-closed path validation for unsafe or malformed child-run output

## Goals
- Accept valid final JSON objects even when stdout contains leading wrapper log lines.
- Keep the child-run path validation and returned success payload unchanged once parsing succeeds.
- Preserve clear failure behavior when final JSON is missing or malformed.
- Add focused regression coverage for the successful prelude-log case and a malformed-output failure case.

## Non-Goals
- Changing the allowlisted child-stream pipeline set.
- Changing provider-worker lineage persistence or control-host provenance rules.
- Relaxing path confinement or child-run safety validation.
- Redesigning child-stream output formats beyond the minimal robust parse needed here.

## Stakeholders
- Product: CO operators relying on provider-worker review/planning child streams
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - successful child streams with leading prelude logs now return structured success instead of `provider_worker_child_stream_output_invalid`
  - malformed or missing final JSON remains a hard failure
  - focused tests fail if prelude-log tolerance regresses
- Guardrails / Error Budgets:
  - never parse arbitrary mid-stream text as success when no valid final JSON object exists
  - never widen accepted artifact/log/manifest paths outside the existing expected child-run root
  - keep returned payload fields stable for successful parses

## User Experience
- Personas: provider workers and operators using `linear child-stream` as the audited delegation path
- User Journeys:
  - a provider worker runs `linear child-stream --pipeline docs-review --format json` and receives structured success even if wrapper logs precede the final JSON payload
  - a malformed or truncated child output still produces a clear parse failure instead of a false success
  - downstream workpad and handoff logic continue to consume the same success payload fields without adaptation

## Technical Considerations
- Architectural Notes:
  - the narrow seam is `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - the current failure gate is the `trimmed.startsWith('{')` guard in `parseProviderChildRunResult(...)`
  - `orchestrator/src/cli/delegationServer.ts` already contains a bounded helper pattern that extracts an object payload from surrounding logs, which is the right reference posture for this lane
- Dependencies / Integrations:
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts`
  - `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
  - `orchestrator/src/cli/delegationServer.ts` as a reference for bounded JSON extraction

## Open Questions
- Whether the smallest durable implementation is to reuse the delegation-server style line-window extraction directly or factor a tiny helper local to the child-stream shell. Prefer the smallest option that stays bounded to this seam.

## Approvals
- Product: Self-approved from Linear issue scope and acceptance criteria
- Engineering: Pre-implementation review approved for the narrow child-stream parse repair; docs-review approved via `.runs/linear-97aef5e3-dadb-4909-9b00-68c698f10f93-docs-review/cli/2026-03-30T06-50-00-271Z-a27a59eb/manifest.json` with wrapper parse override recorded in `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T065459Z-docs-review-override.md`
- Design: N/A
