# ACTION_PLAN - Experience Prompt Injection + Delegation Skill Harmonization (0959)

## Summary
- Goal: Convert existing experience persistence into prompt-time value and simplify delegation skill guidance for shipped users.
- Scope: Cloud prompt injection, tests, bundled skills/docs alignment.
- Assumptions: Prompt packs already define domains/slots and can provide experience snippets.

## Milestones and Sequencing
1) Docs-first scaffold + task mirrors.
2) Cloud prompt injection wiring + tests.
3) Delegation skill harmonization (`delegation-usage` canonical, `delegate-early` compatibility alias).
4) Validation, PR, checks, reviewer feedback handling, merge.

## Dependencies
- Existing prompt-pack/experience infrastructure.
- Bundled skills packaging path in npm release.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
- Rollback plan:
  - Revert prompt block injection and skill doc updates if regressions appear.

## Risks and Mitigations
- Risk: Prompt bloat or noisy context.
  - Mitigation: cap snippet count and use concise formatting.
- Risk: Confusion from dual skills persists.
  - Mitigation: explicit deprecation/alias language in `delegate-early` and README skill list.

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-14
