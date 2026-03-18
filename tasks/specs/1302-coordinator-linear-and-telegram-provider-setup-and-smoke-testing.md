---
id: 20260319-1302-coordinator-linear-and-telegram-provider-setup-and-smoke-testing
title: Coordinator Linear and Telegram Provider Setup and Smoke Testing
status: done
owner: Codex
created: 2026-03-19
last_review: 2026-03-19
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-linear-and-telegram-provider-setup-and-smoke-testing.md
related_action_plan: docs/ACTION_PLAN-coordinator-linear-and-telegram-provider-setup-and-smoke-testing.md
related_tasks:
  - tasks/tasks-1302-coordinator-linear-and-telegram-provider-setup-and-smoke-testing.md
review_notes:
  - 2026-03-19: Opened after the remaining Symphony-alignment wrapper pocket froze cleanly in `1301`. The next truthful lane is provider setup and bounded smoke testing for Linear and Telegram rather than another local shell extraction. Evidence: `out/1301-coordinator-symphony-aligned-frontend-test-cli-remaining-boundary-freeze-reassessment-revisit/manual/20260319T004000Z-closeout/00-summary.md`, `docs/findings/1302-linear-and-telegram-provider-setup-and-smoke-testing-deliberation.md`.
  - 2026-03-19: Closed after live Telegram and Linear provider smoke passed on the current tree. Telegram read-only smoke delivered a synthetic `/help` message to the allowlisted chat and confirmed bridge startup, while Linear advisory smoke reached `dispatch_pilot.status=ready`, selected tracked issue `CO-1`, and required correcting Atlas's prefixed project id to the raw UUID expected by the provider binding. Evidence: `out/1302-coordinator-linear-and-telegram-provider-setup-and-smoke-testing/manual/20260318T233401Z-provider-smoke/00-summary.md`, `out/1302-coordinator-linear-and-telegram-provider-setup-and-smoke-testing/manual/20260318T233401Z-provider-smoke/01-provider-smoke-results.json`.
---

# Technical Specification

## Context

The next operator-facing milestone is live Linear and Telegram setup/testing.

## Requirements

1. Verify provider prerequisites and live-tree wiring before mutation.
2. Keep the lane bounded to setup, auth/config validation, and smoke testing.
3. Record explicit evidence for stop/go outcomes.
4. Only widen into fixes when provider smoke evidence shows a concrete defect.

## Validation Plan

- provider setup preflight
- targeted Linear and Telegram smoke checks
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
