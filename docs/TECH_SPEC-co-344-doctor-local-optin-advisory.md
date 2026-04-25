---
id: 20260424-co-344-doctor-local-optin-advisory
title: CO-344 Doctor Local Opt-In Advisory
relates_to: docs/PRD-co-344-doctor-local-optin-advisory.md
risk: medium
owners:
  - Codex
last_review: 2026-04-24
---

## Summary
- Objective: make `codex-orchestrator doctor` report overall advisory status when a local model opt-in marker exists but current `codex debug models` evidence does not verify that model.
- Scope: `orchestrator/src/cli/doctor.ts`, focused doctor test coverage, and task mirrors.
- Constraint: do not change the baseline model defaults or local opt-in rules.

## Requirements
1. Preserve existing guidance text for unverified `local_model_opt_in`.
2. Include that unverified marker in the aggregate `codex_defaults.status` decision.
3. Cover the case where `model` and `review_model` are both `gpt-5.4`, `local_model_opt_in = "gpt-5.5"` is present, and debug-model evidence lacks `gpt-5.5`.

## Acceptance
- Doctor summary contains the existing unverified local opt-in guidance.
- `codex_defaults.status` is `advisory` for stale markers, even when individual model and review-model checks are `ok`.
- Focused doctor tests pass.

## Approvals
- 2026-04-24: Read-only validator confirmed the two-file dirty patch is a real P2 follow-up and not stray local dirt.
