---
id: 20260308-1065-coordinator-symphony-aligned-authenticated-route-controller-extraction
title: Coordinator Symphony-Aligned Authenticated Route Controller Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-authenticated-route-controller-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1065 Coordinator Symphony-Aligned Authenticated Route Controller Extraction

- Task ID: `1065-coordinator-symphony-aligned-authenticated-route-controller-extraction`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`
- Canonical ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-controller-extraction.md`

## Summary

- Extract the remaining post-gate authenticated handoff out of `controlServer.ts`.
- Preserve public-route ordering, authenticated admission, and final protected fallback in `controlServer.ts`.
- Keep authenticated controller behavior and CO's stricter authority model unchanged.

## Review Approval

- 2026-03-08: Approved for implementation after local docs-first review plus delegated read-only seam analysis established that the next smallest correct boundary after `1064` is the authenticated post-gate handoff, not another auth/policy move or a broader router abstraction. Evidence: `docs/findings/1065-authenticated-route-controller-extraction-deliberation.md`.
