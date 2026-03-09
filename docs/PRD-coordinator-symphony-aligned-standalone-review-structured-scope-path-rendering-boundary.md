# PRD - Coordinator Symphony-Aligned Standalone Review Structured Scope-Path Rendering Boundary

## Summary

`1098` removed branch-history framing and restored rename/copy endpoint identity, but the final live review still spent time inferring pair relationship and unusual-path behavior from a flat sorted path list. This slice keeps prompt-side scope notes path-only while rendering paired and unusual path surfaces more explicitly so prompt-only fallback stays bounded without inviting adjacent helper speculation.

## Problem

- Flat sorted path-only notes preserve changed-file identity, but they do not preserve rename/copy relationship context.
- Final live review still over-inspected scope-path helper behavior instead of concluding on the bounded diff.
- Prompt-only fallback remains more ambiguous than it needs to be for paired paths and unusual path quoting.

## Goals

- Keep standalone review scope notes path-only and bounded.
- Preserve paired-path relationship context for rename/copy surfaces without reintroducing raw git status summaries.
- Make prompt-side scope rendering more explicit for unusual-path surfaces so reviewers spend less time reverse-engineering parser behavior.
- Keep the change narrowly scoped to standalone review prompt/rendering behavior.

## Non-Goals

- Replacing the wrapper with a native review controller in this slice.
- Reopening `review-execution-state.ts` or runtime/meta-surface guards.
- Reopening audit task-context shaping or evidence-surface work.
- Reopening the next Symphony product/controller seam in `controlServer.ts` inside this slice.

## User-Facing Outcome

- `npm run review` still shows a bounded changed surface.
- Rename/copy surfaces read as paired changed-file context instead of a flat unrelated list.
- Prompt-only fallback becomes more informative without sliding back into historical git summary preload.
