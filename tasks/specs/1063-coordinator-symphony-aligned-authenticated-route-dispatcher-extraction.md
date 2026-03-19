---
id: 20260308-1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction
title: Coordinator Symphony-Aligned Authenticated Route Dispatcher Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1063 Coordinator Symphony-Aligned Authenticated Route Dispatcher Extraction

- Task ID: `1063-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`
- Canonical ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-dispatcher-extraction.md`

## Summary

- Extract the remaining authenticated-route dispatcher shell out of `controlServer.ts`.
- Preserve public-route ordering and the authenticated gate in `controlServer.ts`.
- Keep controller-local behavior and CO's stricter authority model unchanged.

## Review Approval

- 2026-03-08: Approved for implementation after local docs-first review plus delegated read-only seam analysis confirmed the next smallest correct boundary is the post-gate authenticated-route dispatcher, not a broader router or authority refactor. Evidence: `docs/findings/1063-authenticated-route-dispatcher-extraction-deliberation.md`.
