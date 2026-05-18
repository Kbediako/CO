---
id: 20260425-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1
title: CO-353 Codex CLI 0.125.0 Reasoning-Token Telemetry
status: done
relates_to: docs/PRD-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
related_action_plan: docs/ACTION_PLAN-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md
task_checklists:
  - tasks/tasks-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (34 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- PRD: `docs/PRD-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- Task checklist: `tasks/tasks-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- Source anchor: `ctx:sha256:4a1b90d4079209b44b35ed390dfc9ddc4b647dbdb70c4633a2907d47cd8aabc3#chunk:c000001`
- Source payload declared by parent: `.runs/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1-docs-packet/cli/2026-04-25T07-37-29-958Z-656ef03f/memory/source-0/source.txt`
- Source payload note: the declared `.runs` path was not present in this child lane workspace at authoring time; parent owns source-payload reconciliation.

## Summary
- Objective: define the docs-first implementation contract for carrying Codex CLI 0.125.0 `turn.completed.usage.reasoning_output_tokens` into CO reasoning-token usage telemetry.
- Scope:
  - parse completed-turn `usage.reasoning_output_tokens`
  - persist reasoning-token usage in provider proof
  - propagate reasoning-token usage through manifests
  - expose reasoning-token usage in control/read-model metrics
  - render reasoning-token usage in status/dashboard output
  - preserve older event/proof compatibility with explicit unavailable semantics
- Constraints:
  - docs-packet child lane only
  - no Linear mutation, implementation, tests, generated artifacts, PR lifecycle, or full validation from this lane
  - no model posture, runtime selection, budget, pricing, or rate-limit policy changes

## Issue-Shaping Contract
- User-request translation carried forward: CO-353 should make Codex CLI 0.125.0 reasoning-token usage visible and auditable across provider proof, manifests, control/read-model metrics, and status/dashboard output before parent implementation starts.
- Protected terms / exact artifact and surface names:
  - `CO-353`
  - `Codex CLI 0.125.0`
  - `turn.completed.usage.reasoning_output_tokens`
  - `usage.reasoning_output_tokens`
  - `reasoning-token usage`
  - `provider proof`
  - `provider-linear-worker-proof.json`
  - `manifests`
  - `control/read-model metrics`
  - `status/dashboard output`
  - `ProviderLinearWorkerTokenUsage`
  - `ControlTokenUsagePayload`
  - `codexTotals`
  - `CO STATUS`
  - `operator dashboard`
- Nearby wrong interpretations to reject:
  - promoting or holding Codex CLI 0.125.0 based on this telemetry issue
  - folding reasoning-token usage into existing output tokens without a separate field
  - inferring reasoning-token usage from total/output deltas
  - only logging reasoning-token usage while omitting provider proof, manifests, control/read-model metrics, or status/dashboard output
  - changing rate limits, usage budgets, pricing, model selection, or runtime mode
  - redesigning the dashboard instead of adding bounded telemetry
- Explicit non-goals carried forward:
  - no implementation or tests in this child lane
  - no Codex CLI adoption or model posture change
  - no budget, billing, rate-limit, or prompt-policy behavior
  - no historical backfill without source event evidence
  - no breaking change to older proofs

## Parity / Alignment Matrix

| Telemetry surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out of scope |
| --- | --- | --- | --- | --- |
| Event parsing | Completed-turn usage can normalize input/output/total token fields. | Codex CLI 0.125.0 emits `turn.completed.usage.reasoning_output_tokens`. | Normalize `reasoning_output_tokens` as a separate nullable token field. | Synthetic inference when the upstream field is missing. |
| Provider proof | Provider proof token usage has input/output/total fields. | Provider proof is the operator/reviewer audit source for provider-worker telemetry. | Persist reasoning-token usage in provider proof alongside existing token fields. | Replacing or renaming existing token fields. |
| Manifests | Manifests point at provider-run truth but do not carry reasoning-token usage consistently. | Parent implementation needs machine-readable evidence in manifests, not prose-only summaries. | Include reasoning-token usage wherever token telemetry is persisted or summarized. | Broad manifest restructuring. |
| control/read-model metrics | Control payloads and totals aggregate input/output/total tokens. | Read models should mirror proof telemetry. | Add reasoning-token usage to control/read-model metrics with nullable absent-field semantics. | Rate-limit or throughput policy changes unrelated to showing the field. |
| status/dashboard output | Status/dashboard output shows input/output/total token counts. | Operators need reasoning-token usage in the same active-worker output. | Render reasoning-token usage compactly and preserve existing token/session/rate-limit context. | Full dashboard redesign. |
| Backward compatibility | Older events/proofs omit reasoning-token usage. | Existing artifacts remain authoritative even when older. | Missing reasoning-token usage stays `null`/`n/a`; older artifacts continue loading. | Backfilling historical values without source evidence. |

## Readiness Gate
- Not done if:
  - `turn.completed.usage.reasoning_output_tokens` is not parsed when present
  - provider proof omits reasoning-token usage
  - manifests omit reasoning-token usage where token telemetry is otherwise persisted or summarized
  - control/read-model metrics omit reasoning-token usage
  - status/dashboard output omits reasoning-token usage or an explicit unavailable state
  - the implementation infers reasoning-token usage from other token totals
  - older provider proof artifacts fail to load without the new field
  - the issue widens into model posture, runtime adoption, budget enforcement, pricing, or rate-limit policy
- Pre-implementation issue-quality review evidence:
  - 2026-04-25: this packet preserves the required protected terms, rejects nearby wrong interpretations, and defines current/reference/target parity for the telemetry surface.
  - 2026-04-25: micro-task path is unavailable because correctness depends on exact field names, exact proof and status surfaces, and backward-compatible telemetry semantics.
- Safeguard ownership split:
  - child lane owns only the docs-first packet files and scoped registry/freshness entries
  - parent lane owns source-payload reconciliation, docs-review, implementation, focused tests, validation floor, Linear state, workpad, PR lifecycle, and final closeout

## Technical Requirements
- Functional requirements:
  1. Extend token-usage parsing to read `turn.completed.usage.reasoning_output_tokens` and equivalent normalized `usage.reasoning_output_tokens` completed-turn payloads when present.
  2. Extend provider proof token usage additively with `reasoning_output_tokens: number | null`.
  3. Preserve reasoning-token usage in manifests and provider-run summaries wherever token telemetry is already persisted or summarized.
  4. Extend control/read-model metrics so `ControlTokenUsagePayload` and aggregate `codexTotals` expose reasoning-token usage separately.
  5. Extend status/dashboard output so `CO STATUS` and operator dashboard views show reasoning-token usage or an explicit unavailable state.
  6. Preserve input/output/total token semantics exactly.
  7. Preserve backward compatibility for older events, older proofs, and missing reasoning-token fields.
- Non-functional requirements:
  - additive schema change only
  - deterministic null handling for missing upstream data
  - no broad dashboard redesign
  - no policy behavior based on the new metric in this lane
  - focused regression coverage for present, absent, and legacy proof cases
- Interfaces / contracts:
  - upstream event path: `turn.completed.usage.reasoning_output_tokens`
  - normalized token field: `reasoning_output_tokens`
  - provider proof token envelope remains the authority for provider-worker token telemetry
  - control/read-model metrics must preserve nullable semantics through JSON output
  - status/dashboard output must not hide existing token totals, session state, rate limits, or throughput context

## Architecture & Data
- Architecture / design adjustments:
  - extend existing token-usage normalization and projection paths instead of adding a separate telemetry source
  - keep reasoning-token usage separate from output tokens and total tokens
  - aggregate reasoning-token usage only from authoritative proof/read-model fields, not from display text
- Data model changes / migrations:
  - add nullable `reasoning_output_tokens` to provider token usage payloads
  - add nullable `reasoning_output_tokens` to control token usage payloads
  - any manifest or summary addition must be additive and optional for older artifacts
  - no persistent database migration expected
- External dependencies / integrations:
  - Codex CLI 0.125.0 completed-turn usage payloads
  - existing provider proof/session-log hydration
  - existing manifest/run-summary persistence
  - existing control/read-model metrics and status/dashboard presenters

## Validation Plan
- Child-lane scoped checks:
  - protected-term scan over the touched docs packet files
  - `tasks/index.json` JSON parse check
  - `docs/docs-freshness-registry.json` JSON parse check
  - scoped `git diff --check --` over the declared touched files
- Parent-owned implementation checks:
  - docs-review before implementation
  - focused parser test for `turn.completed.usage.reasoning_output_tokens`
  - focused provider proof serialization/hydration tests for present, absent, and legacy proof cases
  - focused manifest or run-summary assertion for reasoning-token usage propagation
  - focused control/read-model aggregation test
  - focused status/dashboard output test that proves reasoning-token usage is visible without regressing input/output/total display
  - normal parent validation floor after implementation
- Rollout verification:
  - inspect provider proof, manifests, control/read-model JSON, and status/dashboard output from a Codex CLI 0.125.0 sample that includes reasoning-token usage
  - inspect an older sample with no field and confirm explicit unavailable semantics
- Monitoring / alerts:
  - no new alerting required; this is telemetry visibility, not policy enforcement

## Open Questions
- What compact label should status/dashboard output use for reasoning-token usage while preserving terminal width?
- Should the parent implementation expose only aggregate reasoning-token usage or also the latest per-turn reasoning-token usage when the event stream contains both?

## Approvals
- Reviewer: parent CO-353 docs-review / implementation gate, pending
- Date: 2026-04-25
