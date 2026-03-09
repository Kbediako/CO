# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Audit Task-Context Boundary

## Goal

Narrow audit-mode standalone review task context in `scripts/run-review.ts` so the prompt keeps task identity and canonical path targets without embedding checklist or PRD body content.

## Scope

- Update the audit-only task-context builder in `scripts/run-review.ts`.
- Keep review-surface selection, meta-surface allowlists, and `review-execution-state.ts` behavior unchanged.
- Update focused prompt-shape tests in `tests/run-review.spec.ts`.
- Keep operator docs/task registration aligned with the new audit prompt contract.

## Out of Scope

- Native review controller replacement.
- Diff-mode prompt changes.
- New audit evidence surfaces.
- Any `controlServer.ts` product-code extraction.

## Design

### 1. Audit task context becomes path-oriented

Replace the current audit task-context assembly that embeds checklist header bullets and PRD summary bullets with a smaller path-oriented payload:

- `Task context:`
- `- Task checklist: \`...\``
- `- Primary PRD: \`...\`` when present

Do not inline PRD `## Summary` bullets.
Do not mirror arbitrary checklist header bullets into the audit prompt.

### 2. Preserve task inference and audit identity

Keep the existing task-id inference behavior:

- explicit `--task`
- env task id
- task inferred from the resolved manifest path

The prompt should still clearly indicate:

- `Review task: ...`
- `Evidence manifest: ...`
- canonical checklist/PRD paths when available

### 3. Preserve fail-closed review boundaries

Do not modify:

- `review-execution-state.ts`
- allowed audit meta surfaces (`run-manifest`, `run-runner-log`)
- bounded review guidance

This slice changes prompt shaping only, not the runtime classifier.

### 4. Regression coverage

Update tests so audit-mode prompt expectations prove:

- audit prompts still include task checklist and PRD path references when available
- audit prompts no longer inline `PRD summary (...)` sections
- run-dir-derived task inference still produces the bounded audit task context

Preserve the current audit meta-surface regression tests unchanged except where prompt text assertions need retargeting.
