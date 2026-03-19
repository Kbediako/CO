---
id: 20260312-1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract
title: Coordinator Symphony-Aligned Standalone Review Verdict-Stability Disable Contract
status: completed
owners:
  - Codex
created: 2026-03-12
last_review: 2026-03-12
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract.md
related_tasks:
  - tasks/tasks-1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Verdict-Stability Disable Contract

## Summary

Harden the documented verdict-stability disable contract with explicit wrapper env isolation and disabled-path coverage.

## Scope

- Clear `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS` from the shared wrapper test env helper.
- Add an explicit disabled-path wrapper regression for `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS=0`.
- Keep the disabled-path fallback deterministic by leaning on the existing timeout/stall transport.

## Out of Scope

- Verdict-stability heuristic tuning or threshold redesign.
- Timeout/stall/startup-loop taxonomy changes.
- Generic `timedOut` transport semantics redesign.
- Coordinator / Telegram / Linear refactors.

## Notes

- 2026-03-12: Registered after `1135` closed timeout/stall classification. The next smallest truthful seam is the verdict-stability disable contract because the docs already promise it, but wrapper isolation and disabled-path coverage still lag. Evidence: `docs/findings/1136-standalone-review-verdict-stability-disable-contract-deliberation.md`.
- 2026-03-12: Pre-implementation local read-only review approved. The lane stays bounded to the documented disable switch and test isolation; it must not broaden into timeout/stall or generic `timedOut` redesign. Evidence: `docs/findings/1136-standalone-review-verdict-stability-disable-contract-deliberation.md`.
- 2026-03-12: Docs-first registration completed. Deterministic docs guards passed; the docs-review pipeline failed at its own delegation guard before surfacing a concrete docs defect, so the package carries an explicit override rather than a clean docs-review pass. Evidence: `.runs/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/cli/2026-03-12T11-40-26-677Z-dd001104/manifest.json`, `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T113712Z-docs-first/00-summary.md`.
- 2026-03-12: Closed after the shared wrapper env scrubber started clearing `CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS`, focused verdict-stability regressions proved the `=0` disabled path falls back to `review-timeout`, and build/lint/docs/pack-smoke passed. The full suite quiet-tail and forced bounded review drift were recorded as explicit overrides rather than false greens. Evidence: `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/00-summary.md`, `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/05-targeted-tests.log`, `out/1136-coordinator-symphony-aligned-standalone-review-verdict-stability-disable-contract/manual/20260312T114740Z-closeout/13-override-notes.md`.
