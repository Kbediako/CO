---
id: 20260308-1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction
title: Coordinator Symphony-Aligned Authenticated Control Route Gate Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1062 Coordinator Symphony-Aligned Authenticated Control Route Gate Extraction

- Task ID: `1062-coordinator-symphony-aligned-authenticated-control-route-gate-extraction`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`
- Canonical ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-control-route-gate-extraction.md`

## Summary

- Extract the shared authenticated control-route gate out of `controlServer.ts`.
- Preserve public-route ordering and controller wiring in `controlServer.ts`.
- Keep CO's auth, CSRF, and runner-only authority model unchanged.
