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

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host status/proof source-root projection | Stale or missing status/proof provenance can fall back to shared checkout posture, stale projected owner data, dist entrypoints, or global package/link state. | remove fallback | CO-458 | Operators read `co-status`, doctor, `/api/v1/state`, `/ui/data.json`, or provider proof surfaces to decide whether the supervised control-host source is current. | existing control-host status/proof projection behavior | N/A after removal | N/A after removal | Status/proof readers inspect recorded command, package root, source root, local git ref, and freshness without fetching, relinking, rebuilding, restarting, or mutating global package state. | Focused source-root freshness, control-host ownership, doctor, UI data, provider proof refresh, hydration, and docs gates. |

- For `justify retaining fallback`: Not applicable. No temporary fallback is approved by this packet.
- Large-refactor check: keep CO-458 bounded to provenance/freshness surfacing and proof refresh behavior; do not absorb unrelated control-host lifecycle cleanup, package relinking, or historical owner lanes.
