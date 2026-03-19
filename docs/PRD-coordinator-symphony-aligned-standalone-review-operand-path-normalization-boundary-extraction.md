# PRD: Coordinator Symphony-Aligned Standalone Review Operand Path Normalization Boundary Extraction

## Summary

After `1211` extracted the shared shell-command parser substrate, the next truthful standalone-review seam inside `scripts/lib/review-execution-state.ts` is the shared operand/path normalization cluster still reused by multiple meta-surface and audit-anchor analyzers.

## Problem

`review-execution-state` still owns a shared operand/path normalization family that expands candidate operands, resolves audit env-var operand paths, extracts git-revision path candidates, and matches audit startup-anchor paths before meta-surface and anchor policy is applied. That cluster is reused across multiple analyzers but remains inline inside the policy-heavy execution-state module.

## Goal

Extract the shared operand/path normalization seam from `scripts/lib/review-execution-state.ts` without widening into shell traversal, boundary-policy changes, or `run-review` runtime work.

## Non-Goals

- reopening the parser substrate already extracted in `1211`
- forcing a shared shell-traversal abstraction across meta-surface and startup-anchor analyzers
- changing meta-surface, audit-anchor, command-intent, or shell-probe policy semantics
- changing shell-env interpretation or review wrapper runtime behavior

## Success Criteria

- the shared operand/path normalization helpers are owned by a bounded helper seam
- existing meta-surface and audit-anchor analyzers reuse that seam without behavior drift
- focused regressions prove operand expansion and anchor-path normalization still preserve current review behavior
