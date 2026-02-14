---
id: 20260214-0963-codex-cli-alignment-refresh-e2e
title: Codex CLI Alignment + Refresh E2E
relates_to: docs/PRD-codex-cli-alignment-refresh-e2e.md
risk: medium
owners:
  - Codex
last_review: 2026-02-14
---

## Summary
- Objective: Align local Codex with upstream and reduce friction in CLI refresh/setup decisions for CO users.
- Scope: local codex alignment steps, refresh script/docs updates, manual E2E evidence.
- Constraints: minimal diff, no behavior regressions for current managed-cli users.

## Technical Requirements
- Functional requirements:
  - Clarify and implement a reliable local alignment workflow for `${CODEX_DIR}` (for example `export CODEX_DIR=~/Code/codex`; otherwise substitute your local codex fork path directly in commands).
  - Preserve `codex-orchestrator codex setup` managed install path.
  - Update refresh/setup docs to clearly state when custom/managed CLI is optional vs required.
  - Validate end-to-end manually and capture evidence artifacts.
- Non-functional requirements (performance, reliability, security):
  - Non-interactive-safe commands.
  - Deterministic output and actionable error guidance.
- Interfaces / contracts:
  - `scripts/codex-cli-refresh.sh`
  - `README.md` / docs guidance
  - `codex-orchestrator codex setup`

## Architecture & Data
- Architecture / design adjustments:
  - Keep two supported paths:
    - stock CLI (default)
    - managed/custom CLI (opt-in for parity/pinning/advanced needs)
- Data model changes / migrations:
  - None.
- External dependencies / integrations:
  - git remotes in local codex fork.

## Validation Plan
- Tests / checks:
  - Run the full AGENTS guardrail chain.
- Rollout verification:
  - Manual E2E for refresh/alignment and orchestrator behavior.
- Monitoring / alerts:
  - Capture manifests under `.runs/0963-*/cli/<run-id>/manifest.json`.

## Open Questions
- None blocking. Decision: keep existing rebuild behavior compatible and add explicit `--align-only` opt-out for low-friction stock CLI users.

## Approvals
- Reviewer: Codex (self, pre-implementation standalone review)
- Date: 2026-02-14
