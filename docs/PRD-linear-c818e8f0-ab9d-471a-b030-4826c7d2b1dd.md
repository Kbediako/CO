# PRD - CO-560 prevent provider-worker review-handoff false retry after clean nested review evidence

## Traceability
- Linear issue: `CO-560` / `c818e8f0-ab9d-471a-b030-4826c7d2b1dd`
- Task registry id: `20260519-linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd`
- MCP Task ID: `linear-c818e8f0-ab9d-471a-b030-4826c7d2b1dd`
- Source anchor: `ctx:sha256:590ab51fb1f4bf827f3704ee1c7dfe50e3ddc370664e87c4fd92856e52a35118#chunk:c000001`
- Source: live Linear `issue-context` for `CO-560` read on 2026-05-19.

## Problem
CO-515 completed a provider-worker run and moved to `In Review`, but the parent provider-linear-worker stage later failed because the parent run directory lacked `review/telemetry.json`. The clean governed review evidence existed in a nested implementation-gate manifest, while the parent run emitted `provider_linear_worker_review_unknown` and made control-host rediscover the completed historical run as retryable work.

Local containment quarantined the parent manifest and released the stale claim, but the product behavior still needs to converge on the explicit governed review evidence the worker actually used.

## Goal
Prevent successful provider-worker review handoff from turning into failed/retry WIP solely because top-level review telemetry is absent when explicit clean governed nested or child review evidence is present and valid.

## Acceptance Criteria
- [ ] Add a focused regression for the CO-515 shape with successful provider proof, review handoff, clean nested implementation-gate evidence, and missing parent telemetry.
- [ ] Parent provider-linear-worker review resolution uses explicit governed worker/proof/audit/child evidence or records the exact required top-level telemetry path.
- [ ] Missing top-level telemetry does not become `provider_linear_worker_review_unknown` when explicit clean governed evidence exists elsewhere.
- [ ] Control-host rehydration does not queue continuation or failure retries for an already handed-off `In Review` issue solely from a completed historical provider run.
- [ ] `co-status --format json` reports zero active/retrying issues for the contained handoff shape after refresh/restart.
- [ ] Fail-closed review semantics remain intact when explicit clean review evidence is absent.

## Intent Checksum
Protected terms: `provider-linear-worker-proof.json`, `owner_status=succeeded`, `end_reason=issue_review_handoff`, `review/telemetry.json`, `implementation-gate`, `review_verdict`, `contract_validation`, `contract_overall_verdict`, `provider_linear_worker_review_unknown`, `provider-intake-state.json`, `co-status --format json`, `In Review`, `PR #836`, `CO-515`.

Reject fixes that treat missing telemetry as clean, accept empty findings without explicit clean semantics, weaken contract validation, rely on parent manifest quarantine, require manual provider-intake edits, delete local run artifacts, or broaden into generic review parser wording already owned by CO-478, CO-506, or CO-442.

## Non-Goals
- Do not treat missing top-level telemetry as clean without a concrete clean governed review signal.
- Do not weaken `review_verdict`, `contract_validation`, `contract_overall_verdict`, or fallback-expiry requirements.
- Do not solve the product bug with manual `provider-intake-state.json` edits, run deletion, or manifest quarantine.
- Do not broaden into generic review parser wording issues unless the same root cause is proven.

## Not Done If
- A successful `issue_review_handoff` with valid clean nested governed review evidence still ends as `provider_linear_worker_review_unknown`.
- The parent run accepts review handoff when all explicit clean review evidence is missing or semantically unknown.
- A completed historical provider run for an issue already in `In Review` still queues continuation or failure retry solely due to discoverability.
- `co-status --format json` reports the contained handoff shape as active, retrying, or failed current work.
- The fix depends on deleting or quarantining run artifacts instead of deterministic product logic.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta |
| --- | --- | --- | --- |
| Provider-worker review evidence | Parent run only checks top-level `review/telemetry.json`, while the worker can rely on nested implementation-gate review evidence. | Governed review evidence is authoritative only when explicit, current, task/run-bound, and contract-valid. | Parent review resolution can consume explicit promoted nested/child review evidence and otherwise records the exact missing required telemetry path. |
| Review fail-closed semantics | Missing parent telemetry becomes `provider_linear_worker_review_unknown`, even for successful review handoff with clean nested evidence. | Missing evidence stays unknown unless an explicit clean governed review signal exists. | Clean nested evidence prevents false failure; absent or unknown evidence still blocks. |
| Control-host rehydration | A completed historical provider run can be rediscovered and counted as retryable active WIP after issue handoff. | Issue lifecycle and terminal worker proof should prevent retrying review-handoff-complete work. | Completed `issue_review_handoff` plus live `In Review` and clean evidence projects as handed off, not active/retrying. |
| Status projection | `co-status --format json` can show retry pressure from the contained historical run shape. | Status should represent live actionable work, not false retries from successful historical handoff. | Contained fixture reports zero active/retrying issues while preserving audit evidence. |

## Issue Quality Review
The issue is a bounded product bug with concrete evidence, exact source issue, exact failure reason, explicit non-goals, and fail-closed negative controls. It is not a request to relax review parsing. The implementation should add a narrow evidence-resolution path plus rehydration/status coverage for already-handed-off issues.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove the top-level-only review telemetry authority when an explicit governed nested/child review evidence record is present and valid.
- Durable retention: retain top-level telemetry as the simplest authoritative path and retain fail-closed unknown handling when no explicit clean governed evidence exists.
- Large-refactor check: a large review-contract rewrite is not required; the issue names a single evidence convergence seam and existing semantic review-verdict gating remains authoritative.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker review handoff | Parent stage treats missing top-level telemetry as the only review authority even when the worker recorded explicit clean nested governed evidence. | `remove fallback` | CO-560 | Successful `issue_review_handoff` with clean nested implementation-gate evidence and absent parent telemetry. | Existing pre-CO-560 behavior | 2026-05-19 | This issue | Parent resolves review verdict from explicit governed evidence or records the expected missing path. | Focused CO-515-shaped regression plus negative no-clean-evidence regression. |
| Review fail-closed contract | Missing or unknown review evidence blocks handoff. | `justify retaining fallback` | Owning surface: provider-worker review contract. | No explicit clean governed review evidence exists. | Existing review-verdict contract | 2026-05-19 | Non-expiring supported safety contract. | Replace only with an equivalent stricter governed review contract. | Negative regressions for absent evidence and unknown verdict. |

Durable retention evidence:
- Contract name: provider-worker fail-closed governed review evidence.
- Owning surface: `commandRunner.ts` review contract handling and provider-worker proof/status projection.
- Steady-state proof: missing or unknown review evidence remains a blocker; clean handoff needs explicit clean governed evidence.
- Tests/docs: CO-560 focused positive and negative regressions plus this packet.
- Non-expiring rationale: this is the safety contract that prevents unreviewed handoffs, not temporary compatibility debt.

## Open Questions
- None blocking. Exact implementation seams will be confirmed from current source before code changes.

## Approvals
- Product: self-approved from CO-560 issue text on 2026-05-19.
- Engineering: parent provider worker issue-quality review on 2026-05-19.
- Design: not applicable.
