# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Architecture Surface Boundary

## Objective

Create an explicit `architecture` review surface so broader design/context review no longer leaks into bounded diff review, while preserving the existing `diff` and `audit` contracts.

## Steps

1. Add docs-first coverage for the new `architecture` surface and the revised startup-anchor contract.
2. Extend `run-review` surface selection, help text, prompt shaping, and related docs to include `architecture` with the canonical docs-first inputs.
3. Add a narrow `architecture` allowlist for `review-support` and `review-docs` while preserving current `diff` and `audit` behavior.
4. Update `ReviewExecutionState` so `git show <rev>:<path>` is no longer treated as a default diff startup anchor.
5. Add focused regression coverage for `architecture` prompt/runtime behavior while keeping `audit` and structured-scope coverage green.
6. Run the standard validation lane, capture manual/mock evidence, and sync closeout mirrors.

## Guardrails

- Keep `diff` as the default bounded review surface.
- Keep `audit` focused on active evidence/closeout review.
- Do not introduce a third startup-anchor mode in this slice.
- Do not reopen the `1098`/`1099` structured path-rendering work.
- Do not replace the wrapper with a native controller in this slice.
- Keep runtime authority in `ReviewExecutionState` with thin wiring in `run-review.ts`.
