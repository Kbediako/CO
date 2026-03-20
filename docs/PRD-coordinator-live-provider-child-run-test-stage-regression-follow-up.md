# PRD - Coordinator Live Provider Child-Run Test-Stage Regression Follow-Up

## Added by Bootstrap 2025-10-16

## Summary
- Problem Statement: `1305` proved that real provider-started child runs now clear `delegation-guard`, `build`, and `lint`, but the reused live `CO-2` child run did not stop on a generic resume hang. The existing manifest is terminal with `status_detail=stage:test:failed`, and `commands/04-test.ndjson` shows two concrete regressions on the current tree: `orchestrator/tests/RlmCodexRuntimeShell.test.ts` fails because empty-string non-interactive env vars are not normalized during `runCompletion(...)`, and `tests/delegation-guard.spec.ts` fails because the negative provider-started fixture also emits a misleading provider-child `parent_run_id` error before the intended launch-provenance failure.
- Desired Outcome: Register a truthful follow-up lane that fixes only the current `04-test` regressions, keeps the provider-started delegation contract intact, reruns the required repo validation, and proves through a live provider rerun that the child run advances beyond `stage:test:failed` or else records the next exact blocker.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Carry the next follow-up lane end to end from the current provider-run branch, use subagents heavily, keep the work docs-first, fix the smallest real blocker on the current tree, and only claim success if the live provider-started child run gets further than the current test-stage failure.
- Success criteria / acceptance:
  - a new truthful follow-up lane exists as `1306`
  - the spec narrows the current blocker to the concrete `04-test` regressions instead of a vague runner hang
  - `npm run test` passes on the implementation tree
  - the provider-started child run still clears `delegation-guard` and gets past `stage:test:failed`, or the next blocker is captured exactly
- Constraints / non-goals:
  - do not revisit provider setup, provider-intake authority, or the live webhook/secret work already proven
  - do not weaken `delegation-guard` or remove the control-host-only trust boundary established in `1305`
  - do not broaden scope into unrelated runtime cleanup if the current blocker is fixed by narrower env/diagnostic changes

## Goals
- Restore a clean `npm run test` gate on top of the `1305` provider contract branch.
- Keep the `delegation-guard` negative-path diagnostics truthful for provider-started fallback runs.
- Preserve the now-working provider-started live handoff path while pushing the live child run past the test stage.

## Non-Goals
- Reopening the provider task-id contract itself.
- Reworking general command-runner completion semantics without fresh evidence.
- Redesigning the RLM runtime shell beyond the current non-interactive env normalization bug.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - `npm run test` passes on the implementation tree
  - live provider intake still claims the started issue and launches/resumes the child run
  - the child run progresses beyond the current `stage:test:failed` boundary
- Guardrails / Error Budgets:
  - provider-started top-level proof from `1305` must remain unchanged in substance
  - negative `delegation-guard` output must not misclassify a top-level provider-started fallback run as a provider-child run before the top-level proof path is evaluated
  - stop at the first new downstream blocker after the test stage

## User Experience
- Personas: CO operator validating the real provider-driven autonomous run path
- User Journeys:
  - a started Linear issue is still accepted and claimed by the control host
  - the mapped child run clears `delegation-guard`, `build`, `lint`, and `test`
  - if another gate fails after `test`, the manifest and command log make that blocker explicit

## Technical Considerations
- Architectural Notes:
  - the live `CO-2` manifest already proves `commands/04-test` emitted `command:end` and a manifest transition to `failed`; the current blocker is the test content, not a missing lifecycle terminal event
  - `createRlmCodexRuntimeShell(...)` currently uses nullish-coalescing when forcing non-interactive env vars, which preserves empty strings instead of normalizing them to the intended defaults
  - `scripts/delegation-guard.mjs` currently attempts provider-child parent-proof validation for any unregistered task id before it knows whether the task is actually a provider child, which pollutes the negative top-level provider-started path with an unrelated `parent_run_id` failure
  - non-default control-host task/run provenance must persist on sanctioned provider-run manifests and be backfilled on resume for older provider manifests so `delegation-guard` can recover the authoritative provider-intake ledger path without trusting arbitrary sidecar ledgers
- Dependencies / Integrations:
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `.runs/local-mcp/cli/control-host/linear-advisory-state.json`
  - `.runs/linear-856c1318-524f-4db3-8d4a-b357ec51c304/cli/2026-03-19T11-53-42-683Z-10f53643/manifest.json`
  - `.runs/linear-856c1318-524f-4db3-8d4a-b357ec51c304/cli/2026-03-19T11-53-42-683Z-10f53643/commands/04-test.ndjson`

## Open Questions
- After the current `04-test` regressions are fixed, does the live child run stop at `spec-guard`, a later repo gate, or complete cleanly?
- Does the live rerun prove that manifest-carried control-host provenance is sufficient for the resumed provider branch to keep resolving the authoritative ledger without the original custom-host locator env?

## Approvals
- Product: Self-approved from operator directive and current manifest evidence
- Engineering: docs-review approved via `.runs/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up/cli/2026-03-19T21-44-24-346Z-e87d8d12/manifest.json`
- Design: N/A
