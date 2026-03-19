---
id: 20260306-1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context
title: Coordinator Symphony-Aligned Selected-Run Projection + Advisory Context
relates_to: docs/PRD-coordinator-symphony-aligned-selected-run-projection-and-advisory-context.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: centralize selected-run projection so CO control APIs, compatibility data, and Telegram all read from the same authoritative run/advisory context.
- Scope: one shared selected-run context builder plus the smallest control/Telegram integration changes needed to adopt it.
- Constraints: keep CO execution authority unchanged, keep Linear advisory-only, and avoid new inbound surface or inventory scope in this slice.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and projection-first implementation under a new follow-up lane after `1014`.
- Reasoning: the provider adapters already exist; the current risk is read-surface drift, not missing transport plumbing.
- Initial review evidence: `docs/findings/1015-selected-run-projection-deliberation.md`.
- Delegated review refinement: use one request-scoped selected-run context keyed by `issueIdentifier` with `taskId`/`runId` fallback, keep it server-side and bounded, carry over Symphony's stable-identity and concise status/event shaping, and avoid any shared mutable cache or UI-local selection state. Evidence: `docs/findings/1015-selected-run-projection-deliberation.md`, `.runs/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context-scout/cli/2026-03-06T05-36-09-835Z-294c48ca/manifest.json`, delegated Symphony review summary captured in the top-level orchestration log.

## Technical Requirements
- Functional requirements:
  - Introduce a shared selected-run context builder in the control surface.
  - Route `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and Telegram `/status` / `/issue` through that builder.
  - Preserve stable selected-run identity and status framing for `in_progress`, `paused`, `awaiting_input`, `succeeded`, `failed`, and idle-ready states.
  - Attach bounded recent context, dispatch summary, question metadata, and tracked Linear advisory metadata when available.
  - Keep live Linear resolution request-scoped, bounded, and fail closed.
- Non-functional requirements:
  - no repo-stored secrets,
  - no new authority or mutation semantics,
  - bounded provider latency,
  - deterministic projection behavior across surfaces for the same run snapshot.
- Interfaces / contracts:
  - existing `/control/action`, `/api/v1/state`, `/api/v1/dispatch`, `/api/v1/<issue>`, `/questions`, and Telegram command surfaces remain authoritative,
  - public payload compatibility should be preserved unless a bounded additive field is clearly justified,
  - the shared builder should expose a normalized context contract rather than hard-coded surface formatting.

## Architecture & Data
- Architecture / design adjustments:
  - add a shared selected-run context builder under `orchestrator/src/cli/control/`,
  - shift duplicated status/advisory shaping out of individual state/issue/Telegram pathways,
  - keep live Linear resolution coordinated through the shared builder or its request-scoped dependencies.
- Data model changes / migrations:
  - no persistent schema migration expected,
  - additive normalized selected-run context object in runtime code only.
- External dependencies / integrations:
  - existing Telegram bot/runtime config,
  - Linear GraphQL API using the real workspace/team/project binding and token from env,
  - Symphony checkout as read-only behavior reference.

## Validation Plan
- Tests / checks:
  - targeted control-server and Telegram tests for projection coherence and lifecycle statuses,
  - targeted live Linear request-scoped advisory tests,
  - manual simulated/mock usage coverage across state/issue/UI/Telegram,
  - full repo validation gate chain for the owned diff.
- Rollout verification:
  - docs-review before implementation,
  - delegated read-only review approval captured in spec/checklist notes,
  - live Linear provider verification against the real binding.
- Monitoring / alerts:
  - fail-closed provider behavior remains visible in logs and manual evidence,
  - closeout summary under `out/1015.../manual/`.

## Open Questions
- Whether `/questions` should fully render from the shared context now or continue as a sibling surface that only consumes shared metadata. Decision for 1015: keep `/questions` as a sibling surface and expose only queued-question metadata through the shared selected-run context.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
