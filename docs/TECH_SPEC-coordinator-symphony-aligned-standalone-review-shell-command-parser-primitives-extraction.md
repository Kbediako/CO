# TECH_SPEC: Coordinator Symphony-Aligned Standalone Review Shell Command Parser Primitives Extraction

## Problem Statement

The standalone-review execution-state module still contains a shared shell-command parser cluster that is reused across multiple review-boundary analyzers, but that parsing logic remains inline inside `scripts/lib/review-execution-state.ts`.

## Scope

- extract the shared shell-command parser primitives from `scripts/lib/review-execution-state.ts`
- preserve current shell-control segmentation, token normalization, env-assignment stripping, `env` unwrap handling, shell truthiness inference, and shell-command payload extraction
- keep policy ownership local to `review-execution-state` while multiple analyzers consume the extracted parser helper
- add only the focused regressions needed to pin preserved parser behavior

## Out of Scope

- command-intent, shell-probe, meta-surface, startup-anchor, or heavy-command policy changes
- shell-env interpreter changes in `scripts/lib/review-shell-env-interpreter.ts`
- `scripts/run-review.ts` supervision, prompt, telemetry, or review-loop changes
- output-summary or review-taxonomy extraction beyond the parser seam itself

## Current Hypothesis

The truthful next lane after `1210` is the shared shell-command parser family inside `scripts/lib/review-execution-state.ts`. The `1210` closeout explicitly required a docs-first reassessment of deeper helper families before another extraction claim; that reassessment found the parser substrate to be a sharper shared boundary than the earlier operand/path-normalization or shell-traversal candidates. The same parser primitives already feed heavy-command detection, shell-probe detection, command-intent parsing, meta-surface parsing, startup-anchor parsing, and inspection-target extraction, so giving them a first-class helper boundary should reduce local coupling without changing review-policy ownership.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run build`
- `npx vitest run --config vitest.config.core.ts tests/review-execution-state.spec.ts tests/run-review.spec.ts`
- `npm run review`
- `npm run pack:smoke`
