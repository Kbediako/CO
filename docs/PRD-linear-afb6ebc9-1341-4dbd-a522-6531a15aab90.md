# PRD - CO workflow: add provider adoption eval for source-0, child lanes, and follow-up traceability

## Traceability
- Linear issue: `CO-176` / `afb6ebc9-1341-4dbd-a522-6531a15aab90`
- Canonical task id: `20260414-linear-afb6ebc9-1341-4dbd-a522-6531a15aab90`
- Shared source 0 anchor: `ctx:sha256:f10048ebd85a93d68cf83a955517b1aeb516eab4c50716c338e126d73a259b9d#chunk:c000001`
- Source object id: `sha256:f10048ebd85a93d68cf83a955517b1aeb516eab4c50716c338e126d73a259b9d`
- Handoff source payload: `.runs/linear-afb6ebc9-1341-4dbd-a522-6531a15aab90-docs-first-packet/cli/2026-04-14T04-42-03-853Z-4d1ae1a8/memory/source-0/source.txt`
- Parent lane ownership: authoritative issue workspace, Linear state, workpad, PR lifecycle, and patch acceptance.

## Summary
- Problem Statement: provider-worker adoption of source-0 context, prompt-pack references, same-issue child-lane parallelization, and autonomous follow-up traceability needs a machine-checkable eval rather than narrative confidence.
- Desired Outcome: a provider adoption eval proves that a worker uses the anchored `memory/source-0` and `prompt-pack` inputs, makes and records safe parallel-first same-issue child-lane decisions with launch plus acceptance/reject/invalidate proof, and preserves autonomous follow-up, link, and workpad traceability without live Linear mutation.

## User Request Translation (Context Anchor)
- User intent / needs: create the docs-first packet for `CO-176` only, so a later implementation can add a provider adoption eval that covers `memory/source-0` and `prompt-pack` usage, parallel-first same-issue child-lane decision and lifecycle proof, and autonomous follow-up/link/workpad traceability.
- Success criteria / acceptance: the packet preserves the source anchor, intent checksum, protected terms, non-goals, `Not Done If`, acceptance criteria, and sanitized-fixture privacy constraints; it registers the canonical task id and required registry mirrors; it leaves implementation/eval code untouched for the parent-owned implementation phase.
- Constraints / non-goals: do not call Linear mutation helpers, do not edit implementation or eval files in this child lane, do not run full repo validation suites, and do not replace parent-owned Linear/workpad/PR integration.

## Intent Checksum
- Exact user wording / phrases to preserve: `provider adoption eval`, `memory/source-0/prompt-pack usage`, `parallel-first same-issue child-lane decisions and launch/acceptance proof`, `autonomous follow-up/link/workpad traceability`, `sanitized-fixture privacy constraints`.
- Protected terms / exact artifact and surface names: `memory/source-0`, `source-0/source.txt`, `prompt-pack`, `ctx:sha256:f10048ebd85a93d68cf83a955517b1aeb516eab4c50716c338e126d73a259b9d#chunk:c000001`, `linear parallelization --decision parallelize_now|stay_serial|forbid_parallel`, `linear child-lane --action launch|accept|reject|invalidate`, `parallelize_now`, `stay_serial`, `forbid_parallel`, `launch/acceptance proof`, `workpad`, `follow-up`, `link traceability`.
- Nearby wrong interpretations to reject: runtime rebuilds, generic prompt-quality evals without source-0 proof, metric-only child-lane adoption counts, live Linear mutation during eval, unsanitized real issue payloads, parent acceptance bypass, and prose-only traceability claims.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta |
| --- | --- | --- | --- |
| Source-0 and prompt-pack use | Provider runs can receive `memory/source-0` and prompt-pack context, but adoption proof can be implicit. | CO-176 requires explicit proof of provider use of the handed-off source anchor and prompt-pack references. | Eval fixture includes sanitized source-0 and prompt-pack inputs, then asserts the provider output cites or carries the expected provenance without leaking sensitive payload. |
| Parallel-first child-lane behavior | `CO-174` established parallel-first policy and lifecycle vocabulary. | CO-176 needs eval coverage that verifies the policy is actually adopted by provider workers. | Eval proves decision recording, safe candidate reasoning, child-lane launch, declared scope, and parent acceptance/reject/invalidate outcome proof. |
| Follow-up, link, and workpad traceability | Provider workflows can create workpads, attach PRs, and shape follow-ups, but trace chains are easy to inspect manually rather than eval. | Autonomous follow-up and link/workpad traces must be auditable. | Eval asserts stable identifiers, parent-owned link/workpad updates, and follow-up provenance across the fixture lifecycle. |
| Privacy and fixture boundary | Live Linear payloads and run memory may contain operational context. | Eval must be safe to run locally and in CI. | Use sanitized fixtures only, with no secrets, PII, live Linear API calls, or real workpad mutation. |

## Not Done If
- The eval can pass without proving `memory/source-0` and `prompt-pack` consumption from the protected source anchor.
- Child-lane adoption is counted without a recorded `linear parallelization` decision, launch proof, bounded ownership scope, and parent outcome proof.
- Follow-up/link/workpad traceability is asserted only in prose or depends on live Linear mutations.
- Fixtures include secrets, PII, full real issue transcripts, or non-sanitized source payloads.
- The implementation weakens parent-owned Linear mutation, child-lane acceptance authority, or existing `parallelize_now|stay_serial|forbid_parallel` semantics.

## Goals
- Define the provider adoption eval contract before implementation.
- Preserve exact source anchor, artifact names, decision vocabulary, and traceability expectations.
- Require sanitized, deterministic fixture evidence for source use, child-lane lifecycle, and autonomous follow-up traceability.

## Non-Goals
- Do not implement eval code, runtime prompt changes, child-lane shell changes, Linear mutations, PR lifecycle automation, or fixture payload generation in this docs-only child lane.
- Do not broaden into a general provider-worker redesign, run memory controller rewrite, live adoption audit, or global child-lane policy change.
- Do not use live Linear issues or real workpad comments as eval fixtures.

## Stakeholders
- Product: CO workflow operator and Linear issue owner.
- Engineering: provider-worker, run-memory, child-lane, eval, and Linear workflow maintainers.
- Review: parent lane, docs-review, and implementation-gate reviewers.

## Metrics & Guardrails
- Primary Success Metrics: eval fails when source-0/prompt-pack use is missing, when child-lane decision/lifecycle proof is incomplete, or when follow-up/link/workpad traceability is absent.
- Guardrails / Error Budgets: zero live Linear mutations in eval, zero unsanitized sensitive fixtures, zero parent-acceptance bypasses, zero metric-only child-lane passes, and deterministic local/CI output.

## User Experience
- Personas: parent provider worker, child-lane worker, reviewer, and operator auditing provider adoption.
- User Journeys: a provider receives sanitized source-0 and prompt-pack context, chooses a safe child-lane posture with machine-readable evidence, records a bounded child-lane lifecycle, and leaves traceable follow-up/workpad/link artifacts for parent acceptance.

## Technical Considerations
- Architectural Notes: eval fixtures should model source anchor metadata, prompt-pack references, child-lane decisions, launch/outcome artifacts, and workpad/link/follow-up records as structured data.
- Implementation Update: parent implementation added `scripts/provider-linear-adoption-eval.mjs`, the `npm run eval:provider-adoption` command, sanitized fixtures under `evaluation/fixtures/provider-linear-adoption/`, and focused regressions in `evaluation/tests/provider-linear-adoption.test.ts`.
- Dependencies / Integrations: the shipped eval uses local sanitized artifacts only and does not call live Linear APIs or alter provider-worker runtime behavior.

## Open Questions
- Resolved: the fixture and assertion path is owned by `scripts/provider-linear-adoption-eval.mjs` plus `evaluation/fixtures/provider-linear-adoption/`.
- Whether the parent wants a docs-review manifest before implementation or will attach this child-lane patch first is parent-owned.

## Approvals
- Product: self-approved from CO-176 handoff constraints.
- Engineering: pending parent review and docs-review.
- Design: not applicable.
