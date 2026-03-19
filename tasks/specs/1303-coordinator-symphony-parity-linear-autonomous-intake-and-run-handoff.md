---
id: 20260319-1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff
title: Coordinator Symphony-Parity Provider-Driven Autonomous Intake and Run Handoff
status: active
owner: Codex
created: 2026-03-19
last_review: 2026-03-19
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md
related_tasks:
  - tasks/tasks-1303-coordinator-symphony-parity-linear-autonomous-intake-and-run-handoff.md
review_notes:
  - 2026-03-19: Opened after `1302` proved provider setup and advisory surfacing but the user explicitly clarified that the remaining requirement is autonomous ticket execution from Linear. Evidence: `out/1302-coordinator-linear-and-telegram-provider-setup-and-smoke-testing/manual/20260318T233401Z-provider-smoke/00-summary.md`, `out/1302-coordinator-linear-and-telegram-provider-setup-and-smoke-testing/manual/20260318T233401Z-provider-smoke/01-provider-smoke-results.json`.
  - 2026-03-19: Planning scope widened beyond a bare “start from Linear” trigger because full Symphony parity here also requires provider-side start semantics, persistent intake hosting, deterministic issue-to-run mapping, idempotent claim/replay behavior, and restart-safe rehydration. Evidence: `docs/findings/1303-symphony-parity-linear-autonomous-intake-and-run-handoff-deliberation.md`.
  - 2026-03-19: Implementation landed a dedicated `codex-orchestrator control-host` intake surface, manifest-carried provider issue identity, and a separate `provider-intake-state.json` claim ledger. Live Linear intake remains bounded to `state_type=started`; task ids use a stable provider-id fallback when the live issue projection lacks an explicit CO task-id carrier.
---

# Technical Specification

## Context

The remaining gap after `1302` is provider-driven autonomous work intake, not provider setup.

## Requirements

1. Define the persistent runtime/intake host needed for autonomous provider-driven work pickup.
2. Define provider-side start semantics, accepted-issue policy, issue claim/release semantics, and idempotent replay handling.
3. Define deterministic issue-to-run handoff behavior, including start versus resume.
4. Preserve CO execution authority and avoid scheduler ownership transfer.
5. Keep Telegram and observability surfaces coherent after autonomous intake.
6. Include any additional missing parity requirements discovered during planning, especially restart rehydration and ingress/polling coexistence.

## Landed Contract

- Persistent host: `codex-orchestrator control-host` starts the long-lived intake and read-surface host outside a foreground run and stores restartable host state under `.runs/local-mcp/cli/control-host/`.
- Accepted start signal: only a live Linear issue whose resolved `state_type` is `started` can originate provider-driven intake.
- Deterministic handoff: the host writes provider claim state to `provider-intake-state.json`, scans manifests by `{issue_provider, issue_id}`, and deterministically chooses `resume` for the latest failed/cancelled matching run, `ignore` for an active or completed run, and `start` otherwise.
- Task-id mapping: manifests carry `issue_provider`, `issue_id`, `issue_identifier`, and `issue_updated_at`; new starts currently use `linear-<opaque-provider-id>` when the live Linear issue data does not expose an explicit CO task-id field.
- Restart rehydration: the host reloads `provider-intake-state.json`, relinks matching child manifests by persisted provider issue identity, and marks unresolved claims as pending revalidation instead of silently relaunching arbitrary work.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- downstream implementation expectations captured in docs for autonomous intake, replay safety, and live provider smoke
