# PRD - CO-353 Codex CLI 0.125.0 Reasoning-Token Telemetry

## Traceability
- Linear issue: `CO-353` / `c526b756-6cfb-4e5b-b5ec-e7132f253ba1`
- MCP task id: `linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1`
- Canonical spec: `tasks/specs/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- Task checklist: `tasks/tasks-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- Source anchor: `ctx:sha256:4a1b90d4079209b44b35ed390dfc9ddc4b647dbdb70c4633a2907d47cd8aabc3#chunk:c000001`
- Source payload declared by parent: `.runs/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1-docs-packet/cli/2026-04-25T07-37-29-958Z-656ef03f/memory/source-0/source.txt`
- Source payload note: the declared `.runs` path was not present in this child lane workspace at authoring time. This packet is anchored on the parent-provided issue scope, source anchor, and protected terms; the parent lane owns source-payload reconciliation.

## Active Lane Checklist Mirror
- [x] Canonical task checklist and `.agent/task` mirror track CO-353 subtasks with proof links. Evidence: `tasks/tasks-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md` and `.agent/task/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`.
- [x] `provider-linear-worker-proof.json` token parsing preserves `reasoning_output_tokens` and older missing-field behavior. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts` and `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Manifest telemetry persists provider reasoning tokens. Evidence: `schemas/manifest.json`, `packages/shared/manifest/types.ts`, `orchestrator/src/cli/services/commandRunner.ts`, and `orchestrator/tests/CommandRunnerEnvPropagation.test.ts`.
- [x] `ControlTokenUsagePayload` and `codexTotals` expose reasoning-token usage. Evidence: `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, and `orchestrator/tests/ControlRuntime.test.ts`.
- [x] `CO STATUS` and the operator dashboard render reasoning-token usage or explicit unavailable state. Evidence: `orchestrator/src/cli/control/controlStatusDashboard.ts`, `packages/orchestrator-status-ui/app.js`, `orchestrator/tests/ControlStatusDashboard.test.ts`, and `orchestrator/tests/SelectedRunPresenter.test.ts`.
- [x] Review and validation proof is recorded before handoff. Evidence: standalone review telemetry `.runs/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1/cli/2026-04-25T07-32-47-648Z-9b84420c/review/telemetry.json` and validation entries in `tasks/tasks-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`.

## Summary
- Problem Statement: CO currently carries provider-worker token telemetry through provider proof and control surfaces as input, output, and total tokens. Codex CLI 0.125.0 exposes a more specific completed-turn field, `turn.completed.usage.reasoning_output_tokens`, but CO does not yet preserve that reasoning-token usage as first-class telemetry. Operators therefore cannot audit reasoning-token usage consistently across provider proof, manifests, control/read-model metrics, and status/dashboard output.
- Desired Outcome: parent implementation adds an additive, backward-compatible reasoning-token telemetry path from Codex CLI 0.125.0 completed-turn usage through provider proof, manifests, control/read-model metrics, and status/dashboard output, while preserving existing input/output/total token semantics and explicit `null` or `n/a` behavior when the field is absent.

## User Request Translation
- User intent / needs: create the docs-first packet for CO-353 before implementation. The issue is about preserving `turn.completed.usage.reasoning_output_tokens` as reasoning-token usage telemetry in CO-owned proof and operator surfaces, not about changing model posture, token budgets, pricing, runtime selection, or dashboard design beyond the minimum output needed to see the new field.
- Success criteria / acceptance:
  - CO parses Codex CLI 0.125.0 `turn.completed.usage.reasoning_output_tokens` from the completed-turn usage payload when present.
  - provider proof records reasoning-token usage additively alongside existing input/output/total token fields.
  - manifests and run-summary or provider-run artifacts preserve the same reasoning-token usage without requiring narrative logs.
  - control/read-model metrics aggregate and expose reasoning-token usage separately from input/output/total token totals.
  - status/dashboard output renders reasoning-token usage or explicit unavailable state without hiding existing token, rate-limit, session, or throughput signals.
  - older proof artifacts and older Codex event shapes remain readable with `reasoning_output_tokens: null` or equivalent absent-field semantics.
- Constraints / non-goals:
  - this child lane authors docs only
  - no implementation, test, generated artifact, Linear, workpad, PR, or full validation changes here
  - no token-budget enforcement, billing estimate, model-selection change, rate-limit policy change, or Codex CLI adoption change
  - no inference of reasoning-token usage from total/output token deltas when `turn.completed.usage.reasoning_output_tokens` is absent

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `Codex CLI 0.125.0`
  - `turn.completed.usage.reasoning_output_tokens`
  - `reasoning-token usage`
  - `provider proof`
  - `manifests`
  - `control/read-model metrics`
  - `status/dashboard output`
- Protected terms / exact artifact and surface names:
  - `CO-353`
  - `linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1`
  - `ProviderLinearWorkerTokenUsage`
  - `provider-linear-worker-proof.json`
  - `ControlTokenUsagePayload`
  - `codexTotals`
  - `CO STATUS`
  - `operator dashboard`
  - `turn.completed`
  - `usage.reasoning_output_tokens`
- Nearby wrong interpretations to reject:
  - treating reasoning-token usage as a model-posture or Codex CLI version-promotion issue
  - folding reasoning-token usage into output tokens without a separate field
  - deriving reasoning-token usage from total minus input/output when the upstream field is missing
  - showing reasoning-token usage only in prose logs while omitting provider proof, manifests, control/read-model metrics, or status/dashboard output
  - changing rate-limit, pricing, budget, or prompt policy based on the new metric in this issue
  - redesigning the status dashboard instead of adding a bounded telemetry field

## Parity / Alignment Matrix

| Telemetry surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out of scope |
| --- | --- | --- | --- | --- |
| Codex event source | Existing parsing handles completed-turn `usage` for input, output, and total tokens. | Codex CLI 0.125.0 can emit `turn.completed.usage.reasoning_output_tokens`. | Parse `turn.completed.usage.reasoning_output_tokens` when present and keep `null` when absent. | Inferring reasoning tokens from other totals. |
| Provider proof | `provider-linear-worker-proof.json` carries token usage as input/output/total only. | Provider proof is the reviewable audit source for provider-worker telemetry. | Add reasoning-token usage to provider proof as an additive field under the existing token-usage envelope. | Renaming or replacing existing token fields. |
| Manifests | Manifests and run summaries preserve provider truth but do not expose reasoning-token usage. | Parent implementation needs machine-readable artifacts, not narrative-only logs. | Carry reasoning-token usage through manifests or provider-run summaries wherever token telemetry is already persisted. | Broad manifest schema redesign unrelated to telemetry. |
| control/read-model metrics | `ControlTokenUsagePayload` and `codexTotals` aggregate input/output/total tokens. | Operator read models should reflect provider proof token telemetry. | Add separate reasoning-token usage aggregation with absent-field semantics. | Changing rate-limit or throughput algorithms except where display labels need the new field. |
| status/dashboard output | `CO STATUS` and operator dashboard render token counts as input/output/total plus existing session/rate-limit context. | Operators need to see reasoning-token usage in the same status/dashboard output they use for active workers. | Render reasoning-token usage compactly and explicitly show unavailable state when not present. | A broad UI redesign or new dashboard backend. |
| Backward compatibility | Older Codex events and proofs omit the reasoning field. | Existing proofs must remain readable. | Missing reasoning-token usage is treated as `null`/`n/a`; no legacy proof fails because the field is absent. | Backfilling historical reasoning-token values without source evidence. |

## Not Done If
- `turn.completed.usage.reasoning_output_tokens` is not parsed from Codex CLI 0.125.0 completed-turn usage payloads.
- reasoning-token usage is missing from provider proof.
- reasoning-token usage is visible only in logs and not in manifests, control/read-model metrics, or status/dashboard output.
- existing input/output/total token semantics regress or are renamed.
- missing upstream reasoning-token usage is inferred instead of represented as unavailable.
- older provider proof artifacts fail to load because the new field is absent.
- the issue widens into model posture, runtime adoption, rate-limit policy, pricing, or budget enforcement.

## Goals
- Preserve Codex CLI 0.125.0 reasoning-token usage as first-class provider-worker telemetry.
- Keep the change additive across provider proof, manifests, control/read-model metrics, and status/dashboard output.
- Maintain backward-compatible null semantics for older events and proof artifacts.
- Give operators a direct status/dashboard signal for reasoning-token usage without changing existing token totals.

## Non-Goals
- No implementation or test edits in this docs-packet child lane.
- No change to Codex CLI version policy or model defaults.
- No runtime-mode, app-server, provider-supervision, or cloud adoption change.
- No budget enforcement, billing estimate, cost policy, or rate-limit behavior change.
- No historical backfill without source `turn.completed.usage.reasoning_output_tokens` evidence.
- No broad status/dashboard redesign.

## Stakeholders
- Product: CO operators and maintainers who need truthful token telemetry while supervising provider workers.
- Engineering: provider-worker telemetry, manifests, control read-model, and status/dashboard maintainers.
- Design: not applicable beyond preserving compact status/dashboard readability.

## Metrics & Guardrails
- Primary Success Metrics:
  - reasoning-token usage appears in provider proof when Codex CLI 0.125.0 emits it
  - reasoning-token usage is carried through manifests and control/read-model metrics
  - status/dashboard output shows reasoning-token usage or explicit unavailable state
  - focused regressions cover present, absent, and backward-compatible proof cases
- Guardrails / Error Budgets:
  - zero inferred reasoning-token values
  - zero regression to existing input/output/total token fields
  - zero failure loading older provider proof artifacts
  - zero broad model/runtime/rate-limit policy changes in this issue

## User Experience
- Personas:
  - operator watching active provider workers through `CO STATUS`
  - reviewer auditing provider proof and manifests after a worker run
  - maintainer comparing token telemetry across control/read-model metrics and dashboard output
- User Journeys:
  - an active Codex CLI 0.125.0 worker emits `turn.completed.usage.reasoning_output_tokens`; the operator sees reasoning-token usage in status/dashboard output
  - a reviewer opens provider proof and manifests and finds the same reasoning-token usage value without reading raw JSONL manually
  - an older worker omits the field; the dashboard and proof clearly show unavailable reasoning-token usage rather than an inferred number

## Technical Considerations
- Architectural Notes:
  - the implementation should extend existing token-usage normalization rather than create a separate telemetry source
  - reasoning-token usage must stay separate from output tokens even if upstream totals already include it
  - status/dashboard output should keep existing `Tokens` readability and avoid displacing rate-limit, session, or throughput context
- Dependencies / Integrations:
  - Codex CLI 0.125.0 completed-turn usage events
  - provider proof persistence
  - manifest/run-summary persistence
  - control/read-model metrics aggregation
  - `CO STATUS` and operator dashboard presenters

## Open Questions
- Should the status/dashboard label be `reasoning`, `reasoning out`, or another compact label that fits current terminal width constraints?
- Should parent implementation persist only the latest reasoning-token usage floor or also expose per-turn deltas when event data supports it?

## Approvals
- Product: CO-353 issue scope provided by parent lane.
- Engineering: docs child lane self-reviewed for protected terms, non-goals, Not Done If, and telemetry parity matrix; parent owns docs-review and implementation approval.
- Design: not applicable.
