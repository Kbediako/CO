# TECH_SPEC Mirror - CO-458 source-root freshness drift

Canonical spec: `tasks/specs/linear-f57f28e8-e876-4bff-9217-fc5e17ee030f.md`; PRD: `docs/PRD-linear-f57f28e8-e876-4bff-9217-fc5e17ee030f.md`; action plan: `docs/ACTION_PLAN-linear-f57f28e8-e876-4bff-9217-fc5e17ee030f.md`.

## Contract
Control-host status and proof surfaces must expose the actual supervised source root, command path, package root, git ref, and freshness relative to local `origin/main`. The output must distinguish shared checkout drift, supervised source-root drift, source-vs-dist drift, and global binary/package provenance drift without fetching, relinking packages, rebuilding, restarting, or mutating status-read state.

## Not Done If
- `co-status`, doctor, `/api/v1/state`, `/ui/data.json`, or `provider-linear-worker-proof.json` omit actual source-root provenance.
- Freshness is inferred from the operator checkout, global binary path, or stale projection instead of inspected from the recorded launch/proof source.
- Shared checkout drift, supervised source-root drift, source-vs-dist drift, and package provenance drift collapse into one generic warning.
- CO-113, CO-25, CO-388, or CO-450 are reopened or absorbed instead of linked as historical context.

## Validation
Parent owns focused regressions for linked package, dist fallback, source checkout, no `origin/main`, package/command mismatch, proof refresh, and status/proof projection surfaces. Required gates include `npm run docs:check`, `npm run docs:freshness`, implementation validation, standalone review, elegance review, PR feedback cleanup, and ready-review drain.
