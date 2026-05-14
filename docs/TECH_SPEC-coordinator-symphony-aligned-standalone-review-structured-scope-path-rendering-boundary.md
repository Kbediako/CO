# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Structured Scope-Path Rendering Boundary

## Goal

Improve standalone review prompt-side scope rendering so paired and unusual path surfaces remain bounded, path-only, and easier for reviewers to interpret without speculative helper reinspection.

## Scope

- Update prompt-side scope rendering in `scripts/run-review.ts`.
- Reuse or extend `scripts/lib/review-scope-paths.ts` only as needed to preserve structured paired-path information for prompt rendering.
- Keep `review-execution-state.ts` and runtime/meta-surface classifiers unchanged.
- Add focused parser/prompt coverage in `tests/review-scope-paths.spec.ts` and `tests/run-review.spec.ts`.
- Keep docs/task mirrors aligned with the refined rendering contract.

## Out of Scope

- Wrapper replacement or native review controller work.
- Audit evidence/task-context changes.
- Command-intent, low-signal, or meta-surface guard changes.
- Product/controller extraction work in `controlServer.ts`.

## Design

### 1. Keep path-only discipline

Do not reintroduce raw `git status`, `git show`, or branch-history summaries into prompt notes.

### 2. Render paired paths explicitly

For rename/copy surfaces, prompt notes should communicate paired changed-file context more directly than a flat sorted list, while remaining path-oriented and bounded.

### 3. Improve unusual-path robustness

Prompt rendering should make unusual path quoting/escaping less likely to trigger speculative reviewer analysis about parser correctness.

### 4. Preserve shared owner boundaries

Keep runtime/meta-surface ownership in `review-execution-state.ts` unchanged. The slice should stay inside prompt/rendering and nearby parsing helpers only.

### 5. Regression coverage

Focused tests should prove:

- paired rename/copy surfaces render with clearer relationship context,
- prompt-only fallback remains path-only,
- unusual path rendering stays bounded and deterministic,
- runtime/meta-surface behavior remains unchanged.
