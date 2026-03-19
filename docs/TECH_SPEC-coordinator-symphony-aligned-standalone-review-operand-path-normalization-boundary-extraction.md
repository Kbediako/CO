# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Operand Path Normalization Boundary Extraction

## Problem Statement

After the `1211` parser extraction, the next shared substrate inside `scripts/lib/review-execution-state.ts` is the operand/path normalization cluster reused by meta-surface and audit-anchor analysis, but that logic remains inline inside a policy-heavy module.

## Scope

- extract the shared operand/path normalization seam from `scripts/lib/review-execution-state.ts`
- preserve current operand expansion, audit env-var path resolution, git-revision path extraction, and audit startup-anchor path matching behavior
- keep policy ownership local to `review-execution-state` while multiple analyzers consume the extracted normalization helper
- add only the focused regressions needed to pin preserved normalization behavior

## Out of Scope

- shell-command parser work already closed in `1211`
- shared shell-traversal extraction across analyzers
- meta-surface, startup-anchor, command-intent, or shell-probe policy changes
- `scripts/run-review.ts` runtime or prompt/telemetry changes

## Current Hypothesis

With the parser substrate extracted in `1211`, the next truthful local seam is the operand/path normalization cluster around `expandMetaSurfaceOperandCandidates`, `resolveAuditMetaSurfaceEnvOperandPath`, `extractGitRevisionPathCandidate`, `segmentMatchesAuditStartupAnchorPath`, `classifyMetaSurfaceDirectDetailed`, and `classifyMetaSurfaceOperand`. That cluster is shared enough to merit a helper boundary, while the broader shell-traversal family remains too policy-coupled for a clean extraction.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts tests/run-review.spec.ts`
- `npm run review`
- `npm run pack:smoke`
