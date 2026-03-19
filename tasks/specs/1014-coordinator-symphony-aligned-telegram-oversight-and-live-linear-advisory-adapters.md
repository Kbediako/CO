---
id: 20260306-1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters
title: Coordinator Symphony-Aligned Telegram Oversight + Live Linear Advisory Adapters
relates_to: docs/PRD-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: implement the first real Telegram and Linear provider adapters on top of CO's existing control core.
- Scope: one active-run Telegram polling bridge plus one advisory-only live Linear resolver.
- Constraints: preserve CO execution authority, keep Linear non-authoritative, and avoid public webhook dependency in this slice.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and runtime implementation under a new adapter-only lane.
- Reasoning: the closed coordinator tasks already delivered the control core and policy boundaries; the remaining gap is real provider adapter/runtime work only.

## Technical Requirements
- Functional requirements:
  - Telegram polling bridge with allowed-chat filtering and selected-item status projection.
  - Telegram read-only commands: `/start`, `/help`, `/status`, `/issue`, `/dispatch`, `/questions`.
  - Telegram bounded controls: `/pause` and `/resume`.
  - Live Linear advisory resolution from configured workspace/team/project and real API token.
  - `ControlServer`-owned async compatibility projections that expose tracked live Linear metadata plus a bounded recent-activity slice.
- Non-functional requirements:
  - fail-closed auth/config handling,
  - no repo-stored secrets,
  - deterministic idempotency and traceability for Telegram mutations,
  - bounded polling and provider request behavior appropriate for one active run, including fail-closed Linear request timeout behavior.
- Interfaces / contracts:
  - existing `/control/action`, `/api/v1/state`, `/api/v1/dispatch`, `/api/v1/<issue>`, and `/questions` surfaces remain authoritative,
  - dispatch pilot output remains advisory-only,
  - Telegram adapter uses env-scoped configuration and run-scoped offset persistence.

## Architecture & Data
- Architecture / design adjustments:
  - add a Telegram polling adapter under `orchestrator/src/cli/control/`,
  - extend the dispatch pilot with an async live Linear provider path invoked from `ControlServer`,
  - thread live advisory results into compatibility issue projections.
- Data model changes / migrations:
  - add run-scoped Telegram bridge state for update offsets,
  - extend compatibility issue payload with tracked live Linear metadata.
- External dependencies / integrations:
  - Telegram Bot API over HTTPS polling,
  - Linear GraphQL API over HTTPS,
  - no new npm dependencies required.

## Validation Plan
- Tests / checks:
  - Telegram adapter unit tests,
  - live Linear resolver unit tests,
  - control-server compatibility projection tests,
  - targeted manual simulated usage tests,
  - full repo validation gate chain for the owned diff.
- Rollout verification:
  - docs-review before implementation,
  - explicit canary using the prepared Telegram bot and Linear binding when configuration is present.
- Monitoring / alerts:
  - adapter startup/teardown logs,
  - fail-closed provider error handling,
  - manual closeout summary under `out/1014.../manual/`.

## Open Questions
- Multi-run Telegram routing is explicitly deferred and not needed for 1014 correctness.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
