# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Canonical Scope-Summary Boundary

## Goal

Narrow standalone review prompt scope summaries in `scripts/run-review.ts` so the wrapper preserves canonical changed-file identity without preloading broader branch-history framing.

## Scope

- Update prompt-side scope-summary assembly in `scripts/run-review.ts`.
- Keep task-context handling from `1097` unchanged.
- Keep `review-execution-state.ts` and runtime/meta-surface classifiers unchanged.
- Retarget or add focused `tests/run-review.spec.ts` expectations for the new scope-summary contract.
- Keep docs/task mirrors aligned with the new scope-summary wording.

## Out of Scope

- Wrapper replacement or native review controller work.
- Audit evidence-surface changes.
- Command-intent/meta-surface classification changes.
- Product/controller extraction work in `controlServer.ts`.

## Design

### 1. Scope summaries become canonical and file-oriented

Reduce prompt-side scope summaries to the minimum changed-surface identity needed for review:

- prefer explicit changed-file lists and direct scope facts,
- avoid branch/ahead/behind framing that invites historical interpretation,
- avoid redundant restatement of wide uncommitted-context metadata when changed files are already explicit.

### 2. Preserve bounded review identity

Keep:

- `Review task: ...`
- `Review surface: diff|audit`
- `Evidence manifest: ...` for audit mode
- changed-file identity for the actual review target

Do not remove the changed-surface signal; only tighten how it is framed.

### 3. Preserve runtime ownership

Do not modify:

- `review-execution-state.ts`
- review-surface selection
- audit task-context builder from `1097`
- command-intent or meta-surface guards

This slice changes prompt-side scope-summary wording/assembly only.

### 4. Regression coverage

Focused tests should prove:

- prompts still expose the bounded changed-file identity reviewers need,
- branch-history framing no longer appears in the narrowed scope summary,
- audit-mode prompt tightening composes cleanly with the already-shipped `1097` task-context boundary.
