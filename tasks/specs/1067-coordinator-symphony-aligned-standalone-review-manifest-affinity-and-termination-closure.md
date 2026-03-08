---
id: 20260308-1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure
title: Coordinator Symphony-Aligned Standalone Review Manifest Affinity and Termination Closure
relates_to: docs/PRD-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md
risk: high
owners:
  - Codex
last_review: 2026-03-08
---

# Spec Mirror - 1067 Coordinator Symphony-Aligned Standalone Review Manifest Affinity and Termination Closure

- Task ID: `1067-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure`
- Canonical PRD: `docs/PRD-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`
- Canonical TECH_SPEC: `docs/TECH_SPEC-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`
- Canonical ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-manifest-affinity-and-termination-closure.md`

## Summary

- Prefer active run lineage over raw newest-mtime manifest fallback when standalone review is launched without an explicit manifest.
- Keep review artifacts and evidence attached to that same resolved run lineage.
- Make bounded termination wait for child closure before surfacing failure.

## Review Approval

- 2026-03-08: Approved for implementation after local post-`1066` review plus delegated read-only scouting established that the next smallest reliability seam is manifest affinity plus bounded termination closure inside the standalone review wrapper, not another policy expansion or controller extraction. Evidence: `docs/findings/1067-standalone-review-manifest-affinity-and-termination-closure-deliberation.md`.
