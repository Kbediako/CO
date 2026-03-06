# PRD - Coordinator Control Bridge Slice 1 (0993)

## Summary
- Problem Statement: The Coordinator planning set defines a control bridge concept, but CO does not yet have an implementation-scoped docs package for the first narrow slice: forwarding pause/resume/cancel/status actions with strict auth boundaries, idempotency, and auditable traceability.
- Desired Outcome: complete docs-first artifacts for a Coordinator-only control-bridge slice that preserves CO as execution authority and codifies intent-to-run traceability (`intent_id -> task_id -> run_id -> manifest_path`) for every control action.
- Scope Status: docs-only stream; no orchestrator code edits in this slice.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): prepare implementation-ready docs for a narrow Coordinator intake/control bridge that can safely forward control actions into CO without transferring scheduler or execution authority.
- Success criteria / acceptance:
  - PRD + TECH_SPEC + ACTION_PLAN + checklist mirrors are created and internally consistent.
  - The slice covers pause/resume/cancel/status forwarding only.
  - Auth/token boundary for control actions is explicit and fail-closed.
  - Idempotency semantics for duplicate control intents are explicit.
  - Traceability mapping and required audit outputs are explicit.
  - `tasks/index.json` and `docs/TASKS.md` are updated for task registration.
- Constraints / non-goals:
  - CO remains execution authority.
  - No scheduler ownership transfer to Coordinator.
  - No language rewrite.
  - No unrelated refactors.
  - No code edits in `orchestrator/src` during this stream.

## Coordinator Planning Realignment (Required)
### What still applies from `/Users/kbediako/Documents/Plans/CO/coordinator/*.md`
- Coordinator naming and ownership split remain valid: Coordinator handles intake/routing/control bridge while CO owns run lifecycle truth and scheduler authority.
- Bridge v0 contract still applies for narrow control surfaces (`pause`, `resume`, `cancel`, `status`) and canonical mapping via `manifest_path`.
- Intent schema principles still apply: mandatory `intent_id`, dedupe/idempotency behavior, auditable state transitions.
- Lightweight charter constraints still apply: thin Coordinator core loop, no duplicate execution truth store, no duplicate control-plane auth model.
- Sidecar-first and incremental delivery still apply; this slice is phase-aligned with "Contract Spec" then "Control Integration."

### What changed in CO since those docs (2026-02-24 / 2026-02-25)
- Runtime defaults/policy changed: local default runtime is now `runtimeMode=appserver`, with `--runtime-mode cli` retained as break-glass.
- Mode semantics are now explicit policy: `executionMode` and `runtimeMode` are orthogonal controls, and `executionMode=cloud` with explicit `runtimeMode=appserver` is unsupported/fail-fast.
- Feature policy changed: `js_repl` is enabled by default globally (local and cloud lanes), with task-scoped enable/disable lanes used for deterministic cloud contracts.
- Delegation/process policy tightened: top-level task streams require manifest-backed delegation evidence by default, with explicit override rationale when unavailable.
- These policy updates post-date the coordinator planning drafts and must be reflected before implementation work starts.

### What must be updated before coding
- Update bridge contract language to align with current runtime policy wording (appserver default, CLI break-glass) without changing the Coordinator-only control scope.
- Define the control auth token boundary precisely (issuer, audience, scope, expiry, rotation expectations, and failure semantics) while keeping CO as the enforcement point.
- Define per-action idempotency keys and dedupe windows for pause/resume/cancel/status intents, including duplicate/no-op response semantics.
- Define manifest/event/status output fields required for auditability of control actions and trace chain reconstruction.
- Define explicit rejection paths for forbidden actions (missing auth, scheduler-transfer attempts, unknown run target).

## Goals
- Ship implementation-ready docs for control bridge slice 1 only:
  - Coordinator intake and forwarding for `pause`, `resume`, `cancel`, `status`.
  - strict auth/token boundary for control actions.
  - idempotent handling of duplicate intents/requests.
  - deterministic traceability mapping from intent to manifest evidence.
- Keep scope minimal and aligned with current CO guardrail/policy posture.

## Non-Goals
- Any scheduler logic transfer or dual-scheduler operation.
- New execution runtime or language migration work.
- Broad coordinator capability rollout beyond control bridge slice 1.
- Code implementation in this stream.

## Metrics & Guardrails
- Primary success metrics:
  - Docs package is complete and consistent across PRD/TECH_SPEC/ACTION_PLAN/checklists.
  - The realignment section captures still-applies/changed/update-before-coding deltas.
  - Task/spec registration entries exist in `tasks/index.json` and `docs/TASKS.md`.
- Guardrails:
  - Coordinator remains intake/control bridge only.
  - CO remains execution and scheduler authority.
  - All control outcomes must be auditable from manifests/events/status outputs.

## Approvals
- Product: requested by user on 2026-03-03.
- Engineering: docs-first slice defined; implementation pending.
- Design: n/a.
