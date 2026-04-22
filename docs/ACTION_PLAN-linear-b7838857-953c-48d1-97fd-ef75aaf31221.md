# ACTION_PLAN - CO-307 child-lane trusted-project pollution

## Milestones
1. Keep the CO-307 docs packet and task registration current.
2. Reproduce the current trusted-project residue path with bounded evidence.
3. Land a narrow child-lane cleanup or inheritance fix that preserves trust boundaries.
4. Add focused regressions for exact-lane cleanup, unrelated-section preservation, nested project subtables, multiline-string safety, and failed-proof persistence.
5. Run validation, standalone review, elegance review, and `pr ready-review` before handoff.

## Validation
- Focused during implementation: `npm run build`, targeted `eslint`, targeted `vitest`, `node scripts/diff-budget.mjs`
- Full before handoff: delegation/spec guards, build, lint, test, docs checks, repo stewardship, diff budget, review, `npm run pack:smoke`

## Constraints
- Do not weaken trust boundaries.
- Do not broaden into generic global config work.
- Keep parent ownership of child-lane lifecycle, acceptance, and PR flow.
