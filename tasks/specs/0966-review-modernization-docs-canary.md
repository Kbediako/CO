---
id: 20260216-0966-review-modernization-docs-canary
title: Review Modernization + Docs Discoverability + RLM Canary
doc_type: tech_spec
relates_to: docs/PRD-review-modernization-docs-canary.md
risk: low
owners:
  - Codex
last_review: 2026-02-16
---

## Summary
- Objective: modernize `npm run review` to use newer `codex review` capabilities (scope flags + artifact persistence), improve guide discoverability, and ensure a fast RLM recursion canary exists.
- Scope: `scripts/run-review.ts`, review docs, CLI help + README pointers, and a small test canary.
- Constraints: keep changes minimal and backwards-compatible; avoid CI-only behavior changes; ship via npm.

## Review Notes
- Notes: this task should avoid re-architecting review flows; focus on wiring + artifacts + correctness.

