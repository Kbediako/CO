---
id: 20260426-linear-f76b2a52-f0a5-4145-8d21-3e4f23a98d25
title: "CO-380 authoritative review gate"
relates_to: docs/PRD-linear-f76b2a52-f0a5-4145-8d21-3e4f23a98d25.md
related_prd: docs/PRD-linear-f76b2a52-f0a5-4145-8d21-3e4f23a98d25.md
related_action_plan: docs/ACTION_PLAN-linear-f76b2a52-f0a5-4145-8d21-3e4f23a98d25.md
risk: high
owners:
  - Codex
last_review: 2026-04-26
---

# TECH_SPEC - CO-380 authoritative review gate

This mirror points to the canonical task spec at `tasks/specs/linear-f76b2a52-f0a5-4145-8d21-3e4f23a98d25.md`.

## Implementation Summary
- Add one authoritative review gate for implementation handoff review.
- Gate lanes require authored `NOTES` unless an explicit break-glass waiver is supplied.
- Gate lanes cannot treat non-interactive handoff-only output as success.
- Review telemetry remains the terminal verdict artifact: `clean-success` and `bounded-success` pass; `failed-boundary` and `failed-other` fail.

## Review Path Inventory
- `codex-orchestrator review` and `npm run review` enter through `scripts/run-review.ts`.
- Scoped review context is built in `scripts/lib/review-prompt-context.ts`.
- Non-interactive handoff output is owned by `scripts/lib/review-non-interactive-handoff.ts`.
- Review execution telemetry is owned by `scripts/lib/review-execution-telemetry.ts` and related runtime/state helpers.
- Pipeline usage is configured in `codex.orchestrator.json` for `docs-review`, `implementation-gate`, `provider-linear-worker`, and `docs-relevance-advisory`.

## Validation Contract
- Focused review wrapper tests must prove generated notes are exceptional under the authoritative gate.
- Break-glass waiver tests must prove owner, expiry, reason, and evidence are review-visible.
- Provider-worker handoff must use forced manifest-backed review, not printed prompts.
