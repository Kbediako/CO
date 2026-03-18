---
id: 20260318-1298-coordinator-symphony-aligned-frontend-test-cli-request-shell-extraction
title: Coordinator Symphony-Aligned Frontend-Test CLI Request Shell Extraction
status: active
owner: Codex
created: 2026-03-18
last_review: 2026-03-18
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-coordinator-symphony-aligned-frontend-test-cli-request-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-frontend-test-cli-request-shell-extraction.md
related_tasks:
  - tasks/tasks-1298-coordinator-symphony-aligned-frontend-test-cli-request-shell-extraction.md
review_notes:
  - 2026-03-18: Opened after `1297` confirmed that `handleFrontendTest(...)` still owns a real binary-facing request-shaping seam above `orchestrator/src/cli/frontendTestCliShell.ts`. The next truthful nearby move is a bounded frontend-test request-shell extraction that leaves parse/help in the binary and keeps lower pipeline execution in the existing helper. Evidence: `out/1297-coordinator-symphony-aligned-frontend-test-cli-boundary-reassessment-revisit/manual/20260318T050043Z-closeout/00-summary.md`, `docs/findings/1298-frontend-test-cli-request-shell-extraction-deliberation.md`.
---

# Technical Specification

## Context

The remaining frontend-test wrapper logic is still broader than thin binary glue.

## Requirements

1. Extract the bounded frontend-test request shell.
2. Preserve current frontend-testing pipeline behavior.
3. Add focused parity for the extracted helper.
4. Avoid widening into lower pipeline execution or unrelated CLI families.
