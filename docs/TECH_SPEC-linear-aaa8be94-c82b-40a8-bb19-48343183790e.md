---
id: 20260415-linear-aaa8be94-c82b-40a8-bb19-48343183790e
title: CO: Refactor docs-hygiene spark policy guard into parser-backed fixture harness
related_prd: docs/PRD-linear-aaa8be94-c82b-40a8-bb19-48343183790e.md
related_action_plan: docs/ACTION_PLAN-linear-aaa8be94-c82b-40a8-bb19-48343183790e.md
risk: medium
owners:
  - Codex
last_review: 2026-04-15
---

# TECH_SPEC Mirror - CO: Refactor docs-hygiene spark policy guard into parser-backed fixture harness

This docs-level TECH_SPEC points to the canonical task spec:

- `tasks/specs/linear-aaa8be94-c82b-40a8-bb19-48343183790e.md`

The canonical spec carries the issue-shaping contract, parity/alignment matrix, readiness gate, technical requirements, classifier surface, fixture harness contract, and validation plan for `CO-191`.

## Protected Summary
- Preserve CO-183's finalized `explorer_fast` / `gpt-5.3-codex-spark` file/codebase-search-only behavior.
- Keep `docs:check` wired to the same production docs-hygiene rule as the fixture harness.
- Replace regex-heavy spark-policy clause/window heuristics with a focused parser-backed classifier, not a broad natural-language parser.
- Move accepted and rejected spark-policy wording into structured fixtures with stable ids and failure reasons.
- Do not reopen Codex CLI 0.120 adoption posture, docs:freshness maintenance, or CO-184/CO-188 scope.
