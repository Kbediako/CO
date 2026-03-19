# 1112 Closeout Summary

- Status: completed
- Scope: surface the already-resolved active closeout roots directly in the diff-mode review handoff so the reviewer does not need to rediscover that provenance before returning a bounded verdict.

## Delivered

- `scripts/run-review.ts` now resolves the active closeout roots before prompt assembly and emits a short `Active closeout provenance:` note in diff mode when those roots exist.
- The handoff note reuses the same runtime root-resolution path that already feeds the review execution state, including delegated parent-task fallback plus `TODO-closeout` and latest completed closeout selection.
- The added wording frames those roots as already-resolved self-referential review surfaces so the reviewer is pushed away from re-deriving or re-enumerating them unless directly necessary for code-correctness assessment.
- `tests/run-review.spec.ts` now covers:
  - no provenance block in bounded prompt cases without roots,
  - direct-task provenance rendering,
  - delegated parent-task inheritance,
  - combined `TODO-closeout` plus latest completed closeout rendering.
- `docs/standalone-review-guide.md` now documents that the wrapper may surface already-resolved active closeout roots explicitly in the diff-mode handoff.

## Validation

- `node scripts/delegation-guard.mjs` completed with an explicit top-level delegation override because this resumed local lane used bounded `gpt-5.4` top-level subagents rather than a manifest-backed orchestrator delegation stream. Evidence: `01-delegation-guard.log`, `13-override-notes.md`.
- `node scripts/spec-guard.mjs --dry-run` passed. Evidence: `02-spec-guard.log`.
- `npm run build` passed. Evidence: `03-build.log`.
- `npm run lint` passed. Evidence: `04-lint.log`.
- Focused provenance regressions passed `4/4`. Evidence: `05a-targeted-tests.log`.
- Full `npm run test` passed on the final tree: `190/190` files and `1347/1347` tests. Evidence: `05-test.log`.
- `npm run docs:check` passed. Evidence: `06-docs-check.log`.
- `npm run docs:freshness` passed. Evidence: `07-docs-freshness.log`.
- `node scripts/diff-budget.mjs` passed with the explicit stacked-branch override. Evidence: `08-diff-budget.log`, `13-override-notes.md`.
- Manifest-backed `npm run review` converged to a no-findings verdict on the bounded diff. Evidence: `09-review.log`.
- `npm run pack:smoke` passed. Evidence: `10-pack-smoke.log`.
- Manual provenance-hint verification was captured against the final tree. Evidence: `11-manual-active-closeout-root-provenance-hint-check.json`.

## Review Outcome

- The final forced manifest-backed review returned a bounded no-findings verdict for `1112`.
- The log still shows some brief nearby helper reinspection before convergence, but the provenance hint prevented the earlier closeout-root rediscovery loop from becoming another hard review drift.

## Result

- `1112` is complete and closes the closeout-root provenance rediscovery gap left after `1111`.
- The next truthful standalone-review seam is untouched helper classification parity for adjacent review-support helpers, not another closeout-root prompt rewrite.
