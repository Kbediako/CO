---
id: 20260308-1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction
title: Coordinator Symphony-Aligned Expiry Cycle and Timer Ownership Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1069 Coordinator Symphony-Aligned Expiry Cycle and Timer Ownership Extraction

- Task ID: `1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`
- Canonical ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`

## Summary

- Extract the remaining raw timer plus question/confirmation expiry background sweep logic out of `controlServer.ts`.
- Move that behavior behind a dedicated lifecycle seam instead of keeping a naked overlapping interval in the server entrypoint.
- Preserve question child-resolution reuse, event emission, persistence sequencing, and runtime publish behavior.

## Review Approval

- 2026-03-08: Approved for implementation after local seam review incorporated the bounded Symphony scout and established that the next smallest Symphony-aligned extraction is a dedicated expiry lifecycle owner, not a wider runtime abstraction. Evidence: `docs/findings/1069-expiry-cycle-and-timer-ownership-extraction-deliberation.md`, `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/20260308T135437Z-docs-first/04-scout.md`.
