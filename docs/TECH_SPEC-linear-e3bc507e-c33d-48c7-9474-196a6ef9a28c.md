---
id: 20260414-linear-e3bc507e-c33d-48c7-9474-196a6ef9a28c
title: CO workflow: align provider issue-worktree resolution for configured artifact roots
relates_to: docs/PRD-linear-e3bc507e-c33d-48c7-9474-196a6ef9a28c.md
risk: high
last_review: 2026-04-14
---
Contract/design/boundaries: provider issue worktree artifact-root resolution must preserve explicit absolute `CODEX_ORCHESTRATOR_RUNS_DIR` / `CODEX_ORCHESTRATOR_OUT_DIR` values unless a workspace counterpart is proven, must treat repo-relative shared-root values as inherited shared-root provenance instead of silently rebasing to phantom issue-worktree paths, and must apply equivalent manifest/runs-dir selection for `.runs` and `runs` layouts across provider context loading, `resolveEnvironmentPathsForProcess`, and `scripts/run-review.ts`. This lane does not weaken delegation guard, reopen CO-93, redesign review taxonomy or ready-review, or change shared-root `Merging` reconciliation semantics.
