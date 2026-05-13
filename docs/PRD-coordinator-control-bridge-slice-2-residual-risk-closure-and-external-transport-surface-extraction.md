# PRD - Coordinator Control Bridge Slice 2 + Residual Risk Closure + External Transport-Surface Extraction (0994)

## Summary
- Problem Statement: 0993 delivered Coordinator control bridge slice 1 implementation, but residual risk items remain around external interactive transport surfaces, codex-autorunner boundary extraction, and review-cadence enforcement for delegated implementation streams.
- Desired Outcome: lock implementation-ready docs for slice 2 that close residual risks, define an explicit codex-autorunner extraction lane, and establish objective decision criteria for Discord/Telegram interactive surfaces.
- Scope Status: docs-only stream for task 0994; no edits to `orchestrator/src`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): continue the 0993 lineage with a docs-first slice that closes unresolved risks and narrows extraction/transport decisions before any new implementation starts.
- Success criteria / acceptance:
  - PRD + TECH_SPEC + ACTION_PLAN + canonical spec + checklist mirrors are created and internally consistent.
  - `tasks/index.json` and `docs/TASKS.md` are updated for 0994 registration.
  - docs-review evidence is captured for 0994.
  - one standalone review checkpoint is captured for this docs stream.
  - checklist notes include a short elegance/minimality pass summary.
- Constraints / non-goals:
  - Do not edit `orchestrator/src` in this stream.
  - Keep scope to docs/task mirrors + registration + review evidence.
  - Ignore unrelated edits from other streams.

## Lineage Continuation (0993 -> 0994)
- 0993 baseline remains authoritative for Coordinator control forwarding (`pause/resume/cancel/status`), auth-boundary enforcement, idempotency semantics, and traceability/audit contract fields.
- 0994 scope is follow-up only: close residual-risk gaps, define extraction boundaries for codex-autorunner, and decide whether/when external interactive transport surfaces should be enabled.
- 0994 must not duplicate 0993 scaffolding; it extends and constrains the next implementation slice.

## Residual Risk Closure Objectives
- Close ambiguity on which control capabilities remain in-core CO vs extracted to codex-autorunner adapters.
- Close ambiguity on external operator interaction surfaces (Discord/Telegram) with explicit go/no-go criteria.
- Close ambiguity on delegated-stream quality discipline by requiring recurring standalone + elegance review checkpoints.
- Close auditability risk by preserving deterministic intent-to-run trace links regardless of transport surface.

## Codex-Autorunner Extraction Lane
- Define an extraction lane limited to transport-facing adapter concerns (ingress normalization, transport auth wrapper, outbound status projection).
- Keep execution authority, scheduler ownership, and control-state truth in CO core.
- Require adapter contracts to preserve existing `intent_id -> task_id -> run_id -> manifest_path` trace linkage.
- Require fail-closed behavior on adapter-auth failure, malformed payloads, replayed intents outside dedupe policy, or unsupported control actions.

## Discord/Telegram Interactive-Surface Decision Criteria
- Security boundary:
  - token/session model supports scoped least privilege, expiry, replay protection, and revocation.
- Operational reliability:
  - transport API/webhook failure modes are observable and do not silently drop control intents.
- User interaction model:
  - commands can map deterministically to supported control actions without ambiguity.
- Auditability:
  - all external interactions map to canonical run trace fields and manifest evidence.
- Blast radius:
  - feature-flagged rollout with kill-switch and clear rollback to CO-only control paths.
- Decision policy:
  - enable transport surface only when all criteria pass; otherwise hold and keep transport as explicitly unsupported.

## Decision Artifact (Implementation Stream 0994)
- Findings artifact: `docs/findings/0994-codex-autorunner-extraction-and-transport-go-hold.md`.
- Recorded decisions:
  - codex-autorunner extraction lane: `GO (bounded)`.
  - Discord interactive surface: `HOLD`.
  - Telegram interactive surface: `HOLD`.
- Residual-risk closure evidence for 0993 follow-up is captured in the same artifact and linked to config/test updates.

## Mandatory Standalone/Elegance Review Cadence for Delegated Implementation Streams
- Every delegated implementation stream must run standalone review at:
  - stream kickoff after spec/task read-through,
  - each meaningful coding checkpoint,
  - pre-handoff/finalization.
- Every delegated implementation stream must run an elegance/minimality pass:
  - after resolving standalone review findings for a non-trivial diff,
  - before requesting merge/handoff.
- Streams must record evidence paths in checklist mirrors and leave unresolved P0/P1 high-signal findings as hard-stop.

## Goals
- Produce implementation-ready docs for slice 2 follow-up scope only.
- Freeze residual-risk closure objectives and transport-surface decision criteria.
- Freeze codex-autorunner extraction boundary and invariants.
- Encode mandatory delegated implementation review cadence in task artifacts.

## Non-Goals
- Implementing adapter/runtime code in this stream.
- Changing scheduler authority boundaries.
- Shipping Discord/Telegram integration in this stream.
- Expanding beyond 0994 follow-up scope.

## Metrics & Guardrails
- Primary success metrics:
  - all 0994 docs/mirrors exist and are synchronized.
  - explicit sections exist for residual-risk closure, codex-autorunner extraction lane, transport decision criteria, and review cadence.
  - docs-review + standalone review evidence is captured and linked.
- Guardrails:
  - CO remains execution authority.
  - external transport surfaces remain gated by explicit criteria.
  - delegated implementation streams follow mandatory review cadence.

## Approvals
- Product: requested by user on 2026-03-03.
- Engineering: docs-first follow-up scope approved for 0994.
- Design: n/a.
